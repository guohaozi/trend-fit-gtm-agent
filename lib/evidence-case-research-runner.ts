import fs from "node:fs";
import path from "node:path";
import { writeEvidenceCaseFiles, type EvidenceCaseCliInput, type EvidenceCaseFileWriterResult } from "./evidence-case-file-writer";
import type { CompetitorResearchFinding } from "./competitor-research-provider";
import type { CustomerResearchFinding } from "./customer-research-provider";
import type { EvidenceCandidate } from "./evidence-collector";
import type { EvidenceConfidence, EvidenceDirection, EvidenceMagnitude } from "./evidence-adjustment";
import type { SeoKeywordFinding } from "./seo-keyword-provider";
import type { SourceSignal } from "./source-tier-classifier";
import type { RiskTolerance, ScoreKey, Scores } from "./types";
import type { WeightProfile } from "./recommendation-rigor";

export type ResearchLane =
  | "audience"
  | "useCase"
  | "commercial"
  | "timingSaturation"
  | "brandSafety"
  | "competitor";

export type ResearchPlatform = "web" | "reddit" | "x" | "twitter" | "xiaohongshu" | "youtube" | "google";

export type ResearchQuery = {
  lane: ResearchLane;
  query: string;
};

export type ResearchSearchResult = {
  lane: ResearchLane;
  query: string;
  title: string;
  url: string;
  snippet: string;
};

export type ResearchSource = {
  search(queries: ResearchQuery[], options: { limitPerQuery: number }): Promise<ResearchSearchResult[]>;
};

export type ProviderFindingResult = {
  searchResults?: ResearchSearchResult[];
  customerResearchFindings?: CustomerResearchFinding[];
  seoKeywordFindings?: SeoKeywordFinding[];
  competitorResearchFindings?: CompetitorResearchFinding[];
  additionalCandidates?: EvidenceCandidate[];
  tooling?: string;
  notes?: string[];
};

export type ProviderFindingSource = {
  collect(context: {
    product: string;
    market: string;
    trend: string;
    queries: ResearchQuery[];
    limitPerQuery: number;
  }): Promise<ProviderFindingResult>;
};

export type EvidenceCaseResearchInput = {
  product: string;
  market: string;
  trend: string;
  riskTolerance: RiskTolerance;
  profileUsed?: WeightProfile;
  competitors?: string[];
  platforms?: ResearchPlatform[];
  baselineScores?: Scores;
  provider?: ResearchSource | ProviderFindingSource;
  limitPerQuery?: number;
  researchDate?: string;
  dataDir?: string;
  outputDir?: string;
};

export type EvidenceCaseResearchResult = {
  queries: ResearchQuery[];
  searchResults: ResearchSearchResult[];
  input: EvidenceCaseCliInput;
  fileResult: EvidenceCaseFileWriterResult;
};

type CandidateSpec = {
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  confidence: EvidenceConfidence;
};

