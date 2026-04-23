import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendBody = {
  post: {
    url: string;
    text: string;
    author: { name: string; username: string };
    metrics: { like_count: number; reply_count: number; retweet_count: number };
  };
  score: number;
  rationale: string;
  angles: { angle: string; reply: string }[];
};

function formatSlack(b: SendBody): string {
  const lines = [
    `*New high-value engagement* - score ${b.score}/100`,
    `${b.post.author.name} (@${b.post.author.username}) - ${b.post.url}`,
    `> ${b.post.text.replace(/\n/g, "\n> ")}`,
    ``,
    `_Why:_ ${b.rationale}`,
    `_Metrics:_ ${b.post.metrics.like_count} likes, ${b.post.metrics.reply_count} replies, ${b.post.metrics.retweet_count} reposts`,
    ``,
    `*Suggested angles:*`,
    ...b.angles.map((a, i) => `*${i + 1}. ${a.angle}*\n${a.reply}`),
  ];
  return lines.join("\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as SendBody;
  const text = formatSlack(body);

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ preview: text, sent: false, reason: "no webhook configured" });
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`Slack ${res.status}: ${await res.text()}`);
    return NextResponse.json({ preview: text, sent: true });
  } catch (e) {
    return NextResponse.json(
      { preview: text, sent: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
