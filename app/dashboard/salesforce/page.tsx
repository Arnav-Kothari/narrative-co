"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_RUBRIC } from "@/agents/engagement/rubric";
import { DEFAULT_TONE } from "@/agents/engagement/tone";
import "./demo.css";

type Post = {
  id: string;
  text: string;
  created_at: string;
  author: { id: string; username: string; name: string; profile_image_url?: string };
  metrics: { like_count: number; reply_count: number; retweet_count: number; quote_count: number };
  url: string;
};

type Score = { id: string; score: number; rationale: string; flags: string[] };
type Angle = { angle: string; reply: string };

const LIVE_POLL_MS = 60_000;
const STORAGE_KEY = "sf-demo-v2";

type PersistedState = {
  live: { posts: Post[]; visibleCount: number; initialized: boolean; lastSync: string | null };
  demo: { posts: Post[]; visibleCount: number; initialized: boolean; lastSync: string | null };
  scores: Record<string, Score>;
  angles: Record<string, Angle[]>;
  copiedIds: string[];
  rubric?: string;
  tone?: string;
};

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}
const NOW_TICK_MS = 15_000;

function timeAgo(date: Date | null, now: Date): string {
  if (!date) return "-";
  const sec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export default function SalesforceDemoPage() {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [angles, setAngles] = useState<Record<string, Angle[]>>({});
  const [hydrated, setHydrated] = useState(false);

  const [threshold, setThreshold] = useState(70);
  const [floor, setFloor] = useState(10);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [rubricTab, setRubricTab] = useState<"scoring" | "tone">("scoring");
  const [rubric, setRubric] = useState(DEFAULT_RUBRIC);
  const [tone, setTone] = useState(DEFAULT_TONE);
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [source, setSource] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [anglesLoading, setAnglesLoading] = useState<Record<string, boolean>>({});
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  // Cache the posts/visibleCount/init/lastSync per mode so switching tabs
  // doesn't wipe the state and force us to re-fetch + re-score.
  // Scores/angles/copiedIds are keyed by post ID and carry over naturally.
  type ModeCache = {
    posts: Post[];
    visibleCount: number;
    initialized: boolean;
    lastSync: Date | null;
  };
  const modeCache = useRef<{ live: ModeCache; demo: ModeCache }>({
    live: { posts: [], visibleCount: 0, initialized: false, lastSync: null },
    demo: { posts: [], visibleCount: 0, initialized: false, lastSync: null },
  });
  const prevMode = useRef<"live" | "demo">("live");

  const rubricRef = useRef("");
  const toneRef = useRef("");
  useEffect(() => {
    rubricRef.current = rubric;
  }, [rubric]);
  useEffect(() => {
    toneRef.current = tone;
  }, [tone]);

  const visiblePosts = useMemo(() => allPosts.slice(0, visibleCount), [allPosts, visibleCount]);
  const sortedPosts = useMemo(() => {
    return [...visiblePosts]
      .filter((p) => {
        const s = scores[p.id];
        return !s || s.score >= floor;
      })
      .sort((a, b) => (scores[b.id]?.score ?? -1) - (scores[a.id]?.score ?? -1));
  }, [visiblePosts, scores, floor]);

  const droppedCount = useMemo(() => {
    return visiblePosts.filter((p) => {
      const s = scores[p.id];
      return s && s.score < floor;
    }).length;
  }, [visiblePosts, scores, floor]);

  // one-time hydration from localStorage on mount (client only) to avoid
  // server/client HTML mismatch
  useEffect(() => {
    const persisted = loadPersisted();
    if (persisted) {
      modeCache.current.live = {
        posts: persisted.live.posts ?? [],
        visibleCount: persisted.live.visibleCount ?? 0,
        initialized: persisted.live.initialized ?? false,
        lastSync: persisted.live.lastSync ? new Date(persisted.live.lastSync) : null,
      };
      modeCache.current.demo = {
        posts: persisted.demo.posts ?? [],
        visibleCount: persisted.demo.visibleCount ?? 0,
        initialized: persisted.demo.initialized ?? false,
        lastSync: persisted.demo.lastSync ? new Date(persisted.demo.lastSync) : null,
      };
      const current = modeCache.current[mode];
      setAllPosts(current.posts);
      setVisibleCount(current.visibleCount);
      setScores(persisted.scores ?? {});
      setAngles(persisted.angles ?? {});
      setCopiedIds(new Set(persisted.copiedIds ?? []));
      setLastSync(current.lastSync);
      if (persisted.rubric) setRubric(persisted.rubric);
      if (persisted.tone) setTone(persisted.tone);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tick for "last sync Xm ago" - slower tick to avoid re-render jank
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), NOW_TICK_MS);
    return () => clearInterval(t);
  }, []);

  // persist state to localStorage so a page refresh doesn't wipe scored posts.
  // Debounced so a burst of score/angle updates doesn't trigger a serialize+write
  // on every render. If quota is hit, retry without angles (the largest blob).
  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    const handle = setTimeout(() => {
      const snapshot: PersistedState = {
        live: {
          posts: modeCache.current.live.posts,
          visibleCount: modeCache.current.live.visibleCount,
          initialized: modeCache.current.live.initialized,
          lastSync: modeCache.current.live.lastSync?.toISOString() ?? null,
        },
        demo: {
          posts: modeCache.current.demo.posts,
          visibleCount: modeCache.current.demo.visibleCount,
          initialized: modeCache.current.demo.initialized,
          lastSync: modeCache.current.demo.lastSync?.toISOString() ?? null,
        },
        scores,
        angles,
        copiedIds: Array.from(copiedIds),
        rubric,
        tone,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Most likely quota - retry without angles, which are the heaviest payload
        // and the easiest to regenerate on demand.
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snapshot, angles: {} }));
        } catch {
          // Give up silently; posts/scores will refetch on next visit.
        }
      }
    }, 2000);
    return () => clearTimeout(handle);
  }, [allPosts, visibleCount, scores, angles, copiedIds, lastSync, rubric, tone, hydrated]);

  async function doFetch(modeOverride?: "live" | "demo") {
    const m = modeOverride ?? mode;
    const cache = modeCache.current[m];
    try {
      const newestId =
        m === "live" && cache.initialized && cache.posts.length > 0
          ? cache.posts.reduce(
              (max, p) => (BigInt(p.id) > BigInt(max) ? p.id : max),
              cache.posts[0].id
            )
          : null;
      const qs = new URLSearchParams({ mode: m });
      if (newestId) qs.set("since_id", newestId);
      const r = await fetch(`/api/engagement/x-posts?${qs.toString()}`);
      const data = await r.json();
      const incoming: Post[] = data.posts ?? [];
      const incomingScores: Record<string, Score> | undefined = data.scores;
      setSource(data.source ?? null);
      if (data.error) setErr(`X API: ${data.error} - using seed posts.`);
      else if (data.warning) setErr(data.warning);
      else setErr(null);

      // If server returned pre-computed scores (cache mode), apply them.
      if (incomingScores && Object.keys(incomingScores).length > 0) {
        setScores((prev) => ({ ...prev, ...incomingScores }));
      }

      const cutoffMs = Date.now() - 48 * 3600 * 1000;
      if (!cache.initialized) {
        cache.initialized = true;
        cache.posts = incoming;
        cache.visibleCount = incoming.length;
        setAllPosts(incoming);
        setVisibleCount(incoming.length);
      } else {
        const existing = new Set(cache.posts.map((p) => p.id));
        const newOnes = incoming.filter((p) => !existing.has(p.id));
        // Prune posts older than 48h (live only).
        const pruned =
          m === "live"
            ? cache.posts.filter((p) => new Date(p.created_at).getTime() >= cutoffMs)
            : cache.posts;
        const merged = [...newOnes, ...pruned];
        cache.posts = merged;
        cache.visibleCount = merged.length;
        setAllPosts(merged);
        setVisibleCount(merged.length);
      }
      cache.lastSync = new Date();
      setLastSync(cache.lastSync);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fetch failed");
    }
  }

  async function scoreBatch(batch: Post[]) {
    // Chunk into smaller requests so the first results show up fast
    // instead of waiting for all 200+ posts to finish scoring.
    const CHUNK = 30;
    try {
      for (let i = 0; i < batch.length; i += CHUNK) {
        const chunk = batch.slice(i, i + CHUNK);
        const r = await fetch("/api/engagement/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ posts: chunk, rubric: rubricRef.current || undefined }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "scoring failed");
        setScores((prev) => {
          const next = { ...prev };
          for (const s of d.scores as Score[]) next[s.id] = s;
          return next;
        });
        setScoringIds((prev) => {
          const next = new Set(prev);
          chunk.forEach((p) => next.delete(p.id));
          return next;
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "scoring failed");
      setScoringIds((prev) => {
        const next = new Set(prev);
        batch.forEach((p) => next.delete(p.id));
        return next;
      });
    }
  }

  // reset + initial fetch whenever mode changes
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevMode.current;
    if (prev !== mode) {
      modeCache.current[prev] = {
        posts: allPosts,
        visibleCount,
        initialized: modeCache.current[prev].initialized,
        lastSync: modeCache.current[prev].lastSync,
      };
    }
    prevMode.current = mode;

    const cache = modeCache.current[mode];
    setAllPosts(cache.posts);
    setVisibleCount(cache.visibleCount);
    setLastSync(cache.lastSync);
    setScoringIds(new Set());

    if (!cache.initialized) {
      void doFetch(mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hydrated]);

  // auto-poll (live only) - demo mode is static, no streaming
  useEffect(() => {
    if (mode !== "live") return;
    const handle = setInterval(() => {
      void doFetch("live");
    }, LIVE_POLL_MS);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // resync when tab becomes visible again (live mode only - demo is static)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (mode === "live") void doFetch("live");
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // auto-score newly visible posts
  useEffect(() => {
    const unscored = visiblePosts.filter((p) => !scores[p.id] && !scoringIds.has(p.id));
    if (unscored.length === 0) return;
    setScoringIds((s) => {
      const next = new Set(s);
      unscored.forEach((p) => next.add(p.id));
      return next;
    });
    void scoreBatch(unscored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts]);

  async function generateAngles(post: Post) {
    setAnglesLoading((s) => ({ ...s, [post.id]: true }));
    try {
      const r = await fetch("/api/engagement/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post, tone: toneRef.current || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "angles failed");
      const newAngles = d.angles as Angle[];
      setAngles((s) => ({ ...s, [post.id]: newAngles }));

      const score = scores[post.id]?.score ?? 0;
      const clip = [
        `Score: ${score}`,
        `Post_URL: ${post.url}`,
        ...newAngles.map((a, i) => `Angle ${i + 1}: ${a.reply}`),
      ].join("\n");
      try {
        await navigator.clipboard.writeText(clip);
        setCopiedIds((s) => new Set(s).add(post.id));
      } catch {
        // clipboard blocked - silent
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "angles failed");
    } finally {
      setAnglesLoading((s) => ({ ...s, [post.id]: false }));
    }
  }

  const isStreaming = mode === "live";
  const aboveCount = sortedPosts.filter((p) => (scores[p.id]?.score ?? 0) >= threshold).length;
  const scoringAny = scoringIds.size > 0;

  return (
    <div className="sf-demo">
      <div className="sf-eyebrow">Salesforce · X engagement pipeline</div>
      <h1 className="sf-title">From the top 10K to the right reply.</h1>
      <p className="sf-sub">
        A monthly-refreshed 10K list feeds an X list. Posts stream in continuously, get scored
        against Salesforce's engagement tenets with Claude, and the ones worth answering surface
        with 3 on-voice reply angles. Approve-to-send routes the best ones to Slack.
      </p>

      {err && <div className="sf-err">{err}</div>}

      {/* Section 1: Source */}
      <section className="sf-section">
        <div className="sf-section-head">
          <span className="sf-section-num">01</span>
          <span className="sf-section-title">Source</span>
          <span className="sf-section-hint">
            <span className={`sf-live-dot ${isStreaming ? "on" : ""}`} />
            {isStreaming ? "streaming" : "caught up"} · last sync {timeAgo(lastSync, now)}
          </span>
        </div>
        <div className="sf-card">
          <div className="sf-source-grid">
            <div>
              <div className="sf-stat-label">Top profiles</div>
              <div className="sf-stat-value">10,000</div>
              <div className="sf-stat-note">ranked by adjusted network value, April refresh</div>
            </div>
            <div>
              <div className="sf-stat-label">X list</div>
              <div className="sf-stat-value">Live</div>
              <div className="sf-stat-note">
                <a
                  href="https://x.com/i/lists/2044646327892779507"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none" }}
                >
                  Narrative 10K ↗
                </a>
              </div>
            </div>
            <div>
              <div className="sf-stat-label">Cadence</div>
              <div className="sf-stat-value">Continuous</div>
              <div className="sf-stat-note">
                {mode === "live"
                  ? `polls X every ${LIVE_POLL_MS / 1000}s · scores as posts arrive`
                  : `streams seeded posts · scores as they arrive`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Controls */}
      <section className="sf-section">
        <div className="sf-section-head">
          <span className="sf-section-num">02</span>
          <span className="sf-section-title">Pipeline</span>
          <span className="sf-section-hint">rubric editable</span>
        </div>
        <div className="sf-card">
          <div className="sf-controls">
            <div className="sf-threshold" style={{ marginRight: 8 }}>
              Source
              <button
                className="sf-btn ghost"
                style={{ padding: "8px 14px" }}
                onClick={() => setMode((m) => (m === "live" ? "demo" : "live"))}
              >
                {mode === "live" ? "Live X API" : "Demo data"}
              </button>
            </div>
            <div className="sf-range-wrap">
              <span className="sf-range-label">
                Hide &lt; <strong style={{ color: "var(--text-3)" }}>{floor}</strong>
              </span>
              <div className="sf-range">
                <div className="sf-range-track" />
                <div
                  className="sf-range-track-muted"
                  style={{ width: `${floor}%` }}
                />
                <div
                  className="sf-range-track-active"
                  style={{ left: `${floor}%`, width: `${Math.max(0, threshold - floor)}%` }}
                />
                <input
                  type="range"
                  className="floor"
                  min={0}
                  max={100}
                  step={5}
                  value={floor}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setFloor(Math.min(v, threshold - 5));
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={threshold}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setThreshold(Math.max(v, floor + 5));
                  }}
                />
              </div>
              <span className="sf-range-label">
                Engage ≥ <strong>{threshold}</strong>
              </span>
            </div>
            <button className="sf-btn ghost" onClick={() => setRubricOpen((v) => !v)}>
              {rubricOpen ? "Hide rubric" : "Show rubric"}
            </button>
          </div>
          {rubricOpen && (
            <div className="sf-rubric-panel">
              <div className="sf-rubric-tabs">
                <button
                  className={`sf-rubric-tab ${rubricTab === "scoring" ? "active" : ""}`}
                  onClick={() => setRubricTab("scoring")}
                >
                  Scoring rubric
                  <span className="sf-rubric-tab-sub">when to engage</span>
                </button>
                <button
                  className={`sf-rubric-tab ${rubricTab === "tone" ? "active" : ""}`}
                  onClick={() => setRubricTab("tone")}
                >
                  Voice rubric
                  <span className="sf-rubric-tab-sub">how to sound</span>
                </button>
                <div className="sf-rubric-actions">
                  <button
                    className="sf-btn ghost"
                    style={{ padding: "6px 12px", fontSize: 10 }}
                    onClick={() => {
                      if (rubricTab === "scoring") setRubric(DEFAULT_RUBRIC);
                      else setTone(DEFAULT_TONE);
                    }}
                  >
                    Reset to default
                  </button>
                </div>
              </div>
              {rubricTab === "scoring" ? (
                <textarea
                  key="scoring"
                  className="sf-rubric"
                  value={rubric}
                  onChange={(e) => setRubric(e.target.value)}
                />
              ) : (
                <textarea
                  key="tone"
                  className="sf-rubric"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
              )}
              <div className="sf-rubric-hint">
                Edits save automatically. {rubricTab === "scoring"
                  ? "Applies to the next batch of posts scored."
                  : "Applies to the next angles drafted."}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Feed */}
      <section className="sf-section">
        <div className="sf-section-head">
          <span className="sf-section-num">03</span>
          <span className="sf-section-title">Scored feed</span>
          <span className="sf-section-hint">
            {sortedPosts.length} shown · {aboveCount} above threshold · {droppedCount} dropped (&lt;{floor})
            {scoringAny ? ` · scoring ${scoringIds.size}` : ""}
            {source ? ` · ${source}` : ""}
          </span>
        </div>

        {sortedPosts.length === 0 && (
          <div className="sf-empty">
            <span className="sf-loading" />
            Waiting for posts…
          </div>
        )}

        {sortedPosts.map((p) => {
          const s = scores[p.id];
          const isScoring = scoringIds.has(p.id);
          const above = (s?.score ?? 0) >= threshold;
          const postAngles = angles[p.id];
          const isLoadingAngles = anglesLoading[p.id];
          return (
            <div key={p.id} className={`sf-post ${s ? (above ? "above" : "below") : ""}`}>
              <div className="sf-score">
                <div className={`sf-score-num ${above ? "hi" : ""}`}>
                  {isScoring ? <span className="sf-loading" /> : s ? s.score : "-"}
                </div>
                <div className="sf-score-label">Score</div>
              </div>

              <div className="sf-post-body">
                <div className="sf-post-author">
                  <strong>{p.author.name}</strong>
                  <span className="handle">@{p.author.username}</span>
                </div>
                <div className="sf-post-text">{p.text}</div>
                <div className="sf-post-meta">
                  <span>♡ {p.metrics.like_count}</span>
                  <span>↺ {p.metrics.retweet_count}</span>
                  <span>💬 {p.metrics.reply_count}</span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    open on X ↗
                  </a>
                  <span>{timeAgo(new Date(p.created_at), now)}</span>
                </div>
                {s && <div className="sf-rationale">{s.rationale}</div>}
                {s && s.flags.length > 0 && (
                  <div className="sf-flags">
                    {s.flags.map((f) => (
                      <span key={f} className="sf-flag">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="sf-post-actions">
                {s && (
                  <button
                    className="sf-btn"
                    onClick={() => generateAngles(p)}
                    disabled={isLoadingAngles}
                  >
                    {isLoadingAngles ? <span className="sf-loading" /> : null}
                    {isLoadingAngles
                      ? "Drafting…"
                      : copiedIds.has(p.id)
                      ? "Copied ✓"
                      : "Draft 3 angles"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

    </div>
  );
}
