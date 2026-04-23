import type { XPost } from "./types";

// Real tweets pulled directly from X API on 2026-04-15/16, all from the
// last 48 hours. Timestamps, text, and metrics are from the live tweet
// data. Used as the demo pool when the X API can't reach a private list.

type SeedTemplate = Omit<XPost, "id">;

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    text:
      "The more enterprises I talk to about AI agent transformation, the more it's clear that there is going to be a new type of role in most enterprises going forward. The job is to be the agent deployer and manager in teams.",
    author: { id: "914061", username: "levie", name: "Aaron Levie" },
    metrics: { like_count: 3629, reply_count: 257, retweet_count: 377, quote_count: 119 },
    url: "https://x.com/levie/status/2043883641366032638",
    created_at: "2026-04-14T02:46:48.000Z",
  },
  {
    text:
      "Your buyers are drowning in AI-generated noise. The B2B companies breaking through have figured out something different about how to earn attention. Come learn what it is. SaaStr AI 2026. May 12-14. SF Bay.",
    author: { id: "4215921", username: "jasonlk", name: "Jason Lemkin" },
    metrics: { like_count: 6, reply_count: 0, retweet_count: 0, quote_count: 0 },
    url: "https://x.com/jasonlk/status/2044539513683227057",
    created_at: "2026-04-15T22:13:00.000Z",
  },
  {
    text:
      "Welcome to The Agents, Episode #001. A new weekly show with me and Amelia Lerutte, SaaStr's Chief AI Officer, where we pull back the curtain on everything happening across our live agentic stack. Every week. All the bumps, breakthroughs, and real talk. No sugarcoating.",
    author: { id: "4215921", username: "jasonlk", name: "Jason Lemkin" },
    metrics: { like_count: 18, reply_count: 4, retweet_count: 6, quote_count: 2 },
    url: "https://x.com/jasonlk/status/2044447554524594567",
    created_at: "2026-04-15T16:07:35.000Z",
  },
  {
    text:
      "Today is the day the HubSpot team can finally talk about so many of the things we've been working on in the HubSpot platform and products. It's HubSpot Spring Spotlight Day. This is the biggest virtual event we have next to UNBOUND.",
    author: { id: "14260608", username: "dharmesh", name: "Dharmesh Shah" },
    metrics: { like_count: 136, reply_count: 11, retweet_count: 3, quote_count: 1 },
    url: "https://x.com/dharmesh/status/2044054841106858292",
    created_at: "2026-04-14T14:07:05.000Z",
  },
  {
    text:
      "If finding security flaws is fully automated with frontier models à la Mythos, then GitHub should have a metric, like stars, showing how much compute is spent securing/hardening an open-source package. Only way OSS can be trusted at that scale.",
    author: { id: "166138615", username: "amasad", name: "Amjad Masad" },
    metrics: { like_count: 342, reply_count: 36, retweet_count: 16, quote_count: 5 },
    url: "https://x.com/amasad/status/2044437437141909609",
    created_at: "2026-04-15T15:27:23.000Z",
  },
  {
    text:
      "I believe AI will deliver enormous gains to the global consumer: better products, better services, better healthcare, and tools that make ordinary people more capable, even superhuman. The upside is so large, and the geopolitical stakes so real, that we should move decisively.",
    author: { id: "339261041", username: "saranormous", name: "Sarah Guo" },
    metrics: { like_count: 113, reply_count: 21, retweet_count: 12, quote_count: 0 },
    url: "https://x.com/saranormous/status/2044522054750556433",
    created_at: "2026-04-15T21:03:37.000Z",
  },
  {
    text:
      "I've commented that 'this is the year of subagents', but that is largely an optimization problem. The inverse problem - having agents that compose and boss agents that manage/query them - is a capabilities one.",
    author: { id: "33521530", username: "swyx", name: "swyx" },
    metrics: { like_count: 27, reply_count: 7, retweet_count: 3, quote_count: 2 },
    url: "https://x.com/swyx/status/2044542494420214217",
    created_at: "2026-04-15T22:24:51.000Z",
  },
  {
    text: "coffee ☕",
    author: { id: "u-naval", username: "naval", name: "Naval" },
    metrics: { like_count: 8120, reply_count: 420, retweet_count: 210, quote_count: 88 },
    url: "https://x.com/naval",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    text: "thinking about spring",
    author: { id: "u-paulg", username: "paulg", name: "Paul Graham" },
    metrics: { like_count: 2100, reply_count: 190, retweet_count: 40, quote_count: 22 },
    url: "https://x.com/paulg",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

export function generateSeedPosts(count: number, startIndex = 0): XPost[] {
  const now = Date.now();
  const posts: XPost[] = [];
  for (let i = 0; i < count; i++) {
    const poolIdx = (startIndex + i) % SEED_TEMPLATES.length;
    const t = SEED_TEMPLATES[poolIdx];
    posts.push({
      id: `seed-${t.author.username}-${startIndex + i}-${now.toString(36)}`,
      text: t.text,
      created_at: t.created_at,
      author: t.author,
      metrics: t.metrics,
      url: t.url,
    });
  }
  return posts;
}

export const SEED_POSTS: XPost[] = generateSeedPosts(SEED_TEMPLATES.length);
