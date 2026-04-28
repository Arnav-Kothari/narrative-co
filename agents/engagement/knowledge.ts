import fs from "node:fs";
import path from "node:path";

// Drop additional source-of-truth markdown files into
// agents/engagement/knowledge/ and they'll be concatenated into the system
// prompt for both scoring and angle drafting. Replace the files to refresh
// the model's context - no code change required.
//
// Current files:
//   knowledge/messaging.md  - canonical messaging rules
//   knowledge/audience.md   - Enterprise AI Navigator persona definitions
//   knowledge/salesforce_fy26_consolidated.md  - large reference doc, NOT auto-loaded;
//                                                see customers.ts for targeted retrieval
//   knowledge/salesforce_customer_stories.md   - same data as customer section in
//                                                consolidated, also skipped from auto-load

const KNOWLEDGE_DIR = path.join(process.cwd(), "agents", "engagement", "knowledge");

// Files too large to inject into every prompt. They are retrieved selectively
// (e.g. customers.ts pulls per-customer blocks when a post mentions one).
const SKIP_AUTOLOAD = new Set([
  "salesforce_fy26_consolidated.md",
  "salesforce_customer_stories.md",
]);

type CachedKnowledge = {
  text: string;
  loadedAt: number;
};

let cache: CachedKnowledge | null = null;
const CACHE_TTL_MS = 60_000;

function loadKnowledgeSync(): string {
  let dirEntries: string[];
  try {
    dirEntries = fs.readdirSync(KNOWLEDGE_DIR);
  } catch {
    return "";
  }

  const mdFiles = dirEntries
    .filter((f) => f.toLowerCase().endsWith(".md") && !SKIP_AUTOLOAD.has(f.toLowerCase()))
    .sort();

  if (mdFiles.length === 0) return "";

  const sections: string[] = [];
  for (const file of mdFiles) {
    try {
      const full = path.join(KNOWLEDGE_DIR, file);
      const body = fs.readFileSync(full, "utf8").trim();
      if (!body) continue;
      sections.push(`===== KNOWLEDGE: ${file} =====\n${body}`);
    } catch {
      // skip unreadable files silently
    }
  }

  if (sections.length === 0) return "";

  return [
    "BACKGROUND KNOWLEDGE (source-of-truth context, authoritative):",
    "The markdown sections below are Salesforce's canonical messaging and audience docs. Treat them as authoritative context when scoring posts or drafting replies. If guidance in this knowledge block conflicts with the rubric above, the rubric wins for output format; the knowledge wins for terminology, positioning, and audience calibration.",
    "",
    ...sections,
  ].join("\n\n");
}

export function getKnowledge(): string {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.text;
  const text = loadKnowledgeSync();
  cache = { text, loadedAt: now };
  return text;
}

export function withKnowledge(systemPrompt: string): string {
  const k = getKnowledge();
  if (!k) return systemPrompt;
  return `${systemPrompt}\n\n${k}`;
}
