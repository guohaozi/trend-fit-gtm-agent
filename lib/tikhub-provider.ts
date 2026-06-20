import type { CollectedSnippet, EvidenceCandidate } from "./evidence-collector";
import type { EvidenceMagnitude } from "./evidence-adjustment";

// TikHub (https://tikhub.io) — one paid key covers the social platforms:
// Xiaohongshu(小红书), TikTok, Instagram, X(Twitter), Reddit. HN/GDELT stay free; Google stays
// on SerpApi. Endpoints + keyword params verified from the TikHub Python SDK source. Auth:
// Authorization: Bearer <TIKHUB_API_KEY>. Activates only when the key is set; otherwise returns
// nothing (the free HN/GDELT providers still run).
//
// Each platform adapter only accepts known post-content and post-ID fields. Profile names,
// dates, audio labels, and navigation text never become evidence snippets.

const TIKHUB_BASE = "https://api.tikhub.io";
const TIMEOUT_MS = 12000;
const MAX_SNIPPETS = 3;

type TikhubPlatform = {
  key: string;
  label: string;
  path: string;
  param: string;
  textKeys: string[];
  textContainers?: string[];
  idKeys: string[];
  permalinkKeys?: string[];
  extraParams?: Record<string, string>;
  postUrl: (id: string, permalink?: string) => string;
};

const PLATFORMS: TikhubPlatform[] = [
  {
    key: "xiaohongshu",
    label: "小红书",
    // App search_notes is higher priority than Web V3 per TikHub docs (App V2 > App > Web V3) and
    // far more stable; Web V3 was returning a blanket 400. Posts live in item.note (title/desc/id).
    path: "/api/v1/xiaohongshu/app/search_notes",
    param: "keyword",
    extraParams: { page: "1" },
    textKeys: ["title", "desc"],
    textContainers: ["note"],
    idKeys: ["id"],
    postUrl: (id) => `https://www.xiaohongshu.com/explore/${id}`
  },
  {
    key: "tiktok",
    label: "TikTok",
    path: "/api/v1/tiktok/app/v3/fetch_general_search_result",
    param: "keyword",
    textKeys: ["desc", "caption"],
    textContainers: ["aweme_info"],
    idKeys: ["aweme_id", "id"],
    postUrl: (id) => `https://www.tiktok.com/@_/video/${id}`
  },
  {
    key: "instagram",
    label: "Instagram",
    path: "/api/v1/instagram/v3/general_search",
    param: "query",
    textKeys: ["caption", "text"],
    textContainers: ["caption"],
    idKeys: ["shortcode", "code", "pk", "id"],
    postUrl: (id) => `https://www.instagram.com/p/${id}/`
  },
  {
    key: "twitter",
    label: "X",
    path: "/api/v1/twitter/web/fetch_search_timeline",
    param: "keyword",
    textKeys: ["full_text", "text"],
    textContainers: ["legacy"],
    idKeys: ["rest_id", "tweet_id", "id"],
    postUrl: (id) => `https://x.com/i/web/status/${id}`
  },
  {
    key: "reddit",
    label: "Reddit",
    path: "/api/v1/reddit/app/fetch_dynamic_search",
    param: "query",
    textKeys: ["title", "selftext", "markdown"],
    idKeys: ["name", "id"],
    permalinkKeys: ["permalink", "url"],
    postUrl: (id, permalink) => permalink?.startsWith("http")
      ? permalink
      : permalink
        ? `https://www.reddit.com${permalink}`
        : `https://www.reddit.com/comments/${id.replace(/^t3_/, "")}/`
  }
];

function stringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (key === "caption" && value && typeof value === "object") {
      const text = (value as Record<string, unknown>).text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return undefined;
}

function cleanSnippetText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function nestedTextField(record: Record<string, unknown>, platform: TikhubPlatform): string | undefined {
  for (const containerKey of platform.textContainers ?? []) {
    const container = record[containerKey];
    if (container && typeof container === "object" && !Array.isArray(container)) {
      const text = stringField(container as Record<string, unknown>, platform.textKeys);
      if (text) return text;
    }
  }
  return undefined;
}

