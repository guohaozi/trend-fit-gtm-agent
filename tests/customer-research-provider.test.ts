import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { customerResearchFindingsToCandidates } from "../lib/customer-research-provider";
import type { Scores } from "../lib/types";

const baselineScores: Scores = {
  audienceOverlap: 75,
  useCaseRelevance: 75,
  messageBridge: 75,
  creativeFeasibility: 75,
  commercialIntent: 75,
  brandSafety: 75,
  timingSaturation: 75
};

describe("customer research provider adapter", () => {
  it("maps customer research findings into conservative evidence candidates", () => {
    const candidates = customerResearchFindingsToCandidates([
      {
        id: "reddit-audience-language",
        theme: "audience_language",
        sourceType: "reddit_thread",
        sourceUrl: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
        verificationStatus: "verified",
        confidence: "high",
        intensity: "weak",
        quote: "I just want something easy after work, not a giant tub of powder.",
        context: "Thread discussing daily protein drink routines.",
        note: "Raw user language suggests the trend reaches casual routine builders."
      },
      {
        id: "review-commercial-intent",
        theme: "commercial_intent",
        sourceType: "review_corpus",
        sourceUrl: "https://example.com/reviews/protein-drinks",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "I bought these because they are easy to grab on the way to the office.",
        context: "Review corpus for ready-to-drink protein products.",
        note: "Multiple reviews describe actual purchase behavior."
      },
      {
        id: "forum-safety-concern",
        theme: "brand_safety_concern",
        sourceType: "forum_thread",
        sourceUrl: "https://example.com/forum/thread/protein-claims",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "The weight loss claims made me skeptical.",
        context: "Forum thread reacting to protein drink claims.",
        note: "User language flags claim-sensitivity risk."
      }
    ]);

    assert.deepEqual(
      candidates.map((candidate) => ({
        id: candidate.id,
        dimension: candidate.dimension,
        direction: candidate.direction,
        magnitude: candidate.magnitude,
        desiredConfidence: candidate.desiredConfidence,
        sourceSignals: candidate.sourceSignals
      })),
      [
        {
          id: "reddit-audience-language",
          dimension: "audienceOverlap",
          direction: "confirm",
          magnitude: "weak",
          desiredConfidence: "high",
          sourceSignals: ["single_social_thread"]
        },
        {
          id: "review-commercial-intent",
          dimension: "commercialIntent",
          direction: "up",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["comment_corpus"]
        },
        {
          id: "forum-safety-concern",
          dimension: "brandSafety",
          direction: "down",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["single_social_thread"]
        }
      ]
    );
    assert.match(candidates[0].note, /Quote: "I just want something easy after work/);
  });

  it("feeds customer research candidates through draft building and evidence-case generation", () => {
    const candidates = customerResearchFindingsToCandidates([
      {
        id: "reddit-audience-language",
        theme: "audience_language",
        sourceType: "reddit_thread",
        sourceUrl: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
        verificationStatus: "verified",
        confidence: "high",
        intensity: "weak",
        quote: "I just want something easy after work, not a giant tub of powder.",
        context: "Thread discussing daily protein drink routines.",
        note: "Raw user language suggests the trend reaches casual routine builders."
      },
      {
        id: "review-commercial-intent",
        theme: "commercial_intent",
        sourceType: "review_corpus",
        sourceUrl: "https://example.com/reviews/protein-drinks",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "I bought these because they are easy to grab on the way to the office.",
        context: "Review corpus for ready-to-drink protein products.",
        note: "Multiple reviews describe actual purchase behavior."
      },
      {
        id: "forum-safety-concern",
        theme: "brand_safety_concern",
        sourceType: "forum_thread",
        sourceUrl: "https://example.com/forum/thread/protein-claims",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "The weight loss claims made me skeptical.",
        context: "Forum thread reacting to protein drink claims.",
        note: "User language flags claim-sensitivity risk."
      }
    ]);
    const draft = buildEvidenceDraft({
      id: "demo_customer_research_evidence",
      case: "demo_customer_research",
      researchDate: "2026-06-09",
      tooling: "customer-research fixture",
      baselineScores,
      candidates
    });

    const generated = generateEvidenceAdjustmentCaseFromDraft({
      draft,
      riskTolerance: "medium",
      profileUsed: "default"
    });

    assert.deepEqual(
      draft.evidence.map((item) => [item.id, item.sourceTier, item.confidence]),
      [
        ["reddit-audience-language", "primary", "medium"],
        ["review-commercial-intent", "primary", "medium"],
        ["forum-safety-concern", "proxy", "medium"]
      ]
    );
    assert.equal(generated.expectedAdjustedScores.commercialIntent, 100);
    assert.equal(generated.expectedAdjustedScores.brandSafety, 75);
    assert.equal(generated.expectedEvidenceGate, "partial");
    assert.deepEqual(generated.expectedGateMissing, ["timingSaturation", "brandSafety"]);
    assert.equal(generated.expectedDimensionConfidence.commercialIntent, "evidence-revised (medium)");
  });
});
