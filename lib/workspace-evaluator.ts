import { adjustScores, type EvidenceAdjustment, type EvidenceItem } from "./evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  type GatedRecommendation,
  type WeightProfile
} from "./recommendation-rigor";
import { buildTrendShortlist, type RankedTrendShortlistRow, type TrendShortlistResult } from "./trend-shortlist";
import type { RiskTolerance, ScoreKey, Scores, ScoringResult } from "./types";

export type WorkspaceProduct = {
  name: string;
  category: string;
  market: string;
  audience: string;
  positioning: string;
  sellingPoints: string;
  brandTone: string;
  riskTolerance: RiskTolerance;
  profileUsed: WeightProfile;
};

export type WorkspaceCandidate = {
  id: string;
  trendName: string;
  trendDescription: string;
  scores: Scores;
  evidence?: EvidenceItem[];
  oneLineVerdict?: string;
  recommendedCampaign?: string;
};

export type SingleWorkspaceTrendResult = {
  baselineResult: ScoringResult;
  adjustment: EvidenceAdjustment;
  adjustedResult: ScoringResult;
  rigor: GatedRecommendation;
};

export type WorkspaceEvidenceGap = {
  slot: string;
  label: string;
  severity: "blocking" | "advisory";
  reason: string;
  providerHint: string;
};

const DIMENSION_LABELS: Record<string, string> = {
  audienceOverlap: "Audience overlap",
  useCaseRelevance: "Use-case relevance",
  messageBridge: "Message bridge",
  creativeFeasibility: "Creative feasibility",
  commercialIntent: "Commercial intent",
  brandSafety: "Brand safety",
  timingSaturation: "Timing & saturation",
  audienceOrUseCase: "Audience or use-case"
};

const PROVIDER_HINTS: Record<string, string> = {
  audienceOverlap: "Use raw social language from Reddit, X, TikTok, Xiaohongshu, YouTube comments, reviews, or interviews.",
  useCaseRelevance: "Use customer comments, creator content examples, reviews, or directly observed competitor campaigns.",
  audienceOrUseCase: "Use raw social language or direct customer/competitor examples that prove the audience or use case is real.",
  messageBridge: "Use competitor campaign examples, creator scripts, landing pages, or review language that bridges trend language to the selling point.",
  creativeFeasibility: "Use creator examples, existing brand assets, platform-native formats, or directly observed competitor content.",
  commercialIntent: "Use search/gift intent, marketplace queries, where-to-buy comments, reviews, distributor pages, or SEO demand data.",
  brandSafety: "Use policy checks, safety/news coverage, backlash scans, and platform/community sentiment before upgrading the recommendation.",
  timingSaturation: "Use Google Trends / SEO timeseries, platform volume, creator saturation, and competitor activity recency."
};

function formatScoreBlock(scores: Scores): string {
  return Object.entries(scores)
    .map(([key, value]) => `- ${DIMENSION_LABELS[key] ?? key}: ${value}`)
    .join("\n");
}

function providerHintFor(slot: string): string {
  return PROVIDER_HINTS[slot] ?? "Add non-proxy evidence from a provider before upgrading this recommendation.";
}

export function buildWorkspaceEvidenceGaps(rigor: GatedRecommendation): WorkspaceEvidenceGap[] {
  const missing = rigor.gateMissing.map((slot): WorkspaceEvidenceGap => ({
    slot,
    label: DIMENSION_LABELS[slot] ?? slot,
    severity: "blocking",
    reason: "Required Strong Go gate evidence is missing.",
    providerHint: providerHintFor(slot)
  }));
  const caps = rigor.dimensionCaps.map((dimension): WorkspaceEvidenceGap => ({
    slot: dimension,
    label: DIMENSION_LABELS[dimension],
    severity: "advisory",
    reason: "This dimension is scored above 75 but lacks non-proxy evidence.",
    providerHint: providerHintFor(dimension)
  }));

  if (missing.length === 0 && caps.length === 0 && rigor.recommendationStability === "fragile") {
    return [
      {
        slot: "stability",
        label: "Recommendation stability",
        severity: "advisory",
        reason: "The recommendation is near a band edge or sensitive to one unsupported anchor step.",
        providerHint: "Run a small controlled test or add one high-signal provider result before increasing budget."
      }
    ];
  }

  return [...missing, ...caps];
}

