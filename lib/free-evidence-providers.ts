import type { CollectedSnippet, EvidenceCandidate } from "./evidence-collector";
import type { EvidenceMagnitude } from "./evidence-adjustment";
import { collectTikhubEvidence } from "./tikhub-provider";

// Free, key-free, Vercel-runnable evidence providers: Hacker News (Algolia) and GDELT.
// (Reddit + the other social platforms moved to the paid TikHub provider.) Each provider has
// a pure `map*ToCandidates` (raw JSON -> candidates,
// testable with fixtures) and a thin `fetch*` (network). Candidates are graded by the
// deterministic source-tier classifier downstream — providers never assign a tier. Honesty
// guards: `verificationStatus` + a conservative `desiredConfidence` cap keep aggregate web
// signals at their proper (mostly proxy/medium) level; notes carry the real fetched text.

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT = "trend-fit-gtm-agent/1.0 (evidence collector)";

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function magnitudeForCount(count: number): EvidenceMagnitude {
  // Aggregate web signal is never "strong"; that tier is reserved for verified primary evidence.
  return count >= 3 ? "moderate" : "weak";
}

function clean(text: unknown, max = 160): string {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

// ============================================================
// Hacker News (Algolia) — tech-community raw language.
// ============================================================
export type HnHit = { objectID?: string; title?: string; url?: string; points?: number; num_comments?: number };
export type HnResponse = { hits?: HnHit[] };

export function mapHnToSnippets(response: HnResponse, limit = 5, query = ""): CollectedSnippet[] {
  return (response?.hits ?? []).filter((hit) => hit?.title && hit?.objectID).slice(0, limit).map((hit) => ({
    id: `hn-${hit.objectID}`,
    provider: "hackernews",
    platform: "hackernews",
    query,
    text: clean(hit.title),
    sourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
    canonicalSourceId: `hackernews:${hit.objectID}`,
    verificationStatus: "verified",
    sourceSignals: ["comment_corpus"]
  }));
}

export function mapHnToCandidates(response: HnResponse, limit = 5): EvidenceCandidate[] {
  const hits = (response?.hits ?? []).filter((h) => h?.title).slice(0, limit);
  const mag = magnitudeForCount(hits.length);
  return hits.flatMap((hit, index) => {
    const url = `https://news.ycombinator.com/item?id=${hit.objectID ?? ""}`;
    const note = `Hacker News：${clean(hit.title)}（${hit.points ?? 0} 分 / ${hit.num_comments ?? 0} 评论）`;
    return (["audienceOverlap", "useCaseRelevance"] as const).map((dimension) => ({
      id: `hn-${index}-${dimension}`,
      evidenceUse: "context" as const,
      dimension,
      direction: "confirm" as const,
      magnitude: mag,
      // comment_corpus is a primary signal; cap to medium so HN doesn't over-credit.
      desiredConfidence: "medium" as const,
      sourceUrl: url,
      canonicalSourceId: `hackernews:${hit.objectID ?? index}`,
      verificationStatus: "verified" as const,
      sourceSignals: ["comment_corpus"] as const,
      note
    }));
  });
}

export async function fetchHnEvidence(query: string, limit = 5): Promise<EvidenceCandidate[]> {
  return (await fetchHnCollection(query, limit)).candidates;
}

async function fetchHnCollection(query: string, limit = 5): Promise<{
  candidates: EvidenceCandidate[];
  snippets: CollectedSnippet[];
}> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`;
    const response = (await fetchJson(url)) as HnResponse;
    return {
      candidates: mapHnToCandidates(response, limit),
      snippets: mapHnToSnippets(response, limit, query)
    };
  } catch {
    return { candidates: [], snippets: [] };
  }
}

// ============================================================
// GDELT — global news coverage (timing) + tone (brand safety).
// Unverified aggregate → proxy/low; negative tone lowers brandSafety.
// ============================================================
export type GdeltArticle = { url?: string; title?: string; domain?: string };
export type GdeltArtList = { articles?: GdeltArticle[] };
export type GdeltToneBin = { bin?: number; count?: number };
export type GdeltToneChart = { tonechart?: GdeltToneBin[] };

export function mapGdeltToSnippets(artList: GdeltArtList, limit = 5, query = ""): CollectedSnippet[] {
  return (artList?.articles ?? []).filter((article) => article?.url && article?.title).slice(0, limit).map((article, index) => ({
    id: `gdelt-${index}`,
    provider: "gdelt",
    platform: "news",
    query,
    text: clean(article.title),
    sourceUrl: article.url!,
    canonicalSourceId: `gdelt:${article.url}`,
    verificationStatus: "unverified",
    sourceSignals: []
  }));
}

export function averageTone(toneChart: GdeltToneChart): number | null {
  const bins = toneChart?.tonechart ?? [];
  let weighted = 0;
  let total = 0;
  for (const bin of bins) {
    const value = Number(bin?.bin);
    const count = Number(bin?.count);
    if (Number.isFinite(value) && Number.isFinite(count)) {
      weighted += value * count;
      total += count;
    }
  }
  return total > 0 ? weighted / total : null;
}

export function mapGdeltToCandidates(
  artList: GdeltArtList,
  avgTone: number | null,
  limit = 5
): EvidenceCandidate[] {
  const articles = (artList?.articles ?? []).filter((a) => a?.url && a?.title).slice(0, limit);
  const candidates: EvidenceCandidate[] = [];

  if (articles.length > 0) {
    const top = articles[0];
    candidates.push({
      id: "gdelt-timing",
      evidenceUse: "context",
      dimension: "timingSaturation",
      direction: "confirm",
      magnitude: magnitudeForCount(articles.length),
      desiredConfidence: "low",
      sourceUrl: top.url!,
      canonicalSourceId: `gdelt:${top.url}`,
      verificationStatus: "unverified",
      note: `GDELT 新闻覆盖 ${articles.length} 条，例：${clean(top.title)}（${top.domain ?? "?"}）`
    });
  }

  if (avgTone !== null && articles.length > 0) {
    const negative = avgTone < -1.5;
    candidates.push({
      id: "gdelt-brand-safety",
      evidenceUse: "context",
      dimension: "brandSafety",
      direction: negative ? "down" : "confirm",
      magnitude: negative ? "moderate" : "weak",
      desiredConfidence: "low",
      sourceUrl: articles[0].url!,
      canonicalSourceId: `gdelt:${articles[0].url}`,
      verificationStatus: "unverified",
      note: `GDELT 平均舆情 tone ${avgTone.toFixed(1)}（${negative ? "偏负面，存在品牌安全风险" : "中性/偏正面"}）`
    });
  }

  return candidates;
}

// GDELT rate-limits to ~1 request / 5s per IP and sometimes returns a plain-text notice
// (which makes .json() throw → caught → []). So we do a SINGLE artlist call for coverage
// volume (timing). Tone-based brandSafety needs a second `tonechart` call that trips the
// rate limit, so it's left to `mapGdeltToCandidates(..., avgTone)` callers, not the live path.
export async function fetchGdeltEvidence(query: string, limit = 5): Promise<EvidenceCandidate[]> {
  return (await fetchGdeltCollection(query, limit)).candidates;
}

async function fetchGdeltCollection(query: string, limit = 5): Promise<{
  candidates: EvidenceCandidate[];
  snippets: CollectedSnippet[];
}> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${limit}&sort=hybridrel`;
    const response = (await fetchJson(url)) as GdeltArtList;
    return {
      candidates: mapGdeltToCandidates(response, null, limit),
      snippets: mapGdeltToSnippets(response, limit, query)
    };
  } catch {
    return { candidates: [], snippets: [] };
  }
}

// ============================================================
// Orchestrator — runs the free providers in parallel.
// ============================================================
export type FreeEvidenceResult = {
  candidates: EvidenceCandidate[];
  snippets: CollectedSnippet[];
  bySource: Record<string, number>;
};

export async function collectFreeEvidence({
  trend,
  product
}: {
  trend: string;
  product?: string;
}): Promise<FreeEvidenceResult> {
  const query = [trend, product].filter(Boolean).join(" ").trim() || trend;
  // Free providers (HN / GDELT) + TikHub (paid, only when TIKHUB_API_KEY set; covers
  // 小红书 / TikTok / Instagram / X / Reddit) — all in parallel, all graceful.
  const [hackernews, gdelt, tikhub] = await Promise.all([
    fetchHnCollection(query),
    fetchGdeltCollection(trend),
    collectTikhubEvidence({ trend, product })
  ]);
  return {
    candidates: [...hackernews.candidates, ...gdelt.candidates, ...tikhub.candidates],
    snippets: [...hackernews.snippets, ...gdelt.snippets, ...tikhub.snippets],
    bySource: {
      hackernews: hackernews.snippets.length,
      gdelt: gdelt.snippets.length,
      ...tikhub.bySource
    }
  };
}
