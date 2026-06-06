import { calculateTrendFit, getBand, type ScoreWeights } from "./scoring";
import { SCORE_KEYS, type Band, type RiskTolerance, type ScoreKey, type Scores, type ScoringResult } from "./types";
import type { EvidenceItem } from "./evidence-adjustment";

export type WeightProfile =
  | "default"
  | "brand_awareness"
  | "ecommerce_conversion"
  | "b2b_pipeline"
  | "creator_seeding"
  | "risk_sensitive";

export type EvidenceGate = "pass" | "partial" | "fail";
export type RecommendationStability = "stable" | "moderate" | "fragile";
export type DecisionType =
  | "No-go"
  | "observe"
  | "small test"
  | "creator seeding"
  | "organic push"
  | "paid push";

export const PROFILE_OPTIONS: Array<{
  id: WeightProfile;
  label: string;
  description: string;
}> = [
  {
    id: "default",
    label: "默认平衡",
    description: "保持冻结 demo 的通用 GTM 判断权重。"
  },
  {
    id: "brand_awareness",
    label: "品牌声量",
    description: "提高内容可执行性和时机权重，适合做认知曝光。"
  },
  {
    id: "ecommerce_conversion",
    label: "电商转化",
    description: "提高商业意图权重，要求更强购买证据。"
  },
  {
    id: "b2b_pipeline",
    label: "B2B 线索",
    description: "提高受众、场景和卖点桥接权重，弱化内容形式。"
  },
  {
    id: "creator_seeding",
    label: "达人种草",
    description: "提高内容可执行性和时机权重，适合先跑创作者验证。"
  },
  {
    id: "risk_sensitive",
    label: "风险敏感",
    description: "显著提高品牌安全权重，适合高声誉风险品牌。"
  }
];

export type GatedRecommendation = {
  profileUsed: WeightProfile;
  evidenceGate: EvidenceGate;
  gateMissing: string[];
  gatedBand: Band;
  dimensionCaps: ScoreKey[];
  recommendationStability: RecommendationStability;
  decisionType: DecisionType;
  nextValidationAction: string;
};

export const WEIGHT_PROFILES = {
  default: {
    audienceOverlap: 0.2,
    useCaseRelevance: 0.2,
    messageBridge: 0.15,
    creativeFeasibility: 0.15,
    commercialIntent: 0.1,
    brandSafety: 0.1,
    timingSaturation: 0.1
  },
  brand_awareness: {
    audienceOverlap: 0.2,
    useCaseRelevance: 0.15,
    messageBridge: 0.15,
    creativeFeasibility: 0.2,
    commercialIntent: 0.05,
    brandSafety: 0.1,
    timingSaturation: 0.15
  },
  ecommerce_conversion: {
    audienceOverlap: 0.2,
    useCaseRelevance: 0.15,
    messageBridge: 0.15,
    creativeFeasibility: 0.1,
    commercialIntent: 0.2,
    brandSafety: 0.1,
    timingSaturation: 0.1
  },
  b2b_pipeline: {
    audienceOverlap: 0.25,
    useCaseRelevance: 0.2,
    messageBridge: 0.2,
    creativeFeasibility: 0.05,
    commercialIntent: 0.15,
    brandSafety: 0.1,
    timingSaturation: 0.05
  },
  creator_seeding: {
    audienceOverlap: 0.2,
    useCaseRelevance: 0.15,
    messageBridge: 0.1,
    creativeFeasibility: 0.25,
    commercialIntent: 0.05,
    brandSafety: 0.1,
    timingSaturation: 0.15
  },
  risk_sensitive: {
    audienceOverlap: 0.15,
    useCaseRelevance: 0.15,
    messageBridge: 0.1,
    creativeFeasibility: 0.1,
    commercialIntent: 0.1,
    brandSafety: 0.25,
    timingSaturation: 0.15
  }
} as const satisfies Record<WeightProfile, ScoreWeights>;

export function isWeightProfile(value: unknown): value is WeightProfile {
  return typeof value === "string" && value in WEIGHT_PROFILES;
}

export function normalizeWeightProfile(value?: string | null): WeightProfile {
  return isWeightProfile(value) ? value : "default";
}

const BAND_ORDER: Band[] = ["No-go", "Weak fit", "Cautious test", "Go", "Strong Go"];
const BAND_THRESHOLDS = [40, 55, 70, 85];
const CAP_REQUIRED_DIMS: ScoreKey[] = [
  "audienceOverlap",
  "creativeFeasibility",
  "commercialIntent",
  "timingSaturation"
];
const DIMENSION_LABELS: Record<ScoreKey, string> = {
  audienceOverlap: "受众重合度",
  useCaseRelevance: "使用场景相关性",
  messageBridge: "卖点桥接",
  creativeFeasibility: "内容可执行性",
  commercialIntent: "商业意图",
  brandSafety: "品牌安全",
  timingSaturation: "时机与饱和度"
};

export function calculateTrendFitWithProfile(
  scores: Scores,
  riskTolerance: RiskTolerance,
  profile: WeightProfile,
  options: { qualifier?: string | null } = {}
): ScoringResult {
  return calculateTrendFit(scores, riskTolerance, {
    ...options,
    weights: WEIGHT_PROFILES[profile]
  });
}

