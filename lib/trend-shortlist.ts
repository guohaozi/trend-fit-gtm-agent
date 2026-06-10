import { adjustScores, getMeanEvidenceConfidence, type EvidenceAdjustment, type EvidenceItem } from "./evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  type GatedRecommendation,
  type RecommendationStability,
  type WeightProfile
} from "./recommendation-rigor";
import type { Band, RiskTolerance, Scores, ScoringResult } from "./types";

export type TrendShortlistCandidateInput = {
  id: string;
  trendName: string;
  trendDescription?: string;
  baselineScores: Scores;
  evidence?: EvidenceItem[];
  oneLineVerdict: string;
  recommendedCampaign?: string;
};

export type TrendShortlistInput = {
  id: string;
  productName: string;
  profileUsed: WeightProfile;
  riskTolerance: RiskTolerance;
  generatedAt?: string;
  candidates: TrendShortlistCandidateInput[];
};

export type RankedTrendShortlistRow = {
  id: string;
  rank: number;
  trendName: string;
  trendDescription: string | null;
  baselineResult: ScoringResult;
  adjustedScores: Scores;
  adjustedResult: ScoringResult;
  adjustment: EvidenceAdjustment;
  rigor: GatedRecommendation;
  evidenceCount: number;
  meanEvidenceConfidence: number;
  oneLineVerdict: string;
  recommendedCampaign: string | null;
};

export type TrendShortlistResult = {
  id: string;
  productName: string;
  profileUsed: WeightProfile;
  riskTolerance: RiskTolerance;
  generatedAt: string | null;
  rows: RankedTrendShortlistRow[];
  winner: RankedTrendShortlistRow;
};

const BAND_PRIORITY: Record<Band, number> = {
  "No-go": 0,
  "Weak fit": 1,
  "Cautious test": 2,
  Go: 3,
  "Strong Go": 4
};

const STABILITY_PRIORITY: Record<RecommendationStability, number> = {
  fragile: 0,
  moderate: 1,
  stable: 2
};

function compareRows(
  left: RankedTrendShortlistRow,
  right: RankedTrendShortlistRow,
  originalOrder: Map<string, number>
): number {
  const bandDelta = BAND_PRIORITY[right.rigor.gatedBand] - BAND_PRIORITY[left.rigor.gatedBand];
  if (bandDelta !== 0) return bandDelta;

  const totalDelta = right.adjustedResult.total - left.adjustedResult.total;
  if (totalDelta !== 0) return totalDelta;

  const stabilityDelta =
    STABILITY_PRIORITY[right.rigor.recommendationStability] -
    STABILITY_PRIORITY[left.rigor.recommendationStability];
  if (stabilityDelta !== 0) return stabilityDelta;

  const timingDelta = right.adjustedScores.timingSaturation - left.adjustedScores.timingSaturation;
  if (timingDelta !== 0) return timingDelta;

  return (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0);
}

export function buildTrendShortlist(input: TrendShortlistInput): TrendShortlistResult {
  if (input.candidates.length < 2) {
    throw new Error("Trend shortlist requires at least two candidate trends.");
  }

  const originalOrder = new Map(input.candidates.map((candidate, index) => [candidate.id, index]));
  const rows = input.candidates.map((candidate): RankedTrendShortlistRow => {
    const evidence = candidate.evidence ?? [];
    const baselineResult = calculateTrendFitWithProfile(
      candidate.baselineScores,
      input.riskTolerance,
      input.profileUsed
    );
    const adjustment = adjustScores(candidate.baselineScores, evidence);
    const adjustedResult = calculateTrendFitWithProfile(adjustment.adjusted, input.riskTolerance, input.profileUsed);
    const rigor = applyRecommendationRigor({
      scores: adjustment.adjusted,
      result: adjustedResult,
      profile: input.profileUsed,
      evidence
    });

    return {
      id: candidate.id,
      rank: 0,
      trendName: candidate.trendName,
      trendDescription: candidate.trendDescription ?? null,
      baselineResult,
      adjustedScores: adjustment.adjusted,
      adjustedResult,
      adjustment,
      rigor,
      evidenceCount: evidence.length,
      meanEvidenceConfidence: getMeanEvidenceConfidence(adjustment.confidenceByDimension),
      oneLineVerdict: candidate.oneLineVerdict,
      recommendedCampaign: candidate.recommendedCampaign ?? null
    };
  });

  const rankedRows = rows
    .sort((left, right) => compareRows(left, right, originalOrder))
    .map((row, index) => ({
      ...row,
      rank: index + 1
    }));

  return {
    id: input.id,
    productName: input.productName,
    profileUsed: input.profileUsed,
    riskTolerance: input.riskTolerance,
    generatedAt: input.generatedAt ?? null,
    rows: rankedRows,
    winner: rankedRows[0]
  };
}

function markdownTableRow(row: RankedTrendShortlistRow): string {
  return [
    row.rank,
    row.trendName,
    row.adjustedResult.total,
    row.rigor.gatedBand,
    row.rigor.evidenceGate,
    row.rigor.recommendationStability,
    row.rigor.decisionType,
    row.oneLineVerdict
  ].join(" | ");
}

export function renderTrendShortlistMarkdown(shortlist: TrendShortlistResult): string {
  const winner = shortlist.winner;
  const validationLine =
    winner.rigor.evidenceGate !== "pass" || winner.rigor.recommendationStability === "fragile"
      ? `Because the winner is not fully stable, treat this as a controlled ${winner.rigor.decisionType} and prioritize: ${winner.rigor.nextValidationAction}`
      : `The winner can move to ${winner.rigor.decisionType} after the next creative validation pass.`;

  return [
    `# Trend shortlist for ${shortlist.productName}`,
    "",
    `Profile: \`${shortlist.profileUsed}\``,
    shortlist.generatedAt ? `Generated: ${shortlist.generatedAt}` : null,
    "",
    "| Rank | Trend | Adj total | Gated band | Gate | Stability | Decision | One-line verdict |",
    "|------|-------|-----------|------------|------|-----------|----------|------------------|",
    ...shortlist.rows.map((row) => `| ${markdownTableRow(row)} |`),
    "",
    `## Why #1 wins`,
    "",
    `${winner.trendName} ranks first because it keeps the strongest gated recommendation after evidence discipline is applied. ${validationLine}`,
    "",
    `## Recommended campaign - ${winner.trendName}`,
    "",
    winner.recommendedCampaign ?? winner.oneLineVerdict,
    "",
    "## The rest, briefly",
    "",
    ...shortlist.rows.slice(1).map((row) => `- **${row.trendName}** - ${row.oneLineVerdict}`)
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
