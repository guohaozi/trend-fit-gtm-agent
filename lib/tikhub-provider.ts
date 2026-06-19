import type { EvidenceCandidate } from "./evidence-collector";
import type { EvidenceMagnitude } from "./evidence-adjustment";

// TikHub (https://tikhub.io) — one paid key covers the social platforms:
// Xiaohongshu(小红书), TikTok, Instagram, X(Twitter), Reddit. HN/GDELT stay free; Google stays
// on SerpApi. Endpoints + keyword params verified from the TikHub Python SDK source. Auth:
// Authorization: Bearer <TIKHUB_API_KEY>. Activates only when the key is set; otherwise returns
// nothing (the free HN/GDELT providers still run).
//
// Response shapes are deeply nested and differ per platform, so we use a defensive
// deep-text extractor (pull strings under title/desc/caption/content/... keys) rather than
// hard-coding each schema. Extracted snippets are real fetched text used as raw
// audience/use-case language, graded by the deterministic classifier (capped to medium).

const TIKHUB_BASE = "https://api.tikhub.io";
const TIMEOUT_MS = 12000;
const MAX_SNIPPETS = 3;

type TikhubPlatform = {
  key: string;
  label: string;
  path: string;
  param: string;
  searchUrl: (query: string) => string;
};

const PLATFORMS: TikhubPlatform[] = [
  {
    key: "xiaohongshu",
    label: "小红书",
    path: "/api/v1/xiaohongshu/web_v3/fetch_search_notes",
    param: "keyword",
    searchUrl: (q) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: "/api/v1/tiktok/app/v3/fetch_general_search_result",
    param: "keyword",
    searchUrl: (q) => `https://www.tiktok.com/search?q=${encodeURIComponent(q)}`
  },
  {
    key: "instagram",
    label: "Instagram",
    path: "/api/v1/instagram/v3/general_search",
    param: "query",
    searchUrl: (q) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(q)}`
  },
  {
    key: "twitter",
    label: "X",
    path: "/api/v1/twitter/web/fetch_search_timeline",
    param: "keyword",
    searchUrl: (q) => `https://twitter.com/search?q=${encodeURIComponent(q)}`
  },
  {
    key: "reddit",
    label: "Reddit",
    path: "/api/v1/reddit/app/fetch_dynamic_search",
    param: "query",
    searchUrl: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`
  }
];

const TEXT_KEYS = new Set([
  "title",
  "desc",
  "description",
  "caption",
  "content",
  "text",
  "note",
  "full_text",
  "display_name",
  "nickname",
  "name",
  "posttitle",
  "markdown",
  "preview"
]);

/** Recursively pull human-readable text from a platform-specific JSON tree. Pure + testable. */
export function extractSnippets(node: unknown, max = MAX_SNIPPETS, out: string[] = [], depth = 0): string[] {
  if (out.length >= max || depth > 14 || node == null) return out;
  if (Array.isArray(node)) {
    for (const item of node) {
      extractSnippets(item, max, out, depth + 1);
      if (out.length >= max) break;
    }
    return out;
  }
  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string" && TEXT_KEYS.has(key.toLowerCase())) {
        const snippet = value.replace(/\s+/g, " ").trim();
        if (snippet.length >= 4 && snippet.length <= 200 && !out.includes(snippet)) out.push(snippet);
      } else if (value && typeof value === "object") {
        extractSnippets(value, max, out, depth + 1);
      }
      if (out.length >= max) break;
    }
  }
  return out;
}

function magnitudeForCount(count: number): EvidenceMagnitude {
  return count >= 3 ? "moderate" : "weak";
}

/** Map extracted snippets to audience/use-case raw-language candidates. Pure + testable. */
export function snippetsToCandidates(
  platform: { key: string; label: string; searchUrl: (q: string) => string },
  snippets: string[],
  query: string
): EvidenceCandidate[] {
  const top = snippets.slice(0, MAX_SNIPPETS);
  const mag = magnitudeForCount(top.length);
  const url = platform.searchUrl(query);
  return top.flatMap((snippet, index) =>
    (["audienceOverlap", "useCaseRelevance"] as const).map((dimension) => ({
      id: `tikhub-${platform.key}-${index}-${dimension}`,
      dimension,
      direction: "confirm" as const,
      magnitude: mag,
      desiredConfidence: "medium" as const,
      sourceUrl: url,
      verificationStatus: "verified" as const,
      sourceSignals: ["comment_corpus"] as const,
      note: `${platform.label}：${snippet.slice(0, 140)}`
    }))
  );
}

async function fetchPlatform(platform: TikhubPlatform, query: string, token: string): Promise<EvidenceCandidate[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${TIKHUB_BASE}${platform.path}?${platform.param}=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) return [];
    const json = await response.json();
    return snippetsToCandidates(platform, extractSnippets(json), query);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function collectTikhubEvidence({
  trend,
  product
}: {
  trend: string;
  product?: string;
}): Promise<{ candidates: EvidenceCandidate[]; bySource: Record<string, number> }> {
  const token = process.env.TIKHUB_API_KEY;
  if (!token) return { candidates: [], bySource: {} };

  const query = [trend, product].filter(Boolean).join(" ").trim() || trend;
  const results = await Promise.all(
    PLATFORMS.map((platform) => fetchPlatform(platform, query, token).then((candidates) => ({ key: platform.key, candidates })))
  );

  const bySource: Record<string, number> = {};
  for (const result of results) bySource[result.key] = result.candidates.length;
  return { candidates: results.flatMap((result) => result.candidates), bySource };
}
