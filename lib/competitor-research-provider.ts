import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceMagnitude
} from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
import type { SourceSignal, VerificationStatus } from "./source-tier-classifier";
import type { ScoreKey } from "./types";

export type CompetitorResearchOrigin = "competitor-profiling" | "product-swipefile" | "manual";

export type CompetitorFindingType =
  | "same_audience"
  | "competitor_used_trend"
  | "competitor_content_angle"
  | "competitor_backlash"
  | "where_to_buy_comments"
  | "saturated_competitor_activity";

export type CompetitorResearchSourceType =
  | "vendor_copy"
  | "direct_competitor_campaign"
  | "comment_corpus"
  | "reputable_journalism"
  | "unknown";

export type CompetitorResearchFinding = {
  id: string;
  competitorName: string;
  competitorUrl: string;
  origin: CompetitorResearchOrigin;
  findingType: CompetitorFindingType;
  sourceType: CompetitorResearchSourceType;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  confidence: EvidenceConfidence;
  intensity: EvidenceMagnitude;
  quote?: string;
  note: string;
};

export type CompetitorProfileExtract = {
  competitorName: string;
  competitorUrl: string;
  origin: CompetitorResearchOrigin;
  sourceUrl: string;
  targetAudience?: string;
  onTrend?: string;
  contentAngle?: string;
  backlashQuote?: string;
  whereToBuyQuote?: string;
  saturationRead?: string;
};

const FINDING_TO_EVIDENCE: Record<
  CompetitorFindingType,
  {
    dimension: ScoreKey;
    direction: EvidenceDirection;
    defaultMagnitude: EvidenceMagnitude;
  }
> = {
  same_audience: {
    dimension: "audienceOverlap",
    direction: "confirm",
    defaultMagnitude: "weak"
  },
  competitor_used_trend: {
    dimension: "useCaseRelevance",
    direction: "confirm",
    defaultMagnitude: "moderate"
  },
  competitor_content_angle: {
    dimension: "messageBridge",
    direction: "confirm",
    defaultMagnitude: "moderate"
  },
  competitor_backlash: {
    dimension: "brandSafety",
    direction: "down",
    defaultMagnitude: "moderate"
  },
  where_to_buy_comments: {
    dimension: "commercialIntent",
    direction: "up",
    defaultMagnitude: "moderate"
  },
  saturated_competitor_activity: {
    dimension: "timingSaturation",
    direction: "down",
    defaultMagnitude: "strong"
  }
};

const SOURCE_TYPE_SIGNALS: Record<CompetitorResearchSourceType, SourceSignal[]> = {
  vendor_copy: ["vendor_copy"],
  direct_competitor_campaign: ["direct_competitor_campaign"],
  comment_corpus: ["comment_corpus"],
  reputable_journalism: ["reputable_journalism"],
  unknown: ["unknown"]
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function formatFindingNote(finding: CompetitorResearchFinding): string {
  const parts = [
    `Competitor: ${finding.competitorName}.`,
    `Origin: ${finding.origin}.`,
    finding.note
  ];
  if (finding.quote) {
    parts.push(`Quote: "${finding.quote}"`);
  }
  return parts.join(" ");
}

export function competitorResearchFindingsToCandidates(
  findings: CompetitorResearchFinding[]
): EvidenceCandidate[] {
  return findings.map((finding) => {
    const evidence = FINDING_TO_EVIDENCE[finding.findingType];
    return {
      id: finding.id,
      dimension: evidence.dimension,
      direction: evidence.direction,
      magnitude: finding.intensity ?? evidence.defaultMagnitude,
      desiredConfidence: finding.confidence,
      sourceUrl: finding.sourceUrl,
      verificationStatus: finding.verificationStatus,
      sourceSignals: SOURCE_TYPE_SIGNALS[finding.sourceType],
      note: formatFindingNote(finding)
    };
  });
}

function extractFindingBase(extract: CompetitorProfileExtract): Pick<
  CompetitorResearchFinding,
  "competitorName" | "competitorUrl" | "origin" | "sourceUrl" | "verificationStatus"
> {
  return {
    competitorName: extract.competitorName,
    competitorUrl: extract.competitorUrl,
    origin: extract.origin,
    sourceUrl: extract.sourceUrl,
    verificationStatus: "verified"
  };
}

export function competitorProfileExtractsToFindings(
  extracts: CompetitorProfileExtract[]
): CompetitorResearchFinding[] {
  const findings: CompetitorResearchFinding[] = [];

  for (const extract of extracts) {
    const prefix = slug(extract.competitorName);
    const base = extractFindingBase(extract);

    if (extract.targetAudience) {
      findings.push({
        ...base,
        id: `${prefix}-same-audience`,
        findingType: "same_audience",
        sourceType: "vendor_copy",
        confidence: "medium",
        intensity: "weak",
        quote: extract.targetAudience,
        note: "Competitor positioning names an audience adjacent to the product's target."
      });
    }

    if (extract.onTrend) {
      findings.push({
        ...base,
        id: `${prefix}-competitor-used-trend`,
        findingType: "competitor_used_trend",
        sourceType: "direct_competitor_campaign",
        confidence: "high",
        intensity: "moderate",
        quote: extract.onTrend,
        note: "Competitor directly uses the trend or an equivalent campaign format."
      });
    }

    if (extract.contentAngle) {
      findings.push({
        ...base,
        id: `${prefix}-competitor-content-angle`,
        findingType: "competitor_content_angle",
        sourceType: "direct_competitor_campaign",
        confidence: "high",
        intensity: "moderate",
        quote: extract.contentAngle,
        note: "Competitor campaign reveals a usable content or message bridge."
      });
    }

    if (extract.saturationRead) {
      findings.push({
        ...base,
        id: `${prefix}-saturated-competitor-activity`,
        findingType: "saturated_competitor_activity",
        sourceType: "direct_competitor_campaign",
        confidence: "high",
        intensity: "strong",
        quote: extract.saturationRead,
        note: "Competitor activity suggests saturation or crowding risk."
      });
    }

    if (extract.backlashQuote) {
      findings.push({
        ...base,
        id: `${prefix}-competitor-backlash`,
        findingType: "competitor_backlash",
        sourceType: "reputable_journalism",
        confidence: "medium",
        intensity: "moderate",
        quote: extract.backlashQuote,
        note: "Competitor coverage or review language shows backlash risk."
      });
    }

    if (extract.whereToBuyQuote) {
      findings.push({
        ...base,
        id: `${prefix}-where-to-buy-comments`,
        findingType: "where_to_buy_comments",
        sourceType: "comment_corpus",
        confidence: "medium",
        intensity: "moderate",
        quote: extract.whereToBuyQuote,
        note: "Competitor comments or reviews show purchase or workflow evaluation intent."
      });
    }
  }

  return findings;
}
