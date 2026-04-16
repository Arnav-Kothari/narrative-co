import { TwitterApi } from "twitter-api-v2";
import type { XPost } from "../x-posts/route";

const X_API_BASE = "https://api.twitter.com/2";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

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

function userClient(): TwitterApi | null {
  const { X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET } = process.env;
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

async function bearerFetch(path: string, token: string): Promise<XData> {
  const res = await fetch(`${X_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`X API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

export type FetchListOptions = {
  listId: string;
  sinceId?: string; // paginate until we reach this ID
  hoursBack?: number; // paginate until we cross this cutoff (for initial backfill)
};

export async function fetchListPosts(opts: FetchListOptions): Promise<XPost[]> {
  const { listId, sinceId, hoursBack = 48 } = opts;
  const oauth = userClient();
  const token = process.env.X_BEARER_TOKEN;
  if (!oauth && !token) throw new Error("No X auth available");

  const cutoffMs = Date.now() - hoursBack * 3600 * 1000;
  const sinceBI = sinceId ? BigInt(sinceId) : BigInt(0);
  const allTweets: XTweet[] = [];
  const allUsers: XUser[] = [];
  let paginationToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string | number> = {
      max_results: PAGE_SIZE,
      "tweet.fields": "created_at,public_metrics,author_id,lang",
      expansions: "author_id",
      "user.fields": "username,name,profile_image_url",
    };
    if (paginationToken) params.pagination_token = paginationToken;

    let data: XData;
    if (oauth) {
      data = (await oauth.v2.get(`lists/${listId}/tweets`, params)) as unknown as XData;
    } else {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
      );
      data = await bearerFetch(`/lists/${listId}/tweets?${qs.toString()}`, token!);
    }

    const tweets = data.data ?? [];
    const users = data.includes?.users ?? [];
    allUsers.push(...users);

    let stop = false;
    for (const t of tweets) {
      if (sinceId) {
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

    paginationToken = data.meta?.next_token;
    if (stop || !paginationToken) break;
  }

  const userMap: Record<string, XPost["author"]> = {};
  for (const u of allUsers) {
    userMap[u.id] = {
      id: u.id,
      username: u.username,
      name: u.name,
      profile_image_url: u.profile_image_url,
    };
  }

  return allTweets
    .filter((t) => !t.lang || t.lang === "en")
    .filter((t) => !t.text.startsWith("RT @"))
    .map((t) => {
      const author = userMap[t.author_id] ?? {
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
}