const LANE_TO_CANDIDATE: Record<ResearchLane, CandidateSpec> = {
  audience: {
    dimension: "audienceOverlap",
    direction: "confirm",
    magnitude: "moderate",
    confidence: "high"
  },
  useCase: {
    dimension: "useCaseRelevance",
    direction: "confirm",
    magnitude: "moderate",
    confidence: "high"
  },
  commercial: {
    dimension: "commercialIntent",
    direction: "up",
    magnitude: "strong",
    confidence: "high"
  },
  timingSaturation: {
    dimension: "timingSaturation",
    direction: "up",
    magnitude: "moderate",
    confidence: "high"
  },
  brandSafety: {
    dimension: "brandSafety",
    direction: "confirm",
    magnitude: "moderate",
    confidence: "high"
  },
  competitor: {
    dimension: "messageBridge",
    direction: "confirm",
    magnitude: "moderate",
    confidence: "high"
  }
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function compactTrendForId(trend: string): string {
  return slug(trend).split("_").filter(Boolean).slice(0, 7).join("_");
}

function defaultBaselineScores(profileUsed: WeightProfile | undefined): Scores {
  if (profileUsed === "b2b_pipeline") {
    return {
      audienceOverlap: 75,
      useCaseRelevance: 100,
      messageBridge: 75,
      creativeFeasibility: 75,
      commercialIntent: 75,
      brandSafety: 50,
      timingSaturation: 75
    };
  }

  if (profileUsed === "brand_awareness" || profileUsed === "creator_seeding") {
    return {
      audienceOverlap: 75,
      useCaseRelevance: 75,
      messageBridge: 75,
      creativeFeasibility: 100,
      commercialIntent: 75,
      brandSafety: 50,
      timingSaturation: 75
    };
  }

  return {
    audienceOverlap: 75,
    useCaseRelevance: 75,
    messageBridge: 75,
    creativeFeasibility: 75,
    commercialIntent: 75,
    brandSafety: 50,
    timingSaturation: 75
  };
}

export function buildResearchQueries({
  product,
  market,
  trend,
  competitors = [],
  platforms = ["web", "reddit", "x", "xiaohongshu", "youtube"]
}: {
  product: string;
  market: string;
  trend: string;
  competitors?: string[];
  platforms?: ResearchPlatform[];
}): ResearchQuery[] {
  const base = `${product} ${market} ${trend}`.trim();
  const competitorText = competitors.length > 0 ? competitors.join(" OR ") : `${product} competitors`;
  const queries: ResearchQuery[] = [];

  if (platforms.includes("web")) {
    queries.push(
      { lane: "audience", query: `${base} audience customers reviews discussion` },
      { lane: "useCase", query: `${base} use case case study application` },
      { lane: "commercial", query: `${base} price distributor where to buy procurement` },
      { lane: "timingSaturation", query: `${market} ${trend} market growth report 2025` },
      { lane: "brandSafety", query: `${product} ${market} regulation safety risk ban policy` },
      { lane: "competitor", query: `${competitorText} ${market} ${trend} campaign` }
    );
  }

  if (platforms.includes("reddit")) {
    queries.push({ lane: "audience", query: `${base} site:reddit.com` });
  }
  if (platforms.includes("x")) {
    queries.push({ lane: "audience", query: `${base} site:x.com OR site:twitter.com` });
  }
  if (platforms.includes("xiaohongshu") || platforms.includes("youtube")) {
    const siteFilters = [
      platforms.includes("xiaohongshu") ? "site:xiaohongshu.com" : null,
      platforms.includes("youtube") ? "site:youtube.com" : null
    ].filter(Boolean);
    queries.push({ lane: "audience", query: `${base} ${siteFilters.join(" OR ")}` });
  }

  return queries;
}

function urlHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function inferSourceSignals(result: ResearchSearchResult): SourceSignal[] {
  const host = urlHost(result.url);
  const text = `${result.title} ${result.snippet}`.toLowerCase();

  if (host.endsWith("reddit.com") || host.endsWith("x.com") || host.endsWith("twitter.com") || host.endsWith("xiaohongshu.com") || host.endsWith("youtube.com") || host.endsWith("tiktok.com")) {
    return ["single_social_thread"];
  }
  if (host.includes("apnews.com") || host.includes("reuters.com") || host.includes("bloomberg.com") || host.includes("businessinsider.com") || host.includes("cnbc.com") || host.includes("theguardian.com") || host.includes("ft.com") || host.includes("wired.com") || host.includes("techcrunch.com")) {
    return ["reputable_journalism"];
  }
  if (host.includes(".gov") || text.includes("regulation") || text.includes("policy") || text.includes("market report") || text.includes("research")) {
    return ["research_report"];
  }
  if (result.lane === "competitor") {
    return ["direct_competitor_campaign"];
  }
  if (host.includes("dji.com") || host.includes("autel") || host.includes("skydio") || host.includes("parrot")) {
    return ["vendor_copy"];
  }
  return ["unknown"];
}

function resultToCandidate(result: ResearchSearchResult, index: number): EvidenceCandidate {
  const spec = LANE_TO_CANDIDATE[result.lane];
  const sourceSignals = inferSourceSignals(result);

  return {
    id: `research-${result.lane}-${index + 1}`,
    dimension: spec.dimension,
    direction: spec.direction,
    magnitude: spec.magnitude,
    desiredConfidence: spec.confidence,
    sourceUrl: result.url,
    verificationStatus: "unverified",
    sourceSignals,
    note: `${result.title}. ${result.snippet} Search query: ${result.query}.`
  };
}

function normalizeResults(results: ResearchSearchResult[]): ResearchSearchResult[] {
  const seen = new Set<string>();
  const normalized: ResearchSearchResult[] = [];

  for (const result of results) {
    if (!result.url || seen.has(result.url)) continue;
    seen.add(result.url);
    normalized.push(result);
  }

  return normalized;
}

function buildCaseId(product: string, market: string, trend: string): string {
  return [slug(product), slug(market), compactTrendForId(trend)].filter(Boolean).join("_");
}

function isProviderFindingSource(provider: ResearchSource | ProviderFindingSource): provider is ProviderFindingSource {
  return "collect" in provider;
}

function buildCliInput(input: EvidenceCaseResearchInput, providerResult: ProviderFindingResult): EvidenceCaseCliInput {
  const caseId = buildCaseId(input.product, input.market, input.trend);
  const title = `${input.product} x ${input.trend} in ${input.market}`;
  const searchResultCandidates = normalizeResults(providerResult.searchResults ?? []).map(resultToCandidate);

  return {
    id: `${caseId}_evidence`,
    caseId,
    researchDate: input.researchDate ?? todayIso(),
    riskTolerance: input.riskTolerance,
    profileUsed: input.profileUsed ?? "default",
    baselineScores: input.baselineScores ?? defaultBaselineScores(input.profileUsed),
    tooling: providerResult.tooling ?? `evidence:case:research (${input.provider ? "custom provider" : "web provider"})`,
    customerResearchFindings: providerResult.customerResearchFindings,
    seoKeywordFindings: providerResult.seoKeywordFindings,
    competitorResearchFindings: providerResult.competitorResearchFindings,
    additionalCandidates: [
      ...searchResultCandidates,
      ...(providerResult.additionalCandidates ?? [])
    ],
    report: {
      title,
      productName: input.product,
      trendName: input.trend,
      recommendation: "这份简报由搜索结果自动生成，只适合作为第一轮判断。后续应继续补充平台原始数据、本地渠道数据和转化证据。",
      nextEvidence: [
        "用 Reddit、X、YouTube、TikTok、小红书、评价或访谈里的原始用户语言，替换宽泛搜索结果。",
        "补充 Google Trends、SEO 关键词或站内搜索导出，验证需求时机和购买意图。",
        "补充竞品部署、本地渠道页、政策文件，以及负面反馈或安全风险证据。"
      ]
    }
  };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseDuckDuckGoResults(html: string, query: ResearchQuery, limit: number): ResearchSearchResult[] {
  const results: ResearchSearchResult[] = [];
  const blockPattern = /<div class="result[^"]*"[\s\S]*?<\/div>\s*<\/div>/g;
  const blocks = html.match(blockPattern) ?? [];

  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ?? block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);
    const rawUrl = decodeHtml(linkMatch[1]);
    const redirected = rawUrl.match(/[?&]uddg=([^&]+)/);
    const url = redirected ? decodeURIComponent(redirected[1]) : rawUrl;

    results.push({
      lane: query.lane,
      query: query.query,
      title: stripTags(linkMatch[2]),
      url,
      snippet: snippetMatch ? stripTags(snippetMatch[1]) : ""
    });

    if (results.length >= limit) break;
  }

  return results;
}

