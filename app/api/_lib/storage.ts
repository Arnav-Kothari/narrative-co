import { Redis } from "@upstash/redis";
import type { XPost } from "../x-posts/route";

export type StoredScore = {
  id: string;
  score: number;
  rationale: string;
  flags: string[];
};

export type CacheState = {
  posts: XPost[];
  scores: Record<string, StoredScore>;
  last_update: string;
};

const KEY = "sf:cache:v1";
const WINDOW_HOURS = 48;

function client(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function hasStorage(): boolean {
  return client() !== null;
}

export async function readCache(): Promise<CacheState | null> {
  const r = client();
  if (!r) return null;
  try {
    const raw = await r.get<CacheState | string>(KEY);
    if (!raw) return null;
    return typeof raw === "string" ? (JSON.parse(raw) as CacheState) : raw;
  } catch {
    return null;
  }
}

export async function writeCache(state: CacheState): Promise<void> {
  const r = client();
  if (!r) return;
  await r.set(KEY, JSON.stringify(state));
}

export function pruneCache(state: CacheState): CacheState {
  const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const keepPosts = state.posts.filter((p) => new Date(p.created_at).getTime() >= cutoff);
  const keepIds = new Set(keepPosts.map((p) => p.id));
  const keepScores: Record<string, StoredScore> = {};
  for (const id of keepIds) {
    if (state.scores[id]) keepScores[id] = state.scores[id];
  }
  return {
    posts: keepPosts,
    scores: keepScores,
    last_update: state.last_update,
  };
}

export function mergePosts(existing: XPost[], incoming: XPost[]): XPost[] {
  const seen = new Set(existing.map((p) => p.id));
  const newOnes = incoming.filter((p) => !seen.has(p.id));
  return [...newOnes, ...existing];
}
