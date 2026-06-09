import { adjustScores, type EvidenceAdjustmentCase, type EvidenceItem } from "./evidence-adjustment";
import type { EvidenceDraft } from "./evidence-collector";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  normalizeWeightProfile
} from "./recommendation-rigor";
import type { RiskTolerance, Scores } from "./types";

export type GenerateEvidenceAdjustmentCaseInput = {
  id: string;
  caseId: string;
  researchDate: string;
  tooling: string;
  baselineScores: Scores;
  evidence: EvidenceItem[];
  riskTolerance: RiskTolerance;
  profileUsed?: string | null;
};

export type GenerateEvidenceAdjustmentCaseFromDraftInput = {
  draft: EvidenceDraft;
  riskTolerance: RiskTolerance;
  profileUsed?: string | null;
};

export function generateEvidenceAdjustmentCase({
  id,
  caseId,
  researchDate,
  tooling,
  baselineScores,
  evidence,
  riskTolerance,
  profileUsed
}: GenerateEvidenceAdjustmentCaseInput): EvidenceAdjustmentCase {
  const profile = normalizeWeightProfile(profileUsed);
  const adjustment = adjustScores(baselineScores, evidence);
  const result = calculateTrendFitWithProfile(adjustment.adjusted, riskTolerance, profile);
  const rigor = applyRecommendationRigor({
    scores: adjustment.adjusted,
    result,
    profile,
    evidence
  });

  return {
    id,
    case: caseId,
    researchDate,
    tooling,
    baselineScores,
    evidence,
    expectedAdjustedScores: adjustment.adjusted,
    expectedAdjustedTotal: result.total,
    expectedAdjustedBand: result.recommendation.finalBand,
    profileUsed: profile,
    expectedEvidenceGate: rigor.evidenceGate,
    expectedGatedBand: rigor.gatedBand,
    expectedGateMissing: rigor.gateMissing,
    expectedDimensionCaps: rigor.dimensionCaps,
    expectedStability: rigor.recommendationStability,
    expectedDecisionType: rigor.decisionType,
    expectedDimensionConfidence: adjustment.confidenceByDimension
  };
}

export function generateEvidenceAdjustmentCaseFromDraft({
  draft,
  riskTolerance,
  profileUsed
}: GenerateEvidenceAdjustmentCaseFromDraftInput): EvidenceAdjustmentCase {
  return generateEvidenceAdjustmentCase({
    id: draft.id,
    caseId: draft.case,
    researchDate: draft.researchDate,
    tooling: draft.tooling,
    baselineScores: draft.baselineScores,
    evidence: draft.evidence,
    riskTolerance,
    profileUsed
  });
}
