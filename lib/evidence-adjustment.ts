import { ALLOWED_SCORE_VALUES } from "./scoring";
import { SCORE_KEYS, type Band, type ScoreKey, type Scores } from "./types";

export type EvidenceDirection = "up" | "down" | "confirm";
export type EvidenceMagnitude = "weak" | "moderate" | "strong";
export type EvidenceConfidence = "low" | "medium" | "high";
export type SourceTier = "primary" | "secondary" | "proxy";
export type EvidenceUse = "context" | "decision";

export type DimensionConfidenceLabel =
  | "assumption"
  | `evidence-confirmed (${EvidenceConfidence})`
  | `evidence-revised (${EvidenceConfidence})`;

export type EvidenceItem = {
  id: string;
  evidenceUse?: EvidenceUse;
  canonicalSourceId?: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  confidence: EvidenceConfidence;
  sourceTier: SourceTier;
  sourceUrl: string;
  note: string;
};

export type EvidenceAdjustment = {
  adjusted: Scores;
  confidenceByDimension: Record<ScoreKey, DimensionConfidenceLabel>;
  netByDimension: Record<ScoreKey, number>;
  stepsByDimension: Record<ScoreKey, number>;
};

export type EvidenceAdjustmentCase = {
  id: string;
  case: string;
  researchDate: string;
  tooling: string;
  baselineScores: Scores;
  evidence: EvidenceItem[];
  expectedAdjustedScores: Scores;
  expectedAdjustedTotal: number;
  expectedAdjustedBand: Band;
  profileUsed?: string;
  expectedEvidenceGate?: string;
  expectedGatedBand?: Band;
  expectedGateMissing?: string[];
  expectedDimensionCaps?: ScoreKey[];
  expectedStability?: string;
  expectedDecisionType?: string;
  expectedDimensionConfidence: Record<ScoreKey, DimensionConfidenceLabel>;
};

const MAGNITUDE_WEIGHT: Record<EvidenceMagnitude, number> = {
  weak: 1,
  moderate: 2,
  strong: 3
};

const CONFIDENCE_WEIGHT: Record<EvidenceConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3
};

const CONFIDENCE_FROM_WEIGHT: Record<number, EvidenceConfidence> = {
  1: "low",
  2: "medium",
  3: "high"
};

const ANCHORS = ALLOWED_SCORE_VALUES;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function effectiveConfidenceWeight(item: EvidenceItem): number {
  const confidence = CONFIDENCE_WEIGHT[item.confidence];
  return item.sourceTier === "proxy" ? Math.min(confidence, CONFIDENCE_WEIGHT.medium) : confidence;
}

function evidencePressure(item: EvidenceItem): number {
  if (item.direction === "confirm") return 0;

  const direction = item.direction === "up" ? 1 : -1;
  const magnitude = MAGNITUDE_WEIGHT[item.magnitude];
  const confidence = effectiveConfidenceWeight(item);
  const sourceWeight = item.sourceTier === "proxy" ? 0.5 : 1;

  return direction * magnitude * confidence * sourceWeight;
}

function stepsFromNet(net: number): number {
  const abs = Math.abs(net);
  if (abs < 4) return 0;
  if (abs < 9) return 1;
  return 2;
}

function adjustAnchor(score: Scores[ScoreKey], net: number): Scores[ScoreKey] {
  const index = ANCHORS.indexOf(score);
  const steps = stepsFromNet(net);
  const nextIndex = clamp(index + Math.sign(net) * steps, 0, ANCHORS.length - 1);
  return ANCHORS[nextIndex];
}

function confidenceLabel(items: EvidenceItem[], steps: number): DimensionConfidenceLabel {
  if (items.length === 0) return "assumption";

  const maxConfidence = Math.max(...items.map(effectiveConfidenceWeight));
  const confidence = CONFIDENCE_FROM_WEIGHT[maxConfidence];
  return steps === 0 ? `evidence-confirmed (${confidence})` : `evidence-revised (${confidence})`;
}

export function adjustScores(baseline: Scores, evidence: EvidenceItem[]): EvidenceAdjustment {
  const adjusted = { ...baseline };
  const confidenceByDimension = {} as Record<ScoreKey, DimensionConfidenceLabel>;
  const netByDimension = {} as Record<ScoreKey, number>;
  const stepsByDimension = {} as Record<ScoreKey, number>;

  for (const key of SCORE_KEYS) {
    const items = evidence.filter((item) => item.dimension === key && item.evidenceUse !== "context");
    const net = items.reduce((sum, item) => sum + evidencePressure(item), 0);
    const steps = stepsFromNet(net);

    adjusted[key] = adjustAnchor(baseline[key], net);
    confidenceByDimension[key] = confidenceLabel(items, steps);
    netByDimension[key] = net;
    stepsByDimension[key] = Math.sign(net) * steps;
  }

  return {
    adjusted,
    confidenceByDimension,
    netByDimension,
    stepsByDimension
  };
}

export function getMeanEvidenceConfidence(
  confidenceByDimension: Record<ScoreKey, DimensionConfidenceLabel>
): number {
  const values: number[] = SCORE_KEYS.map((key) => {
    const label = confidenceByDimension[key];
    if (label.includes("(high)")) return 3;
    if (label.includes("(medium)")) return 2;
    if (label.includes("(low)")) return 1;
    return 0;
  });

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