function hasNonProxyEvidence(evidence: EvidenceItem[], dimension: ScoreKey): boolean {
  return evidence.some(
    (item) => item.dimension === dimension && (item.sourceTier === "primary" || item.sourceTier === "secondary")
  );
}

function getDimensionCaps(scores: Scores, evidence: EvidenceItem[]): ScoreKey[] {
  return CAP_REQUIRED_DIMS.filter((dimension) => scores[dimension] > 75 && !hasNonProxyEvidence(evidence, dimension));
}

function downgradeOneBand(band: Band): Band {
  const index = BAND_ORDER.indexOf(band);
  return BAND_ORDER[Math.max(0, index - 1)];
}

function requiredGateSlots(profile: WeightProfile): string[] {
  const slots = ["timingSaturation", "brandSafety", "audienceOrUseCase"];
  if (profile === "ecommerce_conversion" || profile === "b2b_pipeline") {
    slots.push("commercialIntent");
  }
  return slots;
}

function missingGateSlots(profile: WeightProfile, evidence: EvidenceItem[]): string[] {
  return requiredGateSlots(profile).filter((slot) => {
    if (slot === "audienceOrUseCase") {
      return !hasNonProxyEvidence(evidence, "audienceOverlap") && !hasNonProxyEvidence(evidence, "useCaseRelevance");
    }
    return !hasNonProxyEvidence(evidence, slot as ScoreKey);
  });
}

function evidenceGateFromMissing(profile: WeightProfile, missing: string[]): EvidenceGate {
  if (missing.length === 0) return "pass";
  if (missing.length === requiredGateSlots(profile).length) return "fail";
  return "partial";
}

function marginToBandEdge(total: number): number {
  return Math.min(...BAND_THRESHOLDS.map((threshold) => Math.abs(total - threshold)));
}

function scoreOneStepDown(scores: Scores, dimension: ScoreKey): Scores {
  const anchors = [0, 25, 50, 75, 100] as const;
  const index = anchors.indexOf(scores[dimension]);
  return {
    ...scores,
    [dimension]: anchors[Math.max(0, index - 1)]
  };
}

function canFlipDownBand(scores: Scores, result: ScoringResult, profile: WeightProfile, evidence: EvidenceItem[]): boolean {
  return SCORE_KEYS.some((dimension) => {
    if (hasNonProxyEvidence(evidence, dimension)) return false;
    if (scores[dimension] === 0) return false;
    const downTotal = calculateTrendFitWithProfile(scoreOneStepDown(scores, dimension), "medium", profile).total;
    return getBand(downTotal) !== result.recommendation.rawBand;
  });
}

function recommendationStability(
  scores: Scores,
  result: ScoringResult,
  profile: WeightProfile,
  evidence: EvidenceItem[],
  gate: EvidenceGate,
  dimensionCaps: ScoreKey[]
): RecommendationStability {
  const margin = marginToBandEdge(result.total);
  const flipsOnUnsupported = canFlipDownBand(scores, result, profile, evidence);

  if (gate === "fail" || margin <= 3 || dimensionCaps.length > 0 || flipsOnUnsupported) {
    return "fragile";
  }

  if (margin <= 8) return "moderate";
  return "stable";
}

function decisionTypeFor(band: Band, stability: RecommendationStability, evidence: EvidenceItem[]): DecisionType {
  if (band === "No-go") return "No-go";
  if (band === "Weak fit") return "observe";
  if (band === "Cautious test") return "small test";
  if (band === "Go") {
    if (stability === "fragile") return "small test";
    return hasNonProxyEvidence(evidence, "commercialIntent") && stability === "stable" ? "organic push" : "creator seeding";
  }
  if (stability === "fragile") return "organic push";
  return hasNonProxyEvidence(evidence, "commercialIntent") && stability === "stable" ? "paid push" : "organic push";
}

function nextValidationAction(missing: string[], dimensionCaps: ScoreKey[]): string {
  const target = missing[0] ?? dimensionCaps[0];
  if (!target) return "先做小规模可控测试，观察表现后再决定是否放大预算。";
  if (target === "audienceOrUseCase") {
    return "补充非 proxy 的受众或使用场景证据，例如真实竞品 campaign、评论语料、用户评价或平台数据。";
  }
  return `补充 ${DIMENSION_LABELS[target as ScoreKey] ?? target} 的非 proxy 证据后，再升级推荐等级。`;
}

export function applyRecommendationRigor({
  scores,
  result,
  profile,
  evidence = []
}: {
  scores: Scores;
  result: ScoringResult;
  profile: WeightProfile;
  evidence?: EvidenceItem[];
}): GatedRecommendation {
  const gateMissing = missingGateSlots(profile, evidence);
  const evidenceGate = evidenceGateFromMissing(profile, gateMissing);
  const gatedBand =
    result.recommendation.finalBand === "Strong Go" && evidenceGate !== "pass"
      ? downgradeOneBand(result.recommendation.finalBand)
      : result.recommendation.finalBand;
  const dimensionCaps = getDimensionCaps(scores, evidence);
  const stability = recommendationStability(scores, result, profile, evidence, evidenceGate, dimensionCaps);

  return {
    profileUsed: profile,
    evidenceGate,
    gateMissing,
    gatedBand,
    dimensionCaps,
    recommendationStability: stability,
    decisionType: decisionTypeFor(gatedBand, stability, evidence),
    nextValidationAction: nextValidationAction(gateMissing, dimensionCaps)
  };
}
