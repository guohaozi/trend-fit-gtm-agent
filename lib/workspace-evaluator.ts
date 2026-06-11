import {
  adjustScores,
  type EvidenceAdjustment,
  type EvidenceConfidence,
  type EvidenceDirection,
  type EvidenceItem,
  type EvidenceMagnitude,
  type SourceTier
} from "./evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  type GatedRecommendation,
  type WeightProfile
} from "./recommendation-rigor";
import {
  clampEvidenceConfidence,
  classifySourceTier,
  type SourceSignal,
  type SourceTierClassification,
  type VerificationStatus
} from "./source-tier-classifier";
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
  evidenceRows?: WorkspaceEvidenceRow[];
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

export type WorkspaceProviderSlot = WorkspaceEvidenceGap & {
  plannedSources: string[];
};

export type WorkspaceProviderCommand = {
  label: string;
  command: string;
  description: string;
};

export type WorkspaceProviderPreview = {
  targetTrend: string;
  targetedSlots: WorkspaceProviderSlot[];
  dryRunCommand: WorkspaceProviderCommand;
  fixtureCommand: WorkspaceProviderCommand;
  commandsText: string;
  notes: string[];
};

export type WorkspaceEvidenceRow = {
  id: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  desiredConfidence: EvidenceConfidence;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  sourceSignals: SourceSignal[];
  note: string;
};

export type ComputedWorkspaceEvidenceRow = WorkspaceEvidenceRow & {
  computedSourceTier: SourceTier | null;
  computedConfidence: EvidenceConfidence | null;
  classification: SourceTierClassification;
};

export type WorkspaceEvidenceMaterialization = {
  rows: ComputedWorkspaceEvidenceRow[];
  evidence: EvidenceItem[];
  droppedRows: ComputedWorkspaceEvidenceRow[];
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

const PROVIDER_SOURCES: Record<string, string[]> = {
  audienceOverlap: ["Reddit / YouTube / X raw language", "Customer reviews or marketplace Q&A"],
  useCaseRelevance: ["Creator examples and customer comments", "Competitor campaign or product-use examples"],
  audienceOrUseCase: ["Reddit / YouTube / X raw language", "Customer reviews, marketplace Q&A, or competitor usage examples"],
  messageBridge: ["Competitor campaign pages", "Creator scripts, landing pages, or review language"],
  creativeFeasibility: ["Creator content examples", "Existing brand assets or directly observed competitor creative"],
  commercialIntent: ["Where-to-buy and price queries", "Marketplace reviews, distributor pages, or SEO demand data"],
  brandSafety: ["Policy, news, and backlash scan via Google", "Reddit / X sentiment and community safety checks"],
  timingSaturation: ["Google Trends / SEO timeseries", "Recent platform volume, creator saturation, and competitor recency"],
  stability: ["One high-signal source for the most sensitive unsupported dimension", "Small controlled test result"]
};

const SLOT_PLATFORMS: Record<string, string[]> = {
  audienceOverlap: ["reddit", "youtube", "twitter"],
  useCaseRelevance: ["reddit", "youtube", "twitter"],
  audienceOrUseCase: ["reddit", "youtube", "twitter"],
  messageBridge: ["google", "youtube"],
  creativeFeasibility: ["youtube", "google"],
  commercialIntent: ["google", "reddit"],
  brandSafety: ["google", "reddit", "twitter"],
  timingSaturation: ["google", "youtube"],
  stability: ["google", "reddit"]
};

function defaultSignalsForTier(sourceTier: SourceTier): SourceSignal[] {
  if (sourceTier === "primary") return ["direct_competitor_campaign"];
  if (sourceTier === "secondary") return ["reputable_journalism"];
  return ["unknown"];
}

export function buildWorkspaceEvidenceRowsFromEvidence(evidence: EvidenceItem[]): WorkspaceEvidenceRow[] {
  return evidence.map((item) => ({
    id: item.id,
    dimension: item.dimension,
    direction: item.direction,
    magnitude: item.magnitude,
    desiredConfidence: item.confidence,
    sourceUrl: item.sourceUrl,
    verificationStatus: "verified",
    sourceSignals: defaultSignalsForTier(item.sourceTier),
    note: item.note
  }));
}

export function materializeWorkspaceEvidenceRows(
  rows: WorkspaceEvidenceRow[]
): WorkspaceEvidenceMaterialization {
  const computedRows: ComputedWorkspaceEvidenceRow[] = rows.map((row) => {
    const classification = classifySourceTier({
      sourceUrl: row.sourceUrl,
      dimension: row.dimension,
      verificationStatus: row.verificationStatus,
      sourceSignals: row.sourceSignals
    });
    return {
      ...row,
      computedSourceTier: classification.sourceTier,
      computedConfidence:
        classification.action === "keep" && classification.sourceTier
          ? clampEvidenceConfidence(row.desiredConfidence, classification.maxConfidence)
          : null,
      classification
    };
  });
  const evidence = computedRows.flatMap((row): EvidenceItem[] => {
    if (row.classification.action === "drop" || row.computedSourceTier === null || row.computedConfidence === null) {
      return [];
    }

    return [
      {
        id: row.id,
        dimension: row.dimension,
        direction: row.direction,
        magnitude: row.magnitude,
        confidence: row.computedConfidence,
        sourceTier: row.computedSourceTier,
        sourceUrl: row.sourceUrl,
        note: row.note
      }
    ];
  });

  return {
    rows: computedRows,
    evidence,
    droppedRows: computedRows.filter((row) => row.classification.action === "drop")
  };
}

function evidenceForWorkspaceCandidate(candidate: WorkspaceCandidate): EvidenceItem[] {
  return candidate.evidenceRows ? materializeWorkspaceEvidenceRows(candidate.evidenceRows).evidence : candidate.evidence ?? [];
}

function formatScoreBlock(scores: Scores): string {
  return Object.entries(scores)
    .map(([key, value]) => `- ${DIMENSION_LABELS[key] ?? key}: ${value}`)
    .join("\n");
}

function providerHintFor(slot: string): string {
  return PROVIDER_HINTS[slot] ?? "Add non-proxy evidence from a provider before upgrading this recommendation.";
}

function shellQuote(value: string): string {
  return `"${value.replace(/["\\$`]/g, "\\$&")}"`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function platformsForGaps(gaps: WorkspaceEvidenceGap[]): string[] {
  const platforms = gaps.flatMap((gap) => SLOT_PLATFORMS[gap.slot] ?? ["google"]);
  return unique(platforms.length > 0 ? platforms : ["reddit", "youtube", "twitter", "google"]);
}

