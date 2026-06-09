import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceMagnitude
} from "./evidence-adjustment";
import type { EvidenceCandidate } from "./evidence-collector";
import type { SourceSignal, VerificationStatus } from "./source-tier-classifier";
import type { ScoreKey } from "./types";

export type CustomerResearchTheme =
  | "audience_language"
  | "use_case_language"
  | "commercial_intent"
  | "brand_safety_concern";

export type CustomerResearchSourceType =
  | "reddit_thread"
  | "forum_thread"
  | "youtube_comments"
  | "app_store_reviews"
  | "review_corpus"
  | "survey_responses"
  | "interview_transcript"
  | "support_tickets"
  | "unknown";

export type CustomerResearchFinding = {
  id: string;
  theme: CustomerResearchTheme;
  sourceType: CustomerResearchSourceType;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  confidence: EvidenceConfidence;
  intensity: EvidenceMagnitude;
  quote?: string;
  context?: string;
  note: string;
};

const THEME_TO_EVIDENCE: Record<
  CustomerResearchTheme,
  { dimension: ScoreKey; direction: EvidenceDirection }
> = {
  audience_language: {
    dimension: "audienceOverlap",
    direction: "confirm"
  },
  use_case_language: {
    dimension: "useCaseRelevance",
    direction: "confirm"
  },
  commercial_intent: {
    dimension: "commercialIntent",
    direction: "up"
  },
  brand_safety_concern: {
    dimension: "brandSafety",
    direction: "down"
  }
};

const SOURCE_TYPE_SIGNALS: Record<CustomerResearchSourceType, SourceSignal[]> = {
  reddit_thread: ["single_social_thread"],
  forum_thread: ["single_social_thread"],
  youtube_comments: ["comment_corpus"],
  app_store_reviews: ["comment_corpus"],
  review_corpus: ["comment_corpus"],
  survey_responses: ["comment_corpus"],
  interview_transcript: ["comment_corpus"],
  support_tickets: ["comment_corpus"],
  unknown: ["unknown"]
};

function formatFindingNote(finding: CustomerResearchFinding): string {
  const parts = [finding.note];
  if (finding.quote) {
    parts.push(`Quote: "${finding.quote}"`);
  }
  if (finding.context) {
    parts.push(`Context: ${finding.context}`);
  }
  return parts.join(" ");
}

export function customerResearchFindingsToCandidates(
  findings: CustomerResearchFinding[]
): EvidenceCandidate[] {
  return findings.map((finding) => {
    const evidence = THEME_TO_EVIDENCE[finding.theme];
    return {
      id: finding.id,
      dimension: evidence.dimension,
      direction: evidence.direction,
      magnitude: finding.intensity,
      desiredConfidence: finding.confidence,
      sourceUrl: finding.sourceUrl,
      verificationStatus: finding.verificationStatus,
      sourceSignals: SOURCE_TYPE_SIGNALS[finding.sourceType],
      note: formatFindingNote(finding)
    };
  });
}
