import type {
  EvidenceConfidence,
  EvidenceDirection,
  EvidenceItem,
  EvidenceMagnitude,
  EvidenceUse
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
  evidenceUse?: EvidenceUse;
  canonicalSourceId?: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  desiredConfidence: EvidenceConfidence;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  sourceSignals?: SourceSignal[];
  note: string;
};

export type CollectedSnippet = {
  id: string;
  provider: "hackernews" | "gdelt" | "tikhub";
  platform: string;
  query: string;
  text: string;
  sourceUrl: string;
  canonicalSourceId: string;
  verificationStatus: VerificationStatus;
  sourceSignals: readonly SourceSignal[];
};

const MAGNITUDE_RANK: Record<EvidenceMagnitude, number> = {
  weak: 1,
  moderate: 2,
  strong: 3
};

const CONFIDENCE_RANK: Record<EvidenceConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3
};

function strongestCandidate(candidates: EvidenceCandidate[]): EvidenceCandidate {
  return candidates.reduce((strongest, candidate) => {
    const candidateStrength = MAGNITUDE_RANK[candidate.magnitude] * CONFIDENCE_RANK[candidate.desiredConfidence];
    const strongestStrength = MAGNITUDE_RANK[strongest.magnitude] * CONFIDENCE_RANK[strongest.desiredConfidence];
    return candidateStrength > strongestStrength ? candidate : strongest;
  });
}

function collapseSourcePressure(candidates: EvidenceCandidate[]): {
  candidates: EvidenceCandidate[];
  droppedCandidates: DroppedEvidenceCandidate[];
} {
  const groups = new Map<string, EvidenceCandidate[]>();
  for (const candidate of candidates) {
    const sourceId = candidate.canonicalSourceId ?? candidate.sourceUrl;
    const key = `${sourceId}\u0000${candidate.dimension}`;
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  const kept: EvidenceCandidate[] = [];
  const droppedCandidates: DroppedEvidenceCandidate[] = [];

  for (const group of groups.values()) {
    const activeDirections = new Set(
      group.filter((candidate) => candidate.direction !== "confirm").map((candidate) => candidate.direction)
    );
    if (activeDirections.size > 1) {
      droppedCandidates.push(...group.map((candidate) => ({
        id: candidate.id,
        sourceUrl: candidate.sourceUrl,
        reasons: ["conflicting directions from one canonical source"]
      })));
      continue;
    }

    const active = group.filter((candidate) => candidate.direction !== "confirm");
    const eligible = active.length > 0 ? active : group;
    const strongest = strongestCandidate(eligible);
    kept.push(strongest);
    droppedCandidates.push(...group
      .filter((candidate) => candidate !== strongest)
      .map((candidate) => ({
        id: candidate.id,
        sourceUrl: candidate.sourceUrl,
        reasons: ["duplicate pressure from one canonical source"]
      })));
  }

  return { candidates: kept, droppedCandidates };
}

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
  const collapsed = collapseSourcePressure(candidates);
  const droppedCandidates: DroppedEvidenceCandidate[] = [...collapsed.droppedCandidates];
  const classifications: Record<string, SourceTierClassification> = {};

  for (const candidate of collapsed.candidates) {
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
      evidenceUse: candidate.evidenceUse,
      canonicalSourceId: candidate.canonicalSourceId,
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
