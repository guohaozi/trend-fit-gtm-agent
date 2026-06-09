import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import {
  competitorProfileExtractsToFindings,
  competitorResearchFindingsToCandidates
} from "../lib/competitor-research-provider";
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

describe("competitor research provider", () => {
  it("maps competitor research findings into evidence candidates for trend-fit dimensions", () => {
    const candidates = competitorResearchFindingsToCandidates([
      {
        id: "photoroom-used-trend",
        competitorName: "Photoroom",
        competitorUrl: "https://www.photoroom.com/",
        origin: "competitor-profiling",
        findingType: "competitor_used_trend",
        sourceType: "direct_competitor_campaign",
        sourceUrl: "https://www.photoroom.com/tools/ai-product-photography",
        verificationStatus: "verified",
        confidence: "high",
        intensity: "moderate",
        quote: "Create studio-quality product photos with AI backgrounds.",
        note: "Direct competitor uses the same AI product-photo before/after framing."
      },
      {
        id: "evoto-backlash",
        competitorName: "Evoto",
        competitorUrl: "https://www.evoto.ai/",
        origin: "product-swipefile",
        findingType: "competitor_backlash",
        sourceType: "reputable_journalism",
        sourceUrl: "https://www.digitalcameraworld.com/news/evoto-ai-headshot-generator-apology",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "The campaign triggered criticism and an apology.",
        note: "Competitor backlash shows trust risk in AI portrait tools."
      },
      {
        id: "where-to-buy-comments",
        competitorName: "Picsart",
        competitorUrl: "https://picsart.com/",
        origin: "product-swipefile",
        findingType: "where_to_buy_comments",
        sourceType: "comment_corpus",
        sourceUrl: "https://www.youtube.com/watch?v=competitor-demo",
        verificationStatus: "verified",
        confidence: "medium",
        intensity: "moderate",
        quote: "Does this work for Shopify product photos?",
        note: "Comment corpus contains purchase/workflow evaluation language."
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
          id: "photoroom-used-trend",
          dimension: "useCaseRelevance",
          direction: "confirm",
          magnitude: "moderate",
          desiredConfidence: "high",
          sourceSignals: ["direct_competitor_campaign"]
        },
        {
          id: "evoto-backlash",
          dimension: "brandSafety",
          direction: "down",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["reputable_journalism"]
        },
        {
          id: "where-to-buy-comments",
          dimension: "commercialIntent",
          direction: "up",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["comment_corpus"]
        }
      ]
    );
    assert.match(candidates[0].note, /Competitor: Photoroom/);
  });

  it("adapts competitor-profiling and product-swipefile extracts into findings", () => {
    const findings = competitorProfileExtractsToFindings([
      {
        competitorName: "Photoroom",
        competitorUrl: "https://www.photoroom.com/",
        origin: "competitor-profiling",
        sourceUrl: "https://www.photoroom.com/tools/ai-product-photography",
        targetAudience: "Online sellers and small businesses creating product photos.",
        onTrend: "Uses AI product-photo generation and background replacement.",
        contentAngle: "Turn a basic product photo into marketplace-ready assets.",
        saturationRead: "Several AI photo competitors already promote the same before/after workflow."
      },
      {
        competitorName: "Evoto",
        competitorUrl: "https://www.evoto.ai/",
        origin: "product-swipefile",
        sourceUrl: "https://www.digitalcameraworld.com/news/evoto-ai-headshot-generator-apology",
        backlashQuote: "AI headshot campaign triggered criticism and apology coverage."
      }
    ]);

    assert.deepEqual(
      findings.map((finding) => [finding.id, finding.origin, finding.findingType, finding.sourceType]),
      [
        ["photoroom-same-audience", "competitor-profiling", "same_audience", "vendor_copy"],
        ["photoroom-competitor-used-trend", "competitor-profiling", "competitor_used_trend", "direct_competitor_campaign"],
        ["photoroom-competitor-content-angle", "competitor-profiling", "competitor_content_angle", "direct_competitor_campaign"],
        ["photoroom-saturated-competitor-activity", "competitor-profiling", "saturated_competitor_activity", "direct_competitor_campaign"],
        ["evoto-competitor-backlash", "product-swipefile", "competitor_backlash", "reputable_journalism"]
      ]
    );
  });

  it("feeds competitor-layer evidence through draft building and evidence-case generation", () => {
    const findings = competitorProfileExtractsToFindings([
      {
        competitorName: "Photoroom",
        competitorUrl: "https://www.photoroom.com/",
        origin: "competitor-profiling",
        sourceUrl: "https://www.photoroom.com/tools/ai-product-photography",
        targetAudience: "Online sellers and small businesses creating product photos.",
        onTrend: "Uses AI product-photo generation and background replacement.",
        contentAngle: "Turn a basic product photo into marketplace-ready assets.",
        saturationRead: "Several AI photo competitors already promote the same before/after workflow."
      },
      {
        competitorName: "Evoto",
        competitorUrl: "https://www.evoto.ai/",
        origin: "product-swipefile",
        sourceUrl: "https://www.digitalcameraworld.com/news/evoto-ai-headshot-generator-apology",
        backlashQuote: "AI headshot campaign triggered criticism and apology coverage."
      }
    ]);
    const draft = buildEvidenceDraft({
      id: "demo_ai_tool_competitor_evidence",
      case: "demo_ai_tool",
      researchDate: "2026-06-10",
      tooling: "competitor-profiling + product-swipefile fixture",
      baselineScores,
      candidates: competitorResearchFindingsToCandidates(findings)
    });
    const generated = generateEvidenceAdjustmentCaseFromDraft({
      draft,
      riskTolerance: "medium",
      profileUsed: "default"
    });

    assert.deepEqual(
      draft.evidence.map((item) => [item.id, item.sourceTier, item.confidence]),
      [
        ["photoroom-same-audience", "proxy", "medium"],
        ["photoroom-competitor-used-trend", "primary", "high"],
        ["photoroom-competitor-content-angle", "primary", "high"],
        ["photoroom-saturated-competitor-activity", "primary", "high"],
        ["evoto-competitor-backlash", "secondary", "medium"]
      ]
    );
    assert.equal(generated.expectedAdjustedScores.timingSaturation, 25);
    assert.equal(generated.expectedAdjustedScores.brandSafety, 50);
    assert.equal(generated.expectedEvidenceGate, "pass");
    assert.deepEqual(generated.expectedGateMissing, []);
  });
});
