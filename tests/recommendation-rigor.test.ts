import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { adjustScores, type EvidenceAdjustmentCase } from "../lib/evidence-adjustment";
import {
  applyRecommendationRigor,
  calculateTrendFitWithProfile,
  WEIGHT_PROFILES,
  type WeightProfile
} from "../lib/recommendation-rigor";
import { calculateTrendFit } from "../lib/scoring";
import type { DemoCase } from "../lib/types";

const dataDir = path.join(process.cwd(), "data");

function readDemo(fileName: string): DemoCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as DemoCase;
}

function readEvidenceCase(fileName: string): EvidenceAdjustmentCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as EvidenceAdjustmentCase;
}

describe("v1.2 recommendation rigor layer", () => {
  it("keeps the default profile identical to the frozen scoring weights", () => {
    const demo = readDemo("demo_fashion.json");
    const defaultResult = calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, "default");
    const frozenResult = calculateTrendFit(demo.scores, demo.product.riskTolerance);

    assert.deepEqual(WEIGHT_PROFILES.default, {
      audienceOverlap: 0.2,
      useCaseRelevance: 0.2,
      messageBridge: 0.15,
      creativeFeasibility: 0.15,
      commercialIntent: 0.1,
      brandSafety: 0.1,
      timingSaturation: 0.1
    });
    assert.equal(defaultResult.total, frozenResult.total);
    assert.equal(defaultResult.recommendation.finalBand, frozenResult.recommendation.finalBand);
  });

  it("calculates every profile with weights that sum to 1.0", () => {
    for (const [profile, weights] of Object.entries(WEIGHT_PROFILES) as Array<[WeightProfile, typeof WEIGHT_PROFILES.default]>) {
      const sum = Object.values(weights).reduce((total, weight) => total + weight, 0);
      assert.equal(Math.round(sum * 100), 100, `${profile} weights must sum to 1.0`);
    }
  });

  it("changes the fashion score under the risk-sensitive profile", () => {
    const demo = readDemo("demo_fashion.json");
    const result = calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, "risk_sensitive");

    assert.equal(result.total, 81);
    assert.equal(result.recommendation.finalBand, "Go");
  });

  it("downgrades assumption-only Strong Go cases to gated Go", () => {
    const demo = readDemo("demo_fashion.json");
    const result = calculateTrendFitWithProfile(demo.scores, demo.product.riskTolerance, "default");
    const rigor = applyRecommendationRigor({
      scores: demo.scores,
      result,
      profile: "default",
      evidence: []
    });

    assert.equal(rigor.evidenceGate, demo.expectedEvidenceGate);
    assert.equal(rigor.gatedBand, demo.expectedGatedBand);
    assert.deepEqual(rigor.gateMissing, demo.expectedGateMissing);
    assert.deepEqual(rigor.dimensionCaps, demo.expectedDimensionCaps);
    assert.equal(rigor.recommendationStability, demo.expectedStability);
    assert.equal(rigor.decisionType, demo.expectedDecisionType);
  });

  it("does not let proxy listicles earn the Strong Go gate", () => {
    const evidenceCase = readEvidenceCase("demo_fashion_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "medium", "default");
    const rigor = applyRecommendationRigor({
      scores: adjustment.adjusted,
      result,
      profile: "default",
      evidence: evidenceCase.evidence
    });

    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.equal(rigor.evidenceGate, evidenceCase.expectedEvidenceGate);
    assert.equal(rigor.gatedBand, evidenceCase.expectedGatedBand);
    assert.deepEqual(rigor.gateMissing, evidenceCase.expectedGateMissing);
    assert.deepEqual(rigor.dimensionCaps, evidenceCase.expectedDimensionCaps);
    assert.equal(rigor.recommendationStability, evidenceCase.expectedStability);
    assert.equal(rigor.decisionType, evidenceCase.expectedDecisionType);
  });

  it("lets the AI tool case keep Strong Go only after non-proxy gate evidence", () => {
    const evidenceCase = readEvidenceCase("demo_ai_tool_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "medium", "default");
    const rigor = applyRecommendationRigor({
      scores: adjustment.adjusted,
      result,
      profile: "default",
      evidence: evidenceCase.evidence
    });

    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.equal(rigor.evidenceGate, evidenceCase.expectedEvidenceGate);
    assert.equal(rigor.gatedBand, evidenceCase.expectedGatedBand);
    assert.deepEqual(rigor.gateMissing, evidenceCase.expectedGateMissing);
    assert.deepEqual(rigor.dimensionCaps, evidenceCase.expectedDimensionCaps);
    assert.equal(rigor.recommendationStability, evidenceCase.expectedStability);
    assert.equal(rigor.decisionType, evidenceCase.expectedDecisionType);
  });

  it("keeps the snack trend as a guarded Go after saturation evidence", () => {
    const evidenceCase = readEvidenceCase("demo_snack_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "medium", "default");
    const rigor = applyRecommendationRigor({
      scores: adjustment.adjusted,
      result,
      profile: "default",
      evidence: evidenceCase.evidence
    });

    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.equal(rigor.evidenceGate, evidenceCase.expectedEvidenceGate);
    assert.equal(rigor.gatedBand, evidenceCase.expectedGatedBand);
    assert.deepEqual(rigor.gateMissing, evidenceCase.expectedGateMissing);
    assert.deepEqual(rigor.dimensionCaps, evidenceCase.expectedDimensionCaps);
    assert.equal(rigor.recommendationStability, evidenceCase.expectedStability);
    assert.equal(rigor.decisionType, evidenceCase.expectedDecisionType);
  });

  it("lets the protein drink case reach Strong Go but keeps it fragile near the threshold", () => {
    const evidenceCase = readEvidenceCase("demo_protein_drink_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "medium", "default");
    const rigor = applyRecommendationRigor({
      scores: adjustment.adjusted,
      result,
      profile: "default",
      evidence: evidenceCase.evidence
    });

    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.equal(rigor.evidenceGate, evidenceCase.expectedEvidenceGate);
    assert.equal(rigor.gatedBand, evidenceCase.expectedGatedBand);
    assert.deepEqual(rigor.gateMissing, evidenceCase.expectedGateMissing);
    assert.deepEqual(rigor.dimensionCaps, evidenceCase.expectedDimensionCaps);
    assert.equal(rigor.recommendationStability, evidenceCase.expectedStability);
    assert.equal(rigor.decisionType, evidenceCase.expectedDecisionType);
  });
});