export function evaluateSingleWorkspaceTrend(
  product: WorkspaceProduct,
  candidate: WorkspaceCandidate
): SingleWorkspaceTrendResult {
  const evidence = candidate.evidence ?? [];
  const baselineResult = calculateTrendFitWithProfile(
    candidate.scores,
    product.riskTolerance,
    product.profileUsed
  );
  const adjustment = adjustScores(candidate.scores, evidence);
  const adjustedResult = calculateTrendFitWithProfile(
    adjustment.adjusted,
    product.riskTolerance,
    product.profileUsed
  );
  const rigor = applyRecommendationRigor({
    scores: adjustment.adjusted,
    result: adjustedResult,
    profile: product.profileUsed,
    evidence
  });

  return {
    baselineResult,
    adjustment,
    adjustedResult,
    rigor
  };
}

export function evaluateWorkspaceShortlist(
  product: WorkspaceProduct,
  candidates: WorkspaceCandidate[]
): TrendShortlistResult {
  return buildTrendShortlist({
    id: `${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_workspace_shortlist`,
    productName: product.name,
    profileUsed: product.profileUsed,
    riskTolerance: product.riskTolerance,
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      trendName: candidate.trendName,
      trendDescription: candidate.trendDescription,
      baselineScores: candidate.scores,
      evidence: candidate.evidence,
      oneLineVerdict: candidate.oneLineVerdict ?? "Use this row as a working trend-fit hypothesis.",
      recommendedCampaign: candidate.recommendedCampaign
    }))
  });
}

function evidenceGapMarkdown(gaps: WorkspaceEvidenceGap[]): string {
  if (gaps.length === 0) return "- No immediate evidence gaps.";
  return gaps
    .map((gap) => `- ${gap.label} (${gap.severity}): ${gap.reason} ${gap.providerHint}`)
    .join("\n");
}

export function renderSingleWorkspaceMarkdown({
  product,
  candidate,
  result
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  result: SingleWorkspaceTrendResult;
}): string {
  const gaps = buildWorkspaceEvidenceGaps(result.rigor);

  return [
    "# Trend-Fit Workspace Memo",
    "",
    `Product: ${product.name}`,
    `Market: ${product.market}`,
    `Trend: ${candidate.trendName}`,
    `Profile: ${product.profileUsed}`,
    "",
    "## Recommendation",
    "",
    `- Baseline score: ${result.baselineResult.total}/100`,
    `- Evidence-adjusted score: ${result.adjustedResult.total}/100`,
    `- Gated band: ${result.rigor.gatedBand}`,
    `- Evidence gate: ${result.rigor.evidenceGate}`,
    `- Stability: ${result.rigor.recommendationStability}`,
    `- Decision type: ${result.rigor.decisionType}`,
    "",
    "## Scores",
    "",
    formatScoreBlock(result.adjustment.adjusted),
    "",
    "## Evidence gaps",
    "",
    evidenceGapMarkdown(gaps),
    "",
    "## Next validation action",
    "",
    result.rigor.nextValidationAction
  ].join("\n");
}

function shortlistRowMarkdown(row: RankedTrendShortlistRow): string {
  return `| ${row.rank} | ${row.trendName} | ${row.adjustedResult.total} | ${row.rigor.gatedBand} | ${row.rigor.evidenceGate} | ${row.rigor.recommendationStability} | ${row.rigor.decisionType} |`;
}

export function renderShortlistWorkspaceMarkdown({
  product,
  shortlist
}: {
  product: WorkspaceProduct;
  shortlist: TrendShortlistResult;
}): string {
  const winnerGaps = buildWorkspaceEvidenceGaps(shortlist.winner.rigor);

  return [
    "# Trend Shortlist Workspace Report",
    "",
    `Product: ${product.name}`,
    `Market: ${product.market}`,
    `Profile: ${product.profileUsed}`,
    `Winner: ${shortlist.winner.trendName}`,
    "",
    "| Rank | Trend | Adj score | Gated band | Gate | Stability | Decision |",
    "|------|-------|-----------|------------|------|-----------|----------|",
    ...shortlist.rows.map(shortlistRowMarkdown),
    "",
    "## Why the winner leads",
    "",
    `${shortlist.winner.trendName} leads because it has the strongest gated recommendation after the evidence gate and stability checks are applied.`,
    "",
    "## Evidence gaps for winner",
    "",
    evidenceGapMarkdown(winnerGaps),
    "",
    "## Next validation action",
    "",
    shortlist.winner.rigor.nextValidationAction
  ].join("\n");
}
