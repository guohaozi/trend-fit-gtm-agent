import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceMagnitude
} from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
import type { ProviderFindingResult } from "./evidence-case-research-runner";
import type { SourceSignal, VerificationStatus } from "./source-tier-classifier";
import type { ScoreKey } from "./types";

export type SeoKeywordSignal =
  | "breakout_keyword"
  | "high_growth_keyword"
  | "moderate_growth_keyword"
  | "trend_rising"
  | "trend_declining"
  | "trend_saturated"
  | "related_buying_query"
  | "low_search_demand";

export type SeoKeywordFinding = {
  id: string;
  signal: SeoKeywordSignal;
  query: string;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  growthLabel?: string;
  changePct?: number;
  note: string;
};

export type SerpApiRelatedQuery = {
  query?: string;
  formatted_value?: string;
  value?: number;
  extracted_value?: number;
};

export type SerpApiKeywordResearchInput = {
  idPrefix: string;
  sourceUrl: string;
  relatedQueries?: {
    rising?: SerpApiRelatedQuery[];
    top?: SerpApiRelatedQuery[];
  };
  trend?: {
    direction?: "RISING" | "DECLINING" | "STABLE";
    change_pct?: number;
  };
};

const BUYING_QUERY_PATTERN = /\b(buy|price|where to buy|near me|review|reviews|worth it|coupon|discount|best)\b/i;
const RELATED_QUERY_SPAM_PATTERN = /\b(seo|backlink|traffic service|traffic bot|followers|views|plumbing|hvac)\b/i;
const RELATED_QUERY_STOP_WORDS = new Set([
  "and",
  "best",
  "buy",
  "for",
  "how",
  "near",
  "price",
  "review",
  "reviews",
  "the",
  "to",
  "where",
  "with"
]);
const DEFAULT_SERPAPI_DATE = "today 12-m";
const GOOGLE_TRENDS_ENGINE = "google_trends";
const TREND_RISING_THRESHOLD = 15;
const TREND_DECLINING_THRESHOLD = -15;
// Google Trends interest is a 0-100 index. If the peak interest across the window
// is below this, the query has no meaningful demand and any relative change is noise.
const MIN_MEANINGFUL_INTEREST = 5;

type SerpApiDataType = "RELATED_QUERIES" | "TIMESERIES";
type UnknownRecord = Record<string, unknown>;

export type SerpApiFetcher = (url: URL) => Promise<unknown>;

export type SerpApiGoogleTrendsSourceOptions = {
  apiKey?: string;
  geo?: string;
  date?: string;
  fetcher?: SerpApiFetcher;
};

export class SeoKeywordProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeoKeywordProviderError";
  }
}

const SIGNAL_TO_EVIDENCE: Record<
  SeoKeywordSignal,
  {
    dimension: ScoreKey;
    direction: EvidenceDirection;
    magnitude: EvidenceMagnitude;
    confidence: EvidenceConfidence;
    sourceSignals: SourceSignal[];
  }
