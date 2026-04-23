import { NextResponse } from "next/server";
import { generateSeedPosts } from "@/agents/engagement/seedPosts";

export const runtime = "nodejs";

// Returns a single fresh demo post - used by the client's continuous stream
// to keep the feed arriving indefinitely. Each call picks a random template,
// assigns a unique ID, and stamps created_at = now.
export async function GET() {
  const idx = Math.floor(Math.random() * 1000);
  const [post] = generateSeedPosts(1, idx);
  // override to make the stream look "live": created_at = now
  post.created_at = new Date().toISOString();
  return NextResponse.json({ post });
}
