import {
  SCORE_KEYS,
  type Band,
  type Recommendation,
  type RiskTolerance,
  type Scores,
  type ScoreValue,
  type ScoringResult
} from "./types";

export const ALLOWED_SCORE_VALUES = [0, 25, 50, 75, 100] as const satisfies readonly ScoreValue[];

export const WEIGHTS = {
  audienceOverlap: 0.2,
  useCaseRelevance: 0.2,
  messageBridge: 0.15,
  creativeFeasibility: 0.15,
  commercialIntent: 0.1,
  brandSafety: 0.1,
  timingSaturation: 0.1
} as const satisfies Record<keyof Scores, number>;

export type ScoreWeights = Record<keyof Scores, number>;

const BAND_RANK: Record<Band, number> = {
  "No-go": 0,
  "Weak fit": 1,
  "Cautious test": 2,
  Go: 3,
  "Strong Go": 4
};

export function isAllowedScore(value: unknown): value is ScoreValue {
  return ALLOWED_SCORE_VALUES.includes(value as ScoreValue);
}

export function displayScore(raw: number): number {
  return Math.floor(raw + 0.5);
}

export function getBand(displayTotal: number): Band {
  if (displayTotal >= 85) return "Strong Go";
  if (displayTotal >= 70) return "Go";
  if (displayTotal >= 55) return "Cautious test";
  if (displayTotal >= 40) return "Weak fit";
  return "No-go";
}

function capBand(band: Band, cap: Band): Band {
  return BAND_RANK[band] > BAND_RANK[cap] ? cap : band;
}

export function validateScores(scores: Scores): void {
  for (const key of SCORE_KEYS) {
    if (!isAllowedScore(scores[key])) {
      throw new Error(`${key} must be one of ${ALLOWED_SCORE_VALUES.join(", ")}`);
    }
  }
}

export function applyOverrides(
  rawBand: Band,
  scores: Scores,
  riskTolerance: RiskTolerance,
  qualifier: string | null = null
): Recommendation {
  if (riskTolerance === "low" && scores.brandSafety < 50) {
    return {
      rawBand,
      finalBand: "No-go",
      overrideReason: "Forced No-go because low risk tolerance cannot accept Brand Safety below 50.",
      qualifier
    };
  }

  if (scores.brandSafety <= 25) {
    return {
      rawBand,
      finalBand: capBand(rawBand, "Cautious test"),
      overrideReason: "Capped at Cautious test because Brand Safety is 25 or lower.",
      qualifier
    };
  }

  if (scores.audienceOverlap <= 25 && scores.useCaseRelevance <= 25) {
    return {
      rawBand,
      finalBand: capBand(rawBand, "Weak fit"),
      overrideReason: "Capped at Weak fit because both audience and use-case fit are weak.",
      qualifier
    };
  }

  return {
    rawBand,
    finalBand: rawBand,
    overrideReason: null,
    qualifier
  };
}

export function calculateTrendFit(
  scores: Scores,
  riskTolerance: RiskTolerance,
  options: { qualifier?: string | null; weights?: ScoreWeights } = {}
): ScoringResult {
  validateScores(scores);
  const weights = options.weights ?? WEIGHTS;

  const weightedScores = SCORE_KEYS.reduce(
    (acc, key) => {
      acc[key] = scores[key] * weights[key];
      return acc;
    },
    {} as Record<keyof Scores, number>
  );

  const totalRaw = SCORE_KEYS.reduce((sum, key) => sum + weightedScores[key], 0);
  const total = displayScore(totalRaw);
  const rawBand = getBand(total);

  return {
    totalRaw,
    total,
    weights,
    weightedScores,
    recommendation: applyOverrides(rawBand, scores, riskTolerance, options.qualifier ?? null)
  };
}