> = {
  breakout_keyword: {
    dimension: "timingSaturation",
    direction: "up",
    magnitude: "strong",
    confidence: "high",
    sourceSignals: ["research_report"]
  },
  high_growth_keyword: {
    dimension: "timingSaturation",
    direction: "up",
    magnitude: "moderate",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  moderate_growth_keyword: {
    dimension: "timingSaturation",
    direction: "up",
    magnitude: "weak",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  trend_rising: {
    dimension: "timingSaturation",
    direction: "up",
    magnitude: "moderate",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  trend_declining: {
    dimension: "timingSaturation",
    direction: "down",
    magnitude: "moderate",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  trend_saturated: {
    dimension: "timingSaturation",
    direction: "down",
    magnitude: "moderate",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  related_buying_query: {
    dimension: "commercialIntent",
    direction: "up",
    magnitude: "moderate",
    confidence: "medium",
    sourceSignals: ["research_report"]
  },
  low_search_demand: {
    dimension: "commercialIntent",
    direction: "down",
    magnitude: "weak",
    confidence: "medium",
    sourceSignals: ["research_report"]
  }
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parseGrowthPercent(formattedValue: string | undefined): number | null {
  if (!formattedValue?.includes("%")) return null;
  const parsed = Number.parseInt(formattedValue.replace(/[+%,]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function queryTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1 && !RELATED_QUERY_STOP_WORDS.has(token))
  );
}

// A related query can share a real trend token but trail unrelated junk tokens
// (SEO spam like "dubai chocolate caramelbbw emerald ebook cashback code"). Drop it
// when it carries more than this many non-trend tokens.
const MAX_UNRELATED_RELATED_TOKENS = 4;

function isRelevantRelatedQuery(query: string, trendQuery: string): boolean {
  if (RELATED_QUERY_SPAM_PATTERN.test(query)) return false;
  const trendTokens = queryTokens(trendQuery);
  if (trendTokens.size === 0) return true;
  const relatedTokens = queryTokens(query);
  const shared = [...relatedTokens].filter((token) => trendTokens.has(token));
  if (shared.length === 0) return false;
  const unrelated = relatedTokens.size - shared.length;
  return unrelated <= MAX_UNRELATED_RELATED_TOKENS;
}

function formatNote(finding: SeoKeywordFinding): string {
  const details = [
    finding.note,
    `Google Trends query: ${finding.query}.`,
    finding.growthLabel ? `Growth: ${finding.growthLabel}.` : "",
    typeof finding.changePct === "number" ? `Change: ${finding.changePct}%.` : ""
  ].filter(Boolean);
  return details.join(" ");
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[+%,]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeRelatedQuery(value: unknown): SerpApiRelatedQuery | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const query = asString(record.query);
  if (!query) return undefined;

  const formattedValue =
    asString(record.formatted_value) ??
    asString(record.formattedValue) ??
    asString(record.value);

  return {
    query,
    formatted_value: formattedValue,
    value: asNumber(record.value),
    extracted_value: asNumber(record.extracted_value)
  };
}

function extractRelatedQueries(response: unknown): SerpApiKeywordResearchInput["relatedQueries"] {
  const root = asRecord(response);
  const related = asRecord(root?.related_queries);
  return {
    rising: asArray(related?.rising).map(normalizeRelatedQuery).filter((item): item is SerpApiRelatedQuery => Boolean(item)),
    top: asArray(related?.top).map(normalizeRelatedQuery).filter((item): item is SerpApiRelatedQuery => Boolean(item))
  };
}

function extractTimeseriesValues(response: unknown): number[] {
  const root = asRecord(response);
  const interest = asRecord(root?.interest_over_time);
  const rows = asArray(interest?.timeline_data);

  return rows.flatMap((row) => {
    const values = asArray(asRecord(row)?.values);
    const firstValue = asRecord(values[0]);
    const value = asNumber(firstValue?.extracted_value) ?? asNumber(firstValue?.value);
    return typeof value === "number" ? [value] : [];
  });
}

function calculateTrend(values: number[]): SerpApiKeywordResearchInput["trend"] | undefined {
  if (values.length < 2) return undefined;
  // A near-zero peak means the query has effectively no search demand, so a
  // relative change (e.g. a late zero reading producing -100%) is noise, not a
  // real trend. Emit nothing rather than fabricate a declining signal.
  if (Math.max(...values) < MIN_MEANINGFUL_INTEREST) return undefined;
  const midpoint = Math.floor(values.length / 2);
  const previousValues = values.slice(0, midpoint);
  const recentValues = values.slice(midpoint);
  const average = (items: number[]) => items.reduce((sum, item) => sum + item, 0) / items.length;
  const previousAverage = average(previousValues);
  const recentAverage = average(recentValues);
  const rawChange =
    previousAverage === 0
      ? recentAverage > 0
        ? 100
        : 0
      : ((recentAverage - previousAverage) / previousAverage) * 100;
  const changePct = Number(rawChange.toFixed(2));

  if (changePct >= TREND_RISING_THRESHOLD) return { direction: "RISING", change_pct: changePct };
  if (changePct <= TREND_DECLINING_THRESHOLD) return { direction: "DECLINING", change_pct: changePct };
  return { direction: "STABLE", change_pct: changePct };
}

function serpApiReportsNoResults(response: unknown): boolean {
  const error = asRecord(response)?.error;
  return typeof error === "string" && error.trim().length > 0;
}

async function defaultSerpApiFetcher(url: URL): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new SeoKeywordProviderError(`SerpApi Google Trends request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildSerpApiUrl({
  apiKey,
  query,
  dataType,
  geo,
  date
}: {
  apiKey: string;
  query: string;
  dataType: SerpApiDataType;
  geo?: string;
  date: string;
}): URL {
  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", GOOGLE_TRENDS_ENGINE);
  url.searchParams.set("q", query);
  url.searchParams.set("data_type", dataType);
  url.searchParams.set("date", date);
  if (geo) url.searchParams.set("geo", geo);
  url.searchParams.set("api_key", apiKey);
  return url;
}

function redactApiKey(url: URL): string {
  const redacted = new URL(url.toString());
  redacted.searchParams.delete("api_key");
  return redacted.toString();
}

export function seoKeywordFindingsToCandidates(findings: SeoKeywordFinding[]): EvidenceCandidate[] {
  return findings.map((finding) => {
    const evidence = SIGNAL_TO_EVIDENCE[finding.signal];
    return {
      id: finding.id,
      dimension: evidence.dimension,
      direction: evidence.direction,
      magnitude: evidence.magnitude,
      desiredConfidence: evidence.confidence,
      sourceUrl: finding.sourceUrl,
      verificationStatus: finding.verificationStatus,
      sourceSignals: evidence.sourceSignals,
      note: formatNote(finding)
    };
  });
}

export class SerpApiGoogleTrendsSource {
  private readonly apiKey: string;
  private readonly geo?: string;
  private readonly date: string;
  private readonly fetcher: SerpApiFetcher;

  constructor({ apiKey, geo, date = DEFAULT_SERPAPI_DATE, fetcher = defaultSerpApiFetcher }: SerpApiGoogleTrendsSourceOptions = {}) {
    const resolvedApiKey = apiKey ?? process.env.SERPAPI_API_KEY;
    if (!resolvedApiKey) {
      throw new SeoKeywordProviderError("Missing SerpApi key. Set SERPAPI_API_KEY or pass --serpapi-key.");
    }

    this.apiKey = resolvedApiKey;
    this.geo = geo;
    this.date = date;
    this.fetcher = fetcher;
  }

  async collect({
    product,
    market,
    trend
  }: {
    product: string;
    market: string;
    trend: string;
  }): Promise<ProviderFindingResult> {
    // Google Trends measures the relative search interest of a single term, so
    // query the trend itself — not product+market+trend. A long composite string
    // returns no results. Market is expressed through the geo parameter (this.geo),
    // not the query text; product specificity is covered by other dimensions.
    const query = trend.trim() || [product, market].map((value) => value.trim()).filter(Boolean).join(" ");
    const relatedUrl = buildSerpApiUrl({
      apiKey: this.apiKey,
      query,
      dataType: "RELATED_QUERIES",
      geo: this.geo,
      date: this.date
    });
    const timeseriesUrl = buildSerpApiUrl({
      apiKey: this.apiKey,
      query,
      dataType: "TIMESERIES",
      geo: this.geo,
      date: this.date
    });

    const [relatedResponse, timeseriesResponse] = await Promise.all([
      this.fetcher(relatedUrl),
      this.fetcher(timeseriesUrl)
    ]);

    // SerpApi returns an `error` (instead of related_queries) when Google Trends
    // has no results for the query. The interest index is relative, so a sparse
    // long-tail query can still have a late zero reading that calculateTrend would
    // turn into a bogus -100% decline. Treat "no results" as data-insufficient and
    // emit nothing: no data must not become fabricated evidence.
    const noTrendsData = serpApiReportsNoResults(relatedResponse);
    const findings = noTrendsData
      ? []
      : serpApiKeywordResearchToFindings({
          idPrefix: query,
          sourceUrl: redactApiKey(relatedUrl),
          relatedQueries: extractRelatedQueries(relatedResponse),
          trend: calculateTrend(extractTimeseriesValues(timeseriesResponse))
        });

    const result: ProviderFindingResult = {
      seoKeywordFindings: findings,
      tooling: "SerpApi Google Trends"
    };

    if (findings.length === 0) {
      const reason = noTrendsData
        ? "SerpApi reported no Google Trends results"
        : "Google Trends interest was near zero";
      result.notes = [
        `No Google Trends evidence for "${query}": ${reason}. Insufficient search demand is not scored as a declining trend.`
      ];
    }

    return result;
  }
}

function growthSignal(formattedValue: string | undefined): SeoKeywordSignal | null {
  if (formattedValue === "Breakout") return "breakout_keyword";
  const percent = parseGrowthPercent(formattedValue);
  if (percent === null) return null;
  if (percent >= 100) return "high_growth_keyword";
  if (percent >= 50) return "moderate_growth_keyword";
  return null;
}

export function serpApiKeywordResearchToFindings({
  idPrefix,
  sourceUrl,
  relatedQueries,
  trend
}: SerpApiKeywordResearchInput): SeoKeywordFinding[] {
  const findings: SeoKeywordFinding[] = [];
  const safePrefix = slug(idPrefix);
  let breakoutCount = 0;
  let buyingCount = 0;

  for (const item of relatedQueries?.rising ?? []) {
    const query = item.query?.trim();
    if (!query) continue;
    if (!isRelevantRelatedQuery(query, idPrefix)) continue;

    const signal = growthSignal(item.formatted_value);
    if (signal === "breakout_keyword") {
      breakoutCount += 1;
      findings.push({
        id: `${safePrefix}-breakout-${breakoutCount}`,
        signal,
        query,
        sourceUrl,
        verificationStatus: "verified",
        growthLabel: item.formatted_value,
        note: "Related query is marked as breakout growth."
      });
    }

    if (BUYING_QUERY_PATTERN.test(query)) {
      buyingCount += 1;
      findings.push({
        id: `${safePrefix}-buying-${buyingCount}`,
        signal: "related_buying_query",
        query,
        sourceUrl,
        verificationStatus: "verified",
        growthLabel: item.formatted_value,
        note: "Related query contains buying or evaluation language."
      });
    }
  }

  const primaryQuery = relatedQueries?.top?.[0]?.query ?? idPrefix;
  if (trend?.direction === "RISING") {
    findings.push({
      id: `${safePrefix}-rising`,
      signal: "trend_rising",
      query: primaryQuery,
      sourceUrl,
      verificationStatus: "verified",
      changePct: trend.change_pct,
      note: "Timeseries recent average is rising."
    });
  }
  if (trend?.direction === "DECLINING") {
    findings.push({
      id: `${safePrefix}-declining`,
      signal: "trend_declining",
      query: primaryQuery,
      sourceUrl,
      verificationStatus: "verified",
      changePct: trend.change_pct,
      note: "Timeseries recent average is declining."
    });
  }

  return findings;
}