export class DuckDuckGoResearchSource implements ResearchSource {
  async search(queries: ResearchQuery[], options: { limitPerQuery: number }): Promise<ResearchSearchResult[]> {
    const allResults: ResearchSearchResult[] = [];

    for (const query of queries) {
      const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query.query)}`;
      const response = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 evidence-case-research/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Search failed for "${query.query}": ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      allResults.push(...parseDuckDuckGoResults(html, query, options.limitPerQuery));
    }

    return allResults;
  }
}

export class FixtureResearchSource implements ResearchSource {
  constructor(private readonly fixturePath: string) {}

  async search(): Promise<ResearchSearchResult[]> {
    const absolutePath = path.resolve(this.fixturePath);
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as ResearchSearchResult[];
  }
}

export async function runEvidenceCaseResearch(input: EvidenceCaseResearchInput): Promise<EvidenceCaseResearchResult> {
  const queries = buildResearchQueries({
    product: input.product,
    market: input.market,
    trend: input.trend,
    competitors: input.competitors,
    platforms: input.platforms
  });
  const provider = input.provider ?? new DuckDuckGoResearchSource();
  const limitPerQuery = input.limitPerQuery ?? 2;
  const providerResult = isProviderFindingSource(provider)
    ? await provider.collect({
        product: input.product,
        market: input.market,
        trend: input.trend,
        queries,
        limitPerQuery
      })
    : {
        searchResults: await provider.search(queries, { limitPerQuery }),
        tooling: "evidence:case:research (web provider)"
      };
  const searchResults = normalizeResults(providerResult.searchResults ?? []);
  const cliInput = buildCliInput(input, {
    ...providerResult,
    searchResults
  });
  const fileResult = writeEvidenceCaseFiles(cliInput, {
    dataDir: input.dataDir,
    outputDir: input.outputDir
  });

  return {
    queries,
    searchResults,
    input: cliInput,
    fileResult
  };
}
