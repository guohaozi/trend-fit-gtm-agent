export const SCORE_KEYS = [
  "audienceOverlap",
  "useCaseRelevance",
  "messageBridge",
  "creativeFeasibility",
  "commercialIntent",
  "brandSafety",
  "timingSaturation"
] as const;

export type ScoreKey = (typeof SCORE_KEYS)[number];
export type ScoreValue = 0 | 25 | 50 | 75 | 100;
export type RiskTolerance = "low" | "medium" | "high";
export type Band = "Strong Go" | "Go" | "Cautious test" | "Weak fit" | "No-go";

export type Scores = Record<ScoreKey, ScoreValue>;

export type Product = {
  name: string;
  category: string;
  targetMarket: string[];
  audience: string;
  priceRange: string;
  positioning: string;
  sellingPoints: string[];
  brandTone: string;
  competitors: string[];
  campaignGoal: string;
  riskTolerance: RiskTolerance;
};

export type Trend = {
  name: string;
  platform: string;
  region: string;
  description: string;
  drivenBy: string;
  format: string;
  whyPopular: string;
  exampleContent: string;
  controversy: string;
};

export type Recommendation = {
  rawBand: Band;
  finalBand: Band;
  overrideReason: string | null;
  qualifier: string | null;
};

export type ScoringResult = {
  totalRaw: number;
  total: number;
  recommendation: Recommendation;
  weights: Record<ScoreKey, number>;
  weightedScores: Record<ScoreKey, number>;
};

export type DemoCase = {
  id: string;
  product: Product;
  trend: Trend;
  scores: Scores;
  expectedTotal: number;
  expectedBand: Band;
  expectedFinalBand: Band;
  expectedQualifier: string | null;
  overrideReason: string | null;
  profileUsed?: string;
  expectedEvidenceGate?: string;
  expectedGatedBand?: Band;
  expectedGateMissing?: string[];
  expectedDimensionCaps?: ScoreKey[];
  expectedStability?: string;
  expectedDecisionType?: string;
};
