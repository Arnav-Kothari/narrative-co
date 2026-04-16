import { NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { SEED_POSTS } from "../_lib/seedPosts";
import { hasStorage, readCache, pruneCache, writeCache } from "../_lib/storage";

export const runtime = "nodejs";

const X_API_BASE = "https://api.twitter.com/2";

function userClient() {
  const {
    X_API_KEY,
    X_API_KEY_SECRET,
    X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET,
  } = process.env;
  if (!X_API_KEY || !X_API_KEY_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return null;
  }
  return new TwitterApi({
    appKey: X_API_KEY,
    appSecret: X_API_KEY_SECRET,
    accessToken: X_ACCESS_TOKEN,
    accessSecret: X_ACCESS_TOKEN_SECRET,
  });
}

export type XPost = {
  id: string;
  text: string;
  created_at: string;
  author: {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  };
  metrics: {
    like_count: number;
    reply_count: number;
    retweet_count: number;
    quote_count: number;
    impression_count?: number;
  };
  url: string;
};

async function xFetch(path: string, token: string) {
  const res = await fetch(`${X_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${res.status}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

const HOURS_WINDOW = 48;
const PAGE_SIZE = 100; // X API max per page for list tweets
const MAX_PAGES = 10; // cap total pagination at 1000 tweets

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "live";
  const sinceId = url.searchParams.get("since_id");

  if (mode === "demo") {
    return NextResponse.json({ posts: SEED_POSTS, source: "seed" });
  }

  // If KV storage is configured, read directly from it - cron keeps it fresh.
  if (hasStorage()) {
    const cache = await readCache();
    if (cache) {
      const pruned = pruneCache(cache);
      // If pruning removed posts, persist the trimmed state back.
      if (pruned.posts.length !== cache.posts.length) {
        await writeCache(pruned);
      }
      return NextResponse.json({
        posts: pruned.posts,
        scores: pruned.scores,
        source: "cache",
        last_update: pruned.last_update,
      });
    }
    // No cache yet - return empty. The cron will populate on next tick.
    return NextResponse.json({
      posts: [],
      scores: {},
      source: "cache-empty",
      warning: "Background poller hasn't populated the cache yet - wait a few minutes.",
    });
  }

  const token = process.env.X_BEARER_TOKEN;
  const listId = process.env.X_LIST_ID;

  if (!listId) {
    return NextResponse.json(
      { error: "Missing X_LIST_ID in .env.local" },
      { status: 500 }
    );
  }

  try {
    type XUser = { id: string; username: string; name: string; profile_image_url?: string };
    type XTweet = {
      id: string;
      text: string;
      created_at: string;
      author_id: string;
      lang?: string;
      public_metrics: {
        like_count: number;
        reply_count: number;
        retweet_count: number;
        quote_count: number;
        impression_count?: number;
      };
    };
    type XData = {
      data?: XTweet[];
      includes?: { users?: XUser[] };
      meta?: { next_token?: string; result_count?: number };
    };

    const oauth = userClient();
    if (!oauth && !token) {
      return NextResponse.json(
        { error: "Missing X auth credentials in .env.local" },
        { status: 500 }
      );
    }

    // When polling for real-time updates, paginate until we reach the
    // since_id. When doing initial load, paginate until we reach HOURS_WINDOW old.
    const isPolling = !!sinceId;
    const cutoffMs = Date.now() - HOURS_WINDOW * 3600 * 1000;
    const sinceBI = sinceId ? BigInt(sinceId) : BigInt(0);

    const allTweets: XTweet[] = [];
    const allUsers: XUser[] = [];
    let paginationToken: string | undefined = undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const queryParams: Record<string, string | number> = {
        max_results: PAGE_SIZE,
        "tweet.fields": "created_at,public_metrics,author_id,lang",
        expansions: "author_id",
        "user.fields": "username,name,profile_image_url",
      };
      if (paginationToken) queryParams.pagination_token = paginationToken;

      let pageData: XData;
      if (oauth) {
        pageData = (await oauth.v2.get(
          `lists/${listId}/tweets`,
          queryParams
        )) as unknown as XData;
      } else {
        const qs = new URLSearchParams(
          Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)]))
        );
        pageData = (await xFetch(
          `/lists/${listId}/tweets?${qs.toString()}`,
          token!
        )) as XData;
      }

      const tweets = pageData.data ?? [];
      const users = pageData.includes?.users ?? [];
      allUsers.push(...users);

      // Accumulate while tweets meet the criteria, stop when we cross a boundary.
      let stop = false;
      for (const t of tweets) {
        if (isPolling) {
          if (BigInt(t.id) <= sinceBI) {
            stop = true;
            break;
          }
        } else if (new Date(t.created_at).getTime() < cutoffMs) {
          stop = true;
          break;
        }
        allTweets.push(t);
      }

      paginationToken = pageData.meta?.next_token;
      if (stop || !paginationToken) break;
    }

    const users: Record<string, XPost["author"]> = {};
    for (const u of allUsers) {
      users[u.id] = {
        id: u.id,
        username: u.username,
        name: u.name,
        profile_image_url: u.profile_image_url,
      };
    }
    const posts: XPost[] = allTweets
      .filter((t) => !t.lang || t.lang === "en")
      .filter((t) => !t.text.startsWith("RT @"))
      .map((t) => {
        const author = users[t.author_id] ?? {
          id: t.author_id,
          username: "unknown",
          name: "Unknown",
        };
        return {
          id: t.id,
          text: t.text,
          created_at: t.created_at,
          author,
          metrics: t.public_metrics,
          url: `https://x.com/${author.username}/status/${t.id}`,
        };
      });

    if (posts.length === 0 && !isPolling) {
      return NextResponse.json({
        posts: [],
        source: "live",
        warning: "X returned 0 posts for this list in the last 48 hours.",
      });
    }
    return NextResponse.json({ posts, source: "live" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg, posts: SEED_POSTS, source: "seed-fallback" });
  }
}
