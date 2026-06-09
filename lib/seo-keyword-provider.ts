import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceMagnitude
} from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
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

function formatNote(finding: SeoKeywordFinding): string {
  const details = [
    finding.note,
    `Google Trends query: ${finding.query}.`,
    finding.growthLabel ? `Growth: ${finding.growthLabel}.` : "",
    typeof finding.changePct === "number" ? `Change: ${finding.changePct}%.` : ""
  ].filter(Boolean);
  return details.join(" ");
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
