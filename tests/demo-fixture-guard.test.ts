import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDemoFixtureReady } from "../lib/demo-fixture-guard";
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

describe("demo fixture guard", () => {
  it("rejects a fixture when AI produced no directional evidence", () => {
    assert.throws(
      () => assertDemoFixtureReady({ evidenceCount: 0, baseline, adjusted: baseline }),
      /no directional evidence/i
    );
  });

  it("rejects evidence that does not change any score", () => {
    assert.throws(
      () => assertDemoFixtureReady({ evidenceCount: 2, baseline, adjusted: baseline }),
      /no score movement/i
    );
  });

  it("accepts a fixture with evidence-driven score movement", () => {
    assert.doesNotThrow(() =>
      assertDemoFixtureReady({
        evidenceCount: 2,
        baseline,
        adjusted: { ...baseline, brandSafety: 50 }
      })
    );
  });
});
