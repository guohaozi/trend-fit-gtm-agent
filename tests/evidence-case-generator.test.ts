import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCase, generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import type { EvidenceAdjustmentCase } from "../lib/evidence-adjustment";
import type { DemoCase, Scores } from "../lib/types";

const dataDir = path.join(process.cwd(), "data");

function readDemo(fileName: string): DemoCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as DemoCase;
}

function readEvidenceCase(fileName: string): EvidenceAdjustmentCase {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as EvidenceAdjustmentCase;
}

describe("evidence case generator", () => {
  it("generates the computed evidence-case fields from baseline scores and accepted evidence", () => {
    const demo = readDemo("demo_fashion.json");
    const existing = readEvidenceCase("demo_fashion_evidence.json");

    const generated = generateEvidenceAdjustmentCase({
      id: existing.id,
      caseId: existing.case,
      researchDate: existing.researchDate,
      tooling: existing.tooling,
      baselineScores: existing.baselineScores,
      evidence: existing.evidence,
      riskTolerance: demo.product.riskTolerance,
      profileUsed: existing.profileUsed
    });

    assert.deepEqual(generated, existing);
  });

  it("generates an evidence case directly from an evidence draft", () => {
    const baselineScores: Scores = {
      audienceOverlap: 75,
      useCaseRelevance: 75,
      messageBridge: 75,
      creativeFeasibility: 75,
      commercialIntent: 75,
      brandSafety: 75,
      timingSaturation: 75
    };
    const draft = buildEvidenceDraft({
      id: "demo_collect_evidence",
      case: "demo_collect",
      researchDate: "2026-06-09",
      tooling: "unit-test candidate provider",
      baselineScores,
      candidates: [
        {
          id: "ev-timing-1",
          dimension: "timingSaturation",
          direction: "down",
          magnitude: "strong",
          desiredConfidence: "high",
          sourceUrl: "https://example.com/research-report",
          verificationStatus: "verified",
          sourceSignals: ["research_report"],
          note: "Verified research report says the trend is saturated."
        },
        {
          id: "ev-safety-1",
          dimension: "brandSafety",
          direction: "confirm",
          magnitude: "moderate",
          desiredConfidence: "high",
          sourceUrl: "https://example.com/reputable-journalism",
          verificationStatus: "verified",
          sourceSignals: ["reputable_journalism"],
          note: "Reputable coverage confirms no major safety issue."
        }
      ]
    });

    const generated = generateEvidenceAdjustmentCaseFromDraft({
      draft,
      riskTolerance: "medium",
      profileUsed: "default"
    });

    assert.equal(generated.id, draft.id);
    assert.equal(generated.case, draft.case);
    assert.deepEqual(generated.baselineScores, baselineScores);
    assert.equal(generated.evidence, draft.evidence);
    assert.equal(generated.expectedAdjustedScores.timingSaturation, 25);
    assert.equal(generated.expectedAdjustedTotal, 70);
    assert.equal(generated.expectedAdjustedBand, "Go");
    assert.equal(generated.expectedEvidenceGate, "partial");
    assert.deepEqual(generated.expectedGateMissing, ["timingSaturation", "audienceOrUseCase"]);
    assert.deepEqual(generated.expectedDimensionConfidence.timingSaturation, "evidence-revised (high)");
  });
});
