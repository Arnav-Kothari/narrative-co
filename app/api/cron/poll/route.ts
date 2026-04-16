import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_RUBRIC } from "../../_lib/rubric";
import {
  readCache,
  writeCache,
  pruneCache,
  mergePosts,
  hasStorage,
  type CacheState,
  type StoredScore,
} from "../../_lib/storage";
import { fetchListPosts } from "../../_lib/xfetch";
import type { XPost } from "../../x-posts/route";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const SCORE_CONCURRENCY = 15;

async function scoreBatch(posts: XPost[], client: Anthropic): Promise<StoredScore[]> {
  async function scoreOne(p: XPost): Promise<StoredScore> {
    try {
      const msg = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: DEFAULT_RUBRIC,
        messages: [
          {
            role: "user",
            content: `Author: ${p.author.name} (@${p.author.username})
Likes: ${p.metrics.like_count} | Replies: ${p.metrics.reply_count} | Reposts: ${p.metrics.retweet_count}
Post:
"""
${p.text}
"""

Return ONLY the JSON object.`,
          },
        ],
      });
      const raw = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no JSON");
      const parsed = JSON.parse(m[0]) as { score: number; rationale: string; flags?: string[] };
      return {
        id: p.id,
        score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
        rationale: (parsed.rationale ?? "").replace(/[—–]/g, "-"),
        flags: parsed.flags ?? [],
      };
    } catch (e) {
      return {
        id: p.id,
        score: 0,
        rationale: `score failed: ${e instanceof Error ? e.message : "unknown"}`,
        flags: ["error"],
      };
    }
  }

  const results: StoredScore[] = [];
  for (let i = 0; i < posts.length; i += SCORE_CONCURRENCY) {
    const chunk = posts.slice(i, i + SCORE_CONCURRENCY);
    const r = await Promise.all(chunk.map(scoreOne));
    results.push(...r);
  }
  return results;
}

async function runPoll() {
  if (!hasStorage()) {
    throw new Error("No storage configured (set UPSTASH_REDIS_REST_URL and _TOKEN)");
  }
  const listId = process.env.X_LIST_ID;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!listId) throw new Error("Missing X_LIST_ID");
  if (!anthropicKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const existing = (await readCache()) ?? {
    posts: [],
    scores: {},
    last_update: new Date(0).toISOString(),
  };

  // Find newest id we have to use as since_id; if nothing, do a full 48h backfill.
  const newestId =
    existing.posts.length > 0
      ? existing.posts.reduce(
          (max, p) => (BigInt(p.id) > BigInt(max) ? p.id : max),
          existing.posts[0].id
        )
      : undefined;

  const fresh = await fetchListPosts({ listId, sinceId: newestId });
  const toScore = fresh.filter((p) => !existing.scores[p.id]);

  const client = new Anthropic({ apiKey: anthropicKey });
  const newScores = toScore.length > 0 ? await scoreBatch(toScore, client) : [];

  const mergedScores: Record<string, StoredScore> = { ...existing.scores };
  for (const s of newScores) mergedScores[s.id] = s;

  const mergedState: CacheState = {
    posts: mergePosts(existing.posts, fresh),
    scores: mergedScores,
    last_update: new Date().toISOString(),
  };
  const pruned = pruneCache(mergedState);
  await writeCache(pruned);

  return {
    fetched: fresh.length,
    scored: newScores.length,
    total_posts: pruned.posts.length,
    last_update: pruned.last_update,
  };
}

function isAuthorized(req: Request): boolean {
  // Vercel cron sends this header automatically when configured in vercel.json
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  // Vercel cron also sends x-vercel-cron header on cron-triggered invocations
  if (req.headers.get("x-vercel-cron")) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runPoll();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
