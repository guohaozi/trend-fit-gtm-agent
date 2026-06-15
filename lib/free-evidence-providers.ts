import type { EvidenceCandidate } from "./evidence-collector";
import type { EvidenceMagnitude } from "./evidence-adjustment";

// Free, key-free, Vercel-runnable evidence providers: Reddit public JSON, Hacker News
// (Algolia), and GDELT. Each provider has a pure `map*ToCandidates` (raw JSON -> candidates,
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
// Reddit public JSON — raw audience/use-case language.
// ============================================================
export type RedditChild = {
  data?: { title?: string; permalink?: string; subreddit?: string; num_comments?: number };
};
export type RedditListing = { data?: { children?: RedditChild[] } };

export function mapRedditToCandidates(listing: RedditListing, limit = 5): EvidenceCandidate[] {
  const posts = (listing?.data?.children ?? []).filter((c) => c?.data?.permalink).slice(0, limit);
  const mag = magnitudeForCount(posts.length);
  // A reddit /comments/ thread is forced-proxy EXCEPT for audience/use-case raw language,
  // where the classifier grants primary/medium. So we only map those two dimensions.
  return posts.flatMap((child, index) => {
    const data = child.data!;
    const url = `https://www.reddit.com${data.permalink}`;
    const note = `Reddit r/${data.subreddit ?? "?"}：${clean(data.title)}`;
    return (["audienceOverlap", "useCaseRelevance"] as const).map((dimension) => ({
      id: `reddit-${index}-${dimension}`,
      dimension,
      direction: "confirm" as const,
      magnitude: mag,
      desiredConfidence: "medium" as const,
      sourceUrl: url,
      verificationStatus: "verified" as const,
      note
    }));
  });
}

// Reddit blocks the public /search.json from datacenter IPs (403) — so on Vercel it only
// works via OAuth. Set REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (free "script" app) to enable
// the OAuth path; otherwise we best-effort the public JSON (works from residential IPs only).
let cachedRedditToken: { token: string; expiresAt: number } | null = null;

async function redditAccessToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedRedditToken && cachedRedditToken.expiresAt > Date.now()) return cachedRedditToken.token;
  try {
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT
      },
      body: "grant_type=client_credentials"
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedRedditToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000
    };
    return cachedRedditToken.token;
  } catch {
    return null;
  }
}

export async function fetchRedditEvidence(query: string, limit = 5): Promise<EvidenceCandidate[]> {
  try {
    const token = await redditAccessToken();
    const q = encodeURIComponent(query);
    const url = token
      ? `https://oauth.reddit.com/search?q=${q}&limit=${limit}&sort=relevance&type=link`
      : `https://www.reddit.com/search.json?q=${q}&limit=${limit}&sort=relevance&type=link`;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    return mapRedditToCandidates((await fetchJson(url, headers)) as RedditListing, limit);
  } catch {
    return [];
  }
}

// ============================================================
// Hacker News (Algolia) — tech-community raw language.
// ============================================================
export type HnHit = { objectID?: string; title?: string; url?: string; points?: number; num_comments?: number };
export type HnResponse = { hits?: HnHit[] };

export function mapHnToCandidates(response: HnResponse, limit = 5): EvidenceCandidate[] {
  const hits = (response?.hits ?? []).filter((h) => h?.title).slice(0, limit);
  const mag = magnitudeForCount(hits.length);
  return hits.flatMap((hit, index) => {
    const url = `https://news.ycombinator.com/item?id=${hit.objectID ?? ""}`;
    const note = `Hacker News：${clean(hit.title)}（${hit.points ?? 0} 分 / ${hit.num_comments ?? 0} 评论）`;
    return (["audienceOverlap", "useCaseRelevance"] as const).map((dimension) => ({
      id: `hn-${index}-${dimension}`,
      dimension,
      direction: "confirm" as const,
      magnitude: mag,
      // comment_corpus is a primary signal; cap to medium so HN doesn't over-credit.
      desiredConfidence: "medium" as const,
      sourceUrl: url,
      verificationStatus: "verified" as const,
      sourceSignals: ["comment_corpus"] as const,
      note
    }));
  });
}

export async function fetchHnEvidence(query: string, limit = 5): Promise<EvidenceCandidate[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`;
    return mapHnToCandidates((await fetchJson(url)) as HnResponse, limit);
  } catch {
    return [];
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
      dimension: "timingSaturation",
      direction: "confirm",
      magnitude: magnitudeForCount(articles.length),
      desiredConfidence: "low",
      sourceUrl: top.url!,
      verificationStatus: "unverified",
      note: `GDELT 新闻覆盖 ${articles.length} 条，例：${clean(top.title)}（${top.domain ?? "?"}）`
    });
  }

  if (avgTone !== null && articles.length > 0) {
    const negative = avgTone < -1.5;
    candidates.push({
      id: "gdelt-brand-safety",
      dimension: "brandSafety",
      direction: negative ? "down" : "confirm",
      magnitude: negative ? "moderate" : "weak",
      desiredConfidence: "low",
      sourceUrl: articles[0].url!,
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
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${limit}&sort=hybridrel`;
    return mapGdeltToCandidates((await fetchJson(url)) as GdeltArtList, null, limit);
  } catch {
    return [];
  }
}

// ============================================================
// Orchestrator — runs the free providers in parallel.
// ============================================================
export type FreeEvidenceResult = {
  candidates: EvidenceCandidate[];
  bySource: { reddit: number; hackernews: number; gdelt: number };
};

export async function collectFreeEvidence({
  trend,
  product
}: {
  trend: string;
  product?: string;
}): Promise<FreeEvidenceResult> {
  const query = [trend, product].filter(Boolean).join(" ").trim() || trend;
  const [reddit, hackernews, gdelt] = await Promise.all([
    fetchRedditEvidence(query),
    fetchHnEvidence(query),
    fetchGdeltEvidence(trend)
  ]);
  return {
    candidates: [...reddit, ...hackernews, ...gdelt],
    bySource: { reddit: reddit.length, hackernews: hackernews.length, gdelt: gdelt.length }
  };
}
