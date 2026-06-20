import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDemoFixtureReady } from "../lib/demo-fixture-guard";
import type { EvidenceItem } from "../lib/evidence-adjustment";
import type { Scores } from "../lib/types";

const baseline: Scores = {
  audienceOverlap: 75,
  useCaseRelevance: 75,
  messageBridge: 75,
  creativeFeasibility: 75,
  commercialIntent: 75,
  brandSafety: 75,
  timingSaturation: 75
};

function evidence(id: string, source: string): EvidenceItem {
  return {
    id,
    evidenceUse: "decision",
    canonicalSourceId: source,
    dimension: "brandSafety",
    direction: "down",
    magnitude: "weak",
    confidence: "medium",
    sourceTier: "primary",
    sourceUrl: `https://example.com/${source}`,
    note: "test"
  };
}

describe("demo fixture guard", () => {
  it("rejects a fixture when AI produced no directional evidence", () => {
    assert.throws(
      () => assertDemoFixtureReady({ evidence: [], baseline, adjusted: baseline }),
      /no directional evidence/i
    );
  });

  it("rejects evidence that does not change any score", () => {
    assert.throws(
      () => assertDemoFixtureReady({ evidence: [evidence("a", "one"), evidence("b", "two")], baseline, adjusted: baseline }),
      /no score movement/i
    );
  });

  it("accepts a fixture with evidence-driven score movement", () => {
    assert.doesNotThrow(() =>
      assertDemoFixtureReady({
        evidence: [evidence("a", "one"), evidence("b", "two")],
        baseline,
        adjusted: { ...baseline, brandSafety: 50 }
      })
    );
  });

  it("rejects score movement supported by only one canonical source", () => {
    assert.throws(() => assertDemoFixtureReady({
      evidence: [evidence("a", "same"), evidence("b", "same")],
      baseline,
      adjusted: { ...baseline, brandSafety: 50 }
    }), /two independent sources.*brandSafety/i);
  });
});
