import fs from "node:fs";
import path from "node:path";

// Targeted retrieval over knowledge/salesforce_customer_stories.md. The
// markdown is too big to inject into every prompt; instead we parse out
// per-customer blocks once and only attach the relevant one to a post when
// its name appears.

const STORIES_PATH = path.join(
  process.cwd(),
  "agents",
  "engagement",
  "knowledge",
  "salesforce_customer_stories.md"
);

export type CustomerEntry = {
  slug: string;
  title: string;
  url: string;
  body: string;
  aliases: string[];
};

// Aliases per slug. Word-boundary matched for single-word aliases, substring
// matched for multi-word aliases. Generic words (engine, rare) are deliberately
// strict to avoid false positives on tweets that aren't about the customer.
const ALIASES: Record<string, string[]> = {
  "opentable": ["opentable", "open table"],
  "opentable-agentforce-implementation": ["opentable", "open table"],
  "engine-agentforce-implementation": ["engine.com", "engine travel", "engine inc"],
  "fedex": ["fedex", "fed ex"],
  "pandora": ["pandora"],
  "reddit": ["reddit"],
  "remarkable": ["remarkable", "re markable"],
  "remarkable-agentforce-implementation": ["remarkable", "re markable"],
  "telepass": ["telepass"],
  "lennar": ["lennar"],
  "pearson": ["pearson"],
  "uchicago-medicine": ["uchicago medicine", "university of chicago medicine", "uchicago"],
  "uchicago-medicine-andrew-chang-byline": [
    "uchicago medicine",
    "university of chicago medicine",
    "uchicago",
    "andrew chang",
  ],
  "pacers-sports-entertainment-data-360": ["indiana pacers", "pacers sports"],
  "pepsico-data-360": ["pepsico", "pepsi"],
  "agibank": ["agibank"],
  "dynamic-ecohome": ["dynamic ecohome", "dynamic eco home"],
  "flyer-club": ["flyer club"],
  "grupo-falabella": ["grupo falabella", "falabella"],
  "meritage-homes": ["meritage homes", "meritage"],
  "mimit-health": ["mimit health", "mimit"],
  "rare": ["rare nonprofit", "rare.org"],
  "venturecrowd": ["venturecrowd"],
  "world-economic-forum": ["world economic forum", "davos", "wef"],
  "accenture-rajendra-prasad-and-sara-porter-interview": [
    "accenture",
    "rajendra prasad",
    "sara porter",
  ],
  "bionic-james-lomas-byline": ["bionic", "james lomas"],
  "liv-golf-nick-connor-interview": ["liv golf", "nick connor"],
  "nexo-agentforce-implementation": ["nexo"],
};

let cache: { entries: CustomerEntry[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

function parseEntries(content: string): CustomerEntry[] {
  // Append a sentinel so the final entry's lookahead always finds a "## ".
  // The TOC and prose at the top don't have the <a id="..."> + **URL:**
  // shape, so the regex naturally skips them.
  const section = content + "\n## __end__\n";

  // Each entry: "## Title\n\n<a id=\"slug\"></a>\n**URL:** url\n\n...body... up to next ##"
  const re = /^## (.+?)\n\n<a id="([^"]+)"><\/a>\n\*\*URL:\*\* (.+?)\n([\s\S]*?)(?=^## )/gm;
  const out: CustomerEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const title = m[1].trim();
    const slug = m[2].trim();
    const url = m[3].trim();
    const body = m[4].trim();
    const aliases = ALIASES[slug] || [slug.replace(/-/g, " ")];
    out.push({ slug, title, url, body, aliases });
  }
  return out;
}

export function getCustomers(): CustomerEntry[] {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.entries;
  let content = "";
  try {
    content = fs.readFileSync(STORIES_PATH, "utf8");
  } catch {
    cache = { entries: [], loadedAt: now };
    return [];
  }
  const entries = parseEntries(content);
  cache = { entries, loadedAt: now };
  return entries;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findCustomersInText(text: string): CustomerEntry[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const out: CustomerEntry[] = [];
  const seen = new Set<string>();
  for (const c of getCustomers()) {
    if (seen.has(c.slug)) continue;
    for (const aliasRaw of c.aliases) {
      const alias = aliasRaw.toLowerCase();
      let hit = false;
      if (alias.includes(" ") || alias.includes(".")) {
        // Multi-word or domain-style alias: substring match is fine
        hit = lower.includes(alias);
      } else {
        // Single bare word: require word boundaries
        const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
        hit = re.test(text);
      }
      if (hit) {
        out.push(c);
        seen.add(c.slug);
        break;
      }
    }
  }
  return out;
}

const MAX_BODY_CHARS = 3500;

export function buildCustomerContext(matched: CustomerEntry[]): string {
  if (matched.length === 0) return "";
  const blocks = matched.map((c) => {
    const body =
      c.body.length > MAX_BODY_CHARS
        ? c.body.substring(0, MAX_BODY_CHARS) + "\n[...truncated]"
        : c.body;
    return `--- CUSTOMER: ${c.title} ---\nSource: ${c.url}\n${body}`;
  });
  return [
    "RELEVANT CUSTOMER CONTEXT",
    "The post above mentions one or more Salesforce customers. The blocks below are pulled from our customer stories reference (salesforce.com/customer-stories). Use these data points and details to ground the suggested reply angle. Apply the light-touch rule: cite outcomes as industry fact, never as 'our customer X thanks to product Y'. Prefer a sharp number or specific detail over generic praise.",
    "",
    ...blocks,
  ].join("\n\n");
}