export function extractTikhubSnippets(
  platformKey: string,
  node: unknown,
  query: string,
  max = MAX_SNIPPETS
): CollectedSnippet[] {
  const platform = PLATFORMS.find((candidate) => candidate.key === platformKey);
  if (!platform) return [];
  const adapter = platform;

  const snippets: CollectedSnippet[] = [];
  const seen = new Set<string>();

  function visit(value: unknown, depth = 0): void {
    if (snippets.length >= max || depth > 14 || value == null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    const text = stringField(record, adapter.textKeys) ?? nestedTextField(record, adapter);
    const rawId = stringField(record, adapter.idKeys);
    if (text && rawId) {
      const canonicalSourceId = `${adapter.key}:${rawId}`;
      const cleaned = cleanSnippetText(text);
      if (cleaned.length >= 4 && !seen.has(canonicalSourceId)) {
        const permalink = adapter.permalinkKeys ? stringField(record, adapter.permalinkKeys) : undefined;
        seen.add(canonicalSourceId);
        snippets.push({
          id: `tikhub-${adapter.key}-${rawId}`,
          provider: "tikhub",
          platform: adapter.key,
          query,
          text: cleaned,
          sourceUrl: adapter.postUrl(rawId, permalink),
          canonicalSourceId,
          verificationStatus: "verified",
          sourceSignals: ["comment_corpus"]
        });
      }
    }

    for (const child of Object.values(record)) visit(child, depth + 1);
  }

  visit(node);
  return snippets;
}

function magnitudeForCount(count: number): EvidenceMagnitude {
  return count >= 3 ? "moderate" : "weak";
}

/** Map extracted snippets to audience/use-case raw-language candidates. Pure + testable. */
export function snippetsToCandidates(
  platform: { key: string; label: string },
  snippets: CollectedSnippet[]
): EvidenceCandidate[] {
  const top = snippets.slice(0, MAX_SNIPPETS);
  const mag = magnitudeForCount(top.length);
  return top.flatMap((snippet, index) =>
    (["audienceOverlap", "useCaseRelevance"] as const).map((dimension) => ({
      id: `tikhub-${platform.key}-${index}-${dimension}`,
      evidenceUse: "context" as const,
      dimension,
      direction: "confirm" as const,
      magnitude: mag,
      desiredConfidence: "medium" as const,
      sourceUrl: snippet.sourceUrl,
      canonicalSourceId: snippet.canonicalSourceId,
      verificationStatus: snippet.verificationStatus,
      sourceSignals: [...snippet.sourceSignals],
      note: `${platform.label}：${snippet.text.slice(0, 140)}`
    }))
  );
}

async function fetchPlatform(platform: TikhubPlatform, query: string, token: string): Promise<CollectedSnippet[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const extra = Object.entries(platform.extraParams ?? {})
      .map(([key, value]) => `&${key}=${encodeURIComponent(value)}`)
      .join("");
    const url = `${TIKHUB_BASE}${platform.path}?${platform.param}=${encodeURIComponent(query)}${extra}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) return [];
    const json = await response.json();
    return extractTikhubSnippets(platform.key, json, query);
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
}): Promise<{ candidates: EvidenceCandidate[]; snippets: CollectedSnippet[]; bySource: Record<string, number> }> {
  const token = process.env.TIKHUB_API_KEY;
  if (!token) return { candidates: [], snippets: [], bySource: {} };

  const query = [trend, product].filter(Boolean).join(" ").trim() || trend;
  const results = await Promise.all(
    PLATFORMS.map((platform) => fetchPlatform(platform, query, token).then((snippets) => ({ platform, snippets })))
  );

  const bySource: Record<string, number> = {};
  for (const result of results) bySource[result.platform.key] = result.snippets.length;
  const snippets = results.flatMap((result) => result.snippets);
  return {
    candidates: results.flatMap((result) => snippetsToCandidates(result.platform, result.snippets)),
    snippets,
    bySource
  };
}
