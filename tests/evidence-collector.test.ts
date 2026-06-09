import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEvidenceDraft } from "../lib/evidence-collector";

const baselineScores = {
  audienceOverlap: 75,
  useCaseRelevance: 75,
  messageBridge: 75,
  creativeFeasibility: 75,
  commercialIntent: 75,
  brandSafety: 75,
  timingSaturation: 75
} as const;

describe("evidence collector draft builder", () => {
  it("turns verified candidate sources into typed evidence while preserving conservative source tiers", () => {
    const draft = buildEvidenceDraft({
      id: "demo_collect_evidence",
      case: "demo_collect",
      researchDate: "2026-06-09",
      tooling: "manual + GooseWorks candidate search",
      baselineScores,
      candidates: [
        {
          id: "vendor-doc",
          dimension: "creativeFeasibility",
          direction: "up",
          magnitude: "moderate",
          desiredConfidence: "high",
          sourceUrl: "https://help.shopify.com/en/manual/example",
          verificationStatus: "verified",
          sourceSignals: ["vendor_documentation"],
          note: "Vendor docs show the workflow exists."
        },
        {
          id: "reddit-audience",
          dimension: "audienceOverlap",
          direction: "confirm",
          magnitude: "weak",
          desiredConfidence: "high",
          sourceUrl: "https://www.reddit.com/r/example/comments/abc123/thread/",
          verificationStatus: "verified",
          sourceSignals: ["single_social_thread"],
          note: "Thread contains raw user language from the target audience."
        },
        {
          id: "unverified-report",
          dimension: "timingSaturation",
          direction: "down",
          magnitude: "weak",
          desiredConfidence: "medium",
          sourceUrl: "https://example.com/report",
          verificationStatus: "unverified",
          sourceSignals: ["research_report"],
          note: "Could not fetch during collection."
        },
        {
          id: "bad-claim",
          dimension: "brandSafety",
          direction: "down",
          magnitude: "strong",
          desiredConfidence: "high",
          sourceUrl: "https://example.com/does-not-support-claim",
          verificationStatus: "contradicted",
          sourceSignals: ["reputable_journalism"],
          note: "Claim was not present at the URL."
        }
      ]
    });

    assert.equal(draft.evidence.length, 3);
    assert.equal(draft.droppedCandidates.length, 1);
    assert.equal(draft.droppedCandidates[0].id, "bad-claim");

    assert.deepEqual(
      draft.evidence.map((item) => [item.id, item.sourceTier, item.confidence]),
      [
        ["vendor-doc", "proxy", "medium"],
        ["reddit-audience", "primary", "medium"],
        ["unverified-report", "proxy", "low"]
      ]
    );
    assert.match(draft.evidence[2].note, /UNVERIFIED/);
  });
});
