import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_TONE } from "@/agents/engagement/tone";
import { withKnowledge } from "@/agents/engagement/knowledge";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
  }

  const { post, tone } = (await req.json()) as {
    post: {
      id: string;
      text: string;
      author: { username: string; name: string };
    };
    tone?: string;
  };
  const voice = withKnowledge(tone || DEFAULT_TONE);

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 800,
      system: voice,
      messages: [
        {
          role: "user",
          content: `Original post by ${post.author.name} (@${post.author.username}):
"""
${post.text}
"""

Draft 3 distinct reply angles from @salesforce. Return ONLY the JSON array.`,
        },
      ],
    });

    const raw = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON array in response");
    const angles = (JSON.parse(jsonMatch[0]) as { angle: string; reply: string }[]).map((a) => ({
      angle: a.angle.replace(/[—–]/g, "-"),
      reply: a.reply.replace(/[—–]/g, "-"),
    }));
    return NextResponse.json({ angles });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