function activeResearchCommand({
  product,
  candidate,
  platforms,
  dryRun
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  platforms: string[];
  dryRun: boolean;
}): string {
  return [
    "npm run evidence:case:research --",
    "--product",
    shellQuote(product.name),
    "--market",
    shellQuote(product.market),
    "--trend",
    shellQuote(candidate.trendName),
    "--risk",
    product.riskTolerance,
    "--profile",
    product.profileUsed,
    "--provider",
    "opencli",
    "--platforms",
    platforms.join(","),
    "--limit",
    "3",
    dryRun ? "--dry-run-provider-commands" : ""
  ].filter(Boolean).join(" ");
}

function fixtureSmokeCommand(): string {
  return [
    "npm run evidence:case:research --",
    "--product",
    shellQuote("DJI drones"),
    "--market",
    shellQuote("UAE Saudi Middle East"),
    "--trend",
    shellQuote("video creation security inspection tourism enablement"),
    "--risk",
    "high",
    "--profile",
    "b2b_pipeline",
    "--fixture-results",
    "examples/dji-middle-east-search-results.fixture.json",
    "--limit",
    "3"
  ].join(" ");
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

export function buildWorkspaceProviderPreview({
  product,
  candidate,
  gaps,
  mode
}: {
  product: WorkspaceProduct;
  candidate: WorkspaceCandidate;
  gaps: WorkspaceEvidenceGap[];
  mode: "single" | "shortlist";
}): WorkspaceProviderPreview {
  const targetedSlots = gaps.map((gap) => ({
    ...gap,
    plannedSources: PROVIDER_SOURCES[gap.slot] ?? ["Provider result normalized into EvidenceCandidate[]"]
  }));
  const platforms = platformsForGaps(gaps);
  const dryRunCommand: WorkspaceProviderCommand = {
    label: "Dry-run current trend",
    command: activeResearchCommand({ product, candidate, platforms, dryRun: true }),
    description: "Prints the OpenCLI commands for this product, market, trend, and evidence-gap set without executing live collection."
  };
  const fixtureCommand: WorkspaceProviderCommand = {
    label: "Portable fixture smoke",
    command: fixtureSmokeCommand(),
    description: "Runs the committed fixture through the evidence-case pipeline so the provider contract can be demonstrated on any machine."
  };
  const commandsText = [dryRunCommand.command, fixtureCommand.command].join("\n\n");

  return {
    targetTrend: candidate.trendName,
    targetedSlots,
    dryRunCommand,
    fixtureCommand,
    commandsText,
    notes: [
      mode === "shortlist"
        ? "Shortlist mode previews the provider plan for the current winning trend."
        : "Single-trend mode previews the provider plan for the active trend.",
      "OpenCLI should be resolved from --opencli-bin, OPENCLI_BIN, or PATH; the runtime no longer depends on a user-specific default path.",
      "Provider output becomes candidate evidence only. Source tier remains classifier-owned and is not editable in the workspace."
    ]
  };
}

export function evaluateSingleWorkspaceTrend(
  product: WorkspaceProduct,
  candidate: WorkspaceCandidate
): SingleWorkspaceTrendResult {
  const evidence = evidenceForWorkspaceCandidate(candidate);
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
      evidence: evidenceForWorkspaceCandidate(candidate),
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
