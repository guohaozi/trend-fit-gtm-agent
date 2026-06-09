import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceItem,
  EvidenceMagnitude
} from "./evidence-adjustment";
import {
  clampEvidenceConfidence,
  classifySourceTier,
  type SourceSignal,
  type SourceTierClassification,
  type VerificationStatus
} from "./source-tier-classifier";
import type { ScoreKey, Scores } from "./types";

export type EvidenceCandidate = {
  id: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  desiredConfidence: EvidenceConfidence;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  sourceSignals?: SourceSignal[];
  note: string;
};

export type DroppedEvidenceCandidate = {
  id: string;
  sourceUrl: string;
  reasons: string[];
};

export type EvidenceDraft = {
  id: string;
  case: string;
  researchDate: string;
  tooling: string;
  baselineScores: Scores;
  evidence: EvidenceItem[];
  droppedCandidates: DroppedEvidenceCandidate[];
  classifications: Record<string, SourceTierClassification>;
};

export function buildEvidenceDraft({
  id,
  case: caseId,
  researchDate,
  tooling,
  baselineScores,
  candidates
}: {
  id: string;
  case: string;
  researchDate: string;
  tooling: string;
  baselineScores: Scores;
  candidates: EvidenceCandidate[];
}): EvidenceDraft {
  const evidence: EvidenceItem[] = [];
  const droppedCandidates: DroppedEvidenceCandidate[] = [];
  const classifications: Record<string, SourceTierClassification> = {};

  for (const candidate of candidates) {
    const classification = classifySourceTier({
      sourceUrl: candidate.sourceUrl,
      dimension: candidate.dimension,
      verificationStatus: candidate.verificationStatus,
      sourceSignals: candidate.sourceSignals
    });
    classifications[candidate.id] = classification;

    if (classification.action === "drop" || classification.sourceTier === null) {
      droppedCandidates.push({
        id: candidate.id,
        sourceUrl: candidate.sourceUrl,
        reasons: classification.reasons
      });
      continue;
    }

    const confidence = clampEvidenceConfidence(candidate.desiredConfidence, classification.maxConfidence);
    const unverifiedPrefix = candidate.verificationStatus === "unverified" ? "UNVERIFIED: " : "";
    const tierNote = classification.reasons.length > 0 ? ` (${classification.reasons.join("; ")})` : "";

    evidence.push({
      id: candidate.id,
      dimension: candidate.dimension,
      direction: candidate.direction,
      magnitude: candidate.magnitude,
      confidence,
      sourceTier: classification.sourceTier,
      sourceUrl: candidate.sourceUrl,
      note: `${unverifiedPrefix}${candidate.note}${tierNote}`
    });
  }

  return {
    id,
    case: caseId,
    researchDate,
    tooling,
    baselineScores,
    evidence,
    droppedCandidates,
    classifications
  };
}
