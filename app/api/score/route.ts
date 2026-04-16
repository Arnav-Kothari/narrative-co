import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_RUBRIC } from "../_lib/rubric";

export const runtime = "nodejs";
export const maxDuration = 60;

type Post = {
  id: string;
  text: string;
  author: { username: string; name: string };
  metrics: { like_count: number; reply_count: number; retweet_count: number };
};

type ScoreResult = {
  id: string;
  score: number;
  rationale: string;
  flags: string[];
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const body = (await req.json()) as { posts: Post[]; rubric?: string };
  const posts = body.posts ?? [];
  const rubric = body.rubric ?? DEFAULT_RUBRIC;

  const client = new Anthropic({ apiKey });

  const results = await Promise.all(
    posts.map(async (p): Promise<ScoreResult> => {
      try {
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: rubric,
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
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no JSON in response");
        const parsed = JSON.parse(jsonMatch[0]) as {
          score: number;
          rationale: string;
          flags?: string[];
        };
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
          rationale: `scoring failed: ${e instanceof Error ? e.message : "unknown"}`,
          flags: ["error"],
        };
      }
    })
  );

  return NextResponse.json({ scores: results });
}
