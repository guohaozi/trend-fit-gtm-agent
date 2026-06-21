import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildEvidenceDraft, requireSourceCorroboration } from "../lib/evidence-collector";
import { adjustScores, type EvidenceItem } from "../lib/evidence-adjustment";

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

  it("counts one canonical source at most once per dimension", () => {
    const draft = buildEvidenceDraft({
      id: "dedupe",
      case: "dedupe",
      researchDate: "2026-06-19",
      tooling: "test",
      baselineScores,
      candidates: [
        {
          id: "weak",
          canonicalSourceId: "serp:one-report",
          dimension: "commercialIntent",
          direction: "up",
          magnitude: "weak",
          desiredConfidence: "medium",
          sourceUrl: "https://serpapi.com/search?q=test",
          verificationStatus: "verified",
          sourceSignals: ["research_report"],
          note: "weak"
        },
        {
          id: "moderate",
          canonicalSourceId: "serp:one-report",
          dimension: "commercialIntent",
          direction: "up",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceUrl: "https://serpapi.com/search?q=test",
          verificationStatus: "verified",
          sourceSignals: ["research_report"],
          note: "moderate"
        }
      ]
    });

    assert.deepEqual(draft.evidence.map((item) => item.id), ["moderate"]);
  });

  it("drops conflicting directions from the same canonical source and dimension", () => {
    const draft = buildEvidenceDraft({
      id: "conflict",
      case: "conflict",
      researchDate: "2026-06-19",
      tooling: "test",
      baselineScores,
      candidates: [
        {
          id: "up",
          canonicalSourceId: "serp:one-report",
          dimension: "timingSaturation",
          direction: "up",
          magnitude: "strong",
          desiredConfidence: "high",
          sourceUrl: "https://serpapi.com/search?q=test",
          verificationStatus: "verified",
          sourceSignals: ["research_report"],
          note: "up"
        },
        {
          id: "down",
          canonicalSourceId: "serp:one-report",
          dimension: "timingSaturation",
          direction: "down",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceUrl: "https://serpapi.com/search?q=test",
          verificationStatus: "verified",
          sourceSignals: ["research_report"],
          note: "down"
        }
      ]
    });

    assert.equal(draft.evidence.length, 0);
    assert.equal(draft.droppedCandidates.length, 2);
  });

  it("preserves whether evidence is context or decision material", () => {
    const draft = buildEvidenceDraft({
      id: "context",
      case: "context",
      researchDate: "2026-06-19",
      tooling: "test",
      baselineScores,
      candidates: [{
        id: "raw",
        evidenceUse: "context",
        dimension: "audienceOverlap",
        direction: "confirm",
        magnitude: "weak",
        desiredConfidence: "medium",
        sourceUrl: "https://example.com/post",
        verificationStatus: "verified",
        sourceSignals: ["comment_corpus"],
        note: "raw"
      }]
    });
    assert.equal(draft.evidence[0].evidenceUse, "context");
  });
});

describe("requireSourceCorroboration — two independent sources to move a dimension", () => {
  const directional = {
    magnitude: "moderate" as const,
    confidence: "medium" as const,
    sourceTier: "primary" as const
  };

  it("keeps directional evidence backed by two independent canonical sources", () => {
    const evidence: EvidenceItem[] = [
      { id: "hn-1", canonicalSourceId: "hn:1", dimension: "brandSafety", direction: "down", sourceUrl: "https://news.ycombinator.com/item?id=1", note: "backlash one", ...directional },
      { id: "hn-2", canonicalSourceId: "hn:2", dimension: "brandSafety", direction: "down", sourceUrl: "https://news.ycombinator.com/item?id=2", note: "backlash two", ...directional }
    ];

    const corroborated = requireSourceCorroboration(evidence);
    assert.ok(corroborated.every((item) => item.evidenceUse !== "context"));

    const adjusted = adjustScores({
      audienceOverlap: 75, useCaseRelevance: 75, messageBridge: 75, creativeFeasibility: 75,
      commercialIntent: 75, brandSafety: 75, timingSaturation: 75
    }, corroborated);
    assert.equal(adjusted.adjusted.brandSafety, 50, "two corroborating sources still move the score");
  });

  it("demotes single-source directional evidence to context so it cannot move a score", () => {
    const evidence: EvidenceItem[] = [
      { id: "serp-solo", canonicalSourceId: "serp:trends", dimension: "timingSaturation", direction: "down", sourceUrl: "https://serpapi.com/search?q=x", note: "google trends dip", ...directional }
    ];

    const [demoted] = requireSourceCorroboration(evidence);
    assert.equal(demoted.evidenceUse, "context");
    assert.match(demoted.note, /单一来源/);

    const adjusted = adjustScores({
      audienceOverlap: 75, useCaseRelevance: 75, messageBridge: 75, creativeFeasibility: 75,
      commercialIntent: 75, brandSafety: 75, timingSaturation: 75
    }, requireSourceCorroboration(evidence));
    assert.equal(adjusted.adjusted.timingSaturation, 75, "single source no longer moves the dimension");
  });

  it("leaves context and confirm items untouched", () => {
    const evidence: EvidenceItem[] = [
      { id: "ctx", evidenceUse: "context", dimension: "audienceOverlap", direction: "down", sourceUrl: "u", note: "raw", ...directional },
      { id: "conf", dimension: "audienceOverlap", direction: "confirm", sourceUrl: "u2", note: "confirm", ...directional }
    ];
    const result = requireSourceCorroboration(evidence);
    assert.equal(result[0].evidenceUse, "context");
    assert.equal(result[0].note, "raw");
    assert.equal(result[1].direction, "confirm");
    assert.equal(result[1].evidenceUse, undefined);
  });
});
