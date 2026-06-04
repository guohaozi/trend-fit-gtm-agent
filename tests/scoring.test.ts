import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  ALLOWED_SCORE_VALUES,
  applyOverrides,
  calculateTrendFit,
  getBand,
  isAllowedScore
} from "../lib/scoring";
import type { DemoCase, Scores } from "../lib/types";

const dataDir = path.join(process.cwd(), "data");

function readDemo(fileName: string): DemoCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as DemoCase;
}

describe("Trend-Fit scoring contract", () => {
  const demos = [
    ["demo_fashion.json", 90, "Strong Go", null],
    ["demo_robotics.json", 74, "Go", "trust-building angle"],
    ["demo_ai_tool.json", 89, "Strong Go", null]
  ] as const;

  for (const [fileName, total, band, qualifier] of demos) {
    it(`${fileName} computes the frozen total and recommendation`, () => {
      const demo = readDemo(fileName);
      const result = calculateTrendFit(demo.scores, demo.product.riskTolerance, {
        qualifier: demo.expectedQualifier
      });

      assert.equal(result.total, total);
      assert.equal(result.total, demo.expectedTotal);
      assert.equal(result.recommendation.rawBand, band);
      assert.equal(result.recommendation.finalBand, demo.expectedFinalBand);
      assert.equal(result.recommendation.qualifier, qualifier);
      assert.equal(result.recommendation.overrideReason, demo.overrideReason);
    });
  }

  it("rejects off-anchor score values", () => {
    assert.deepEqual(ALLOWED_SCORE_VALUES, [0, 25, 50, 75, 100]);
    assert.equal(isAllowedScore(75), true);
    assert.equal(isAllowedScore(85), false);

    const invalidScores = {
      ...readDemo("demo_fashion.json").scores,
      timingSaturation: 85
    } as unknown as Scores;

    assert.throws(
      () => calculateTrendFit(invalidScores, "medium"),
      /timingSaturation must be one of 0, 25, 50, 75, 100/
    );
  });

  it("caps high-scoring risky trends at Cautious test when brand safety is 25 or lower", () => {
    const scores: Scores = {
      audienceOverlap: 100,
      useCaseRelevance: 100,
      messageBridge: 100,
      creativeFeasibility: 100,
      commercialIntent: 100,
      brandSafety: 25,
      timingSaturation: 100
    };

    const result = calculateTrendFit(scores, "high");

    assert.equal(result.recommendation.rawBand, "Strong Go");
    assert.equal(result.recommendation.finalBand, "Cautious test");
    assert.match(result.recommendation.overrideReason ?? "", /Brand Safety/);
  });

  it("forces No-go for low risk tolerance when brand safety is below 50", () => {
    const scores: Scores = {
      audienceOverlap: 100,
      useCaseRelevance: 100,
      messageBridge: 100,
      creativeFeasibility: 100,
      commercialIntent: 100,
      brandSafety: 25,
      timingSaturation: 100
    };

    const result = calculateTrendFit(scores, "low");

    assert.equal(result.recommendation.finalBand, "No-go");
    assert.match(result.recommendation.overrideReason ?? "", /low risk tolerance/);
  });

  it("caps weak audience and use-case fit at Weak fit", () => {
    const scores: Scores = {
      audienceOverlap: 25,
      useCaseRelevance: 25,
      messageBridge: 100,
      creativeFeasibility: 100,
      commercialIntent: 100,
      brandSafety: 100,
      timingSaturation: 100
    };

    const result = calculateTrendFit(scores, "medium");

    assert.equal(getBand(result.total), "Go");
    assert.equal(result.recommendation.finalBand, "Weak fit");
    assert.match(result.recommendation.overrideReason ?? "", /audience and use-case/);
  });

  it("applies the strongest override when more than one rule fires", () => {
    const result = applyOverrides(
      "Strong Go",
      {
        audienceOverlap: 25,
        useCaseRelevance: 25,
        messageBridge: 100,
        creativeFeasibility: 100,
        commercialIntent: 100,
        brandSafety: 25,
        timingSaturation: 100
      },
      "low"
    );

    assert.equal(result.finalBand, "No-go");
    assert.match(result.overrideReason ?? "", /low risk tolerance/);
  });
});
