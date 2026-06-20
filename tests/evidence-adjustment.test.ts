import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  adjustScores,
  getMeanEvidenceConfidence,
  type EvidenceAdjustmentCase,
  type EvidenceItem
} from "../lib/evidence-adjustment";
import { calculateTrendFitWithProfile } from "../lib/recommendation-rigor";
import { calculateTrendFit } from "../lib/scoring";
import type { Scores } from "../lib/types";

const dataDir = path.join(process.cwd(), "data");

function readEvidenceCase(fileName: string): EvidenceAdjustmentCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as EvidenceAdjustmentCase;
}

describe("evidence adjustment model", () => {
  it("recomputes the fashion evidence case from 90 to 88 without off-anchor scores", () => {
    const evidenceCase = readEvidenceCase("demo_fashion_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
  });

  it("returns per-dimension confidence labels matching the structured evidence case", () => {
    const evidenceCase = readEvidenceCase("demo_fashion_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);

    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the AI tool evidence case with brand-safety risk revised down", () => {
    const evidenceCase = readEvidenceCase("demo_ai_tool_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the AI tool competitor-layer case with saturation and brand-safety pressure", () => {
    const evidenceCase = readEvidenceCase("demo_ai_tool_competitor_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the snack evidence case with saturation revised down", () => {
    const evidenceCase = readEvidenceCase("demo_snack_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the protein drink evidence case with audience and commercial intent revised up", () => {
    const evidenceCase = readEvidenceCase("demo_protein_drink_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the SAVAS China evidence case as a guarded Go", () => {
    const evidenceCase = readEvidenceCase("savas_china_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the OBgE China evidence case as a guarded Go", () => {
    const evidenceCase = readEvidenceCase("obge_china_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "high");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the Anker Europe evidence case as a fragile Strong Go", () => {
    const evidenceCase = readEvidenceCase("anker_europe_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFit(adjustment.adjusted, "medium");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the Japan service robot evidence case with the B2B profile", () => {
    const evidenceCase = readEvidenceCase("service_robot_japan_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "high", "b2b_pipeline");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the POP MART Middle East evidence case with the brand-awareness profile", () => {
    const evidenceCase = readEvidenceCase("popmart_middle_east_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "high", "brand_awareness");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the Thailand EV evidence case with the ecommerce-conversion profile", () => {
    const evidenceCase = readEvidenceCase("thailand_ev_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "high", "ecommerce_conversion");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("recomputes the LatAm gaming peripherals evidence case with the ecommerce-conversion profile", () => {
    const evidenceCase = readEvidenceCase("latam_gaming_peripherals_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);
    const result = calculateTrendFitWithProfile(adjustment.adjusted, "high", "ecommerce_conversion");

    assert.deepEqual(adjustment.adjusted, evidenceCase.expectedAdjustedScores);
    assert.equal(result.total, evidenceCase.expectedAdjustedTotal);
    assert.equal(result.recommendation.finalBand, evidenceCase.expectedAdjustedBand);
    assert.deepEqual(adjustment.confidenceByDimension, evidenceCase.expectedDimensionConfidence);
  });

  it("prevents proxy-only evidence from moving a dimension by two anchor steps", () => {
    const baseline: Scores = {
      audienceOverlap: 75,
      useCaseRelevance: 75,
      messageBridge: 75,
      creativeFeasibility: 75,
      commercialIntent: 75,
      brandSafety: 75,
      timingSaturation: 75
    };
    const proxyEvidence: EvidenceItem[] = [
      {
        id: "proxy-1",
        dimension: "timingSaturation",
        direction: "down",
        magnitude: "strong",
        confidence: "high",
        sourceTier: "proxy",
        sourceUrl: "https://example.com/listicle-1",
        note: "Proxy signal one."
      },
      {
        id: "proxy-2",
        dimension: "timingSaturation",
        direction: "down",
        magnitude: "strong",
        confidence: "high",
        sourceTier: "proxy",
        sourceUrl: "https://example.com/listicle-2",
        note: "Proxy signal two."
      }
    ];

    const adjustment = adjustScores(baseline, proxyEvidence);

    assert.equal(adjustment.adjusted.timingSaturation, 50);
  });

  it("does not let context-only snippets move or confirm a score", () => {
    const baseline: Scores = {
      audienceOverlap: 75,
      useCaseRelevance: 75,
      messageBridge: 75,
      creativeFeasibility: 75,
      commercialIntent: 75,
      brandSafety: 75,
      timingSaturation: 75
    };
    const contextEvidence: EvidenceItem[] = [{
      id: "raw-discussion",
      evidenceUse: "context",
      dimension: "audienceOverlap",
      direction: "down",
      magnitude: "strong",
      confidence: "high",
      sourceTier: "primary",
      sourceUrl: "https://example.com/post",
      note: "Raw text has not been semantically judged."
    }];

    const adjustment = adjustScores(baseline, contextEvidence);
    assert.equal(adjustment.adjusted.audienceOverlap, 75);
    assert.equal(adjustment.netByDimension.audienceOverlap, 0);
    assert.equal(adjustment.confidenceByDimension.audienceOverlap, "assumption");
  });

  it("computes mean confidence as a ranking signal without rewarding assumptions", () => {
    const evidenceCase = readEvidenceCase("demo_fashion_evidence.json");
    const adjustment = adjustScores(evidenceCase.baselineScores, evidenceCase.evidence);

    assert.equal(getMeanEvidenceConfidence(adjustment.confidenceByDimension), 13 / 7);
  });
});
