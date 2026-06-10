import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orchestrateEvidenceCase } from "../lib/evidence-case-orchestrator";
import type { CompetitorResearchFinding } from "../lib/competitor-research-provider";
import type { CustomerResearchFinding } from "../lib/customer-research-provider";
import type { EvidenceCandidate } from "../lib/evidence-collector";
import type { SeoKeywordFinding } from "../lib/seo-keyword-provider";
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

const customerResearchFindings: CustomerResearchFinding[] = [
  {
    id: "customer-audience",
    theme: "audience_language",
    sourceType: "reddit_thread",
    sourceUrl: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
    verificationStatus: "verified",
    confidence: "high",
    intensity: "weak",
    quote: "I want something easy after work, not a giant tub of powder.",
    note: "Raw customer language confirms the trend reaches routine-focused buyers."
  },
  {
    id: "customer-safety",
    theme: "brand_safety_concern",
    sourceType: "forum_thread",
    sourceUrl: "https://example.com/forum/thread/protein-claims",
    verificationStatus: "verified",
    confidence: "medium",
    intensity: "moderate",
    quote: "The weight-loss framing makes this feel sketchy.",
    note: "User language flags claim-sensitivity risk."
  }
];

const seoKeywordFindings: SeoKeywordFinding[] = [
  {
    id: "seo-breakout",
    signal: "breakout_keyword",
    query: "protein drink convenience store",
    sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
    verificationStatus: "verified",
    growthLabel: "Breakout",
    note: "Related query is marked as breakout growth."
  },
  {
    id: "seo-buying",
    signal: "related_buying_query",
    query: "where to buy protein drink",
    sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
    verificationStatus: "verified",
    growthLabel: "+120%",
    note: "Related query contains buying language."
  }
];

const competitorResearchFindings: CompetitorResearchFinding[] = [
  {
    id: "competitor-same-audience",
    competitorName: "Savas",
    competitorUrl: "https://www.meiji.co.jp/products/brand/savas/",
    origin: "product-swipefile",
    findingType: "same_audience",
    sourceType: "vendor_copy",
    sourceUrl: "https://www.meiji.co.jp/products/brand/savas/",
    verificationStatus: "verified",
    confidence: "medium",
    intensity: "weak",
    quote: "Protein products for everyday sports and wellness routines.",
    note: "Competitor positioning names an adjacent audience."
  },
  {
    id: "competitor-saturation",
    competitorName: "Savas",
    competitorUrl: "https://www.meiji.co.jp/products/brand/savas/",
    origin: "competitor-profiling",
    findingType: "saturated_competitor_activity",
    sourceType: "direct_competitor_campaign",
    sourceUrl: "https://www.meiji.co.jp/products/brand/savas/",
    verificationStatus: "verified",
    confidence: "high",
    intensity: "strong",
    quote: "Convenience-ready protein drinks are already promoted heavily.",
    note: "Competitor activity suggests saturation risk."
  },
  {
    id: "competitor-backlash",
    competitorName: "ProteinUp",
    competitorUrl: "https://example.com/proteinup",
    origin: "product-swipefile",
    findingType: "competitor_backlash",
    sourceType: "reputable_journalism",
    sourceUrl: "https://example.com/news/protein-claim-backlash",
    verificationStatus: "verified",
    confidence: "medium",
    intensity: "moderate",
    quote: "Coverage flags consumer backlash against weight-loss style protein claims.",
    note: "Competitor coverage shows claim framing risk."
  }
];

const additionalCandidates: EvidenceCandidate[] = [
  {
    id: "manual-research-safety",
    dimension: "brandSafety",
    direction: "confirm",
    magnitude: "moderate",
    desiredConfidence: "high",
    sourceUrl: "https://example.com/research/protein-supplement-safety",
    verificationStatus: "verified",
    sourceSignals: ["research_report"],
    note: "Verified research confirms protein-claim caution without making the category a No-go."
  }
];

describe("evidence case orchestrator", () => {
  it("merges provider findings in deterministic order and generates a source-tiered evidence case", () => {
    const result = orchestrateEvidenceCase({
      id: "demo_orchestrated_evidence",
      caseId: "demo_orchestrated",
      researchDate: "2026-06-10",
      tooling: "fixture provider merge",
      baselineScores,
      riskTolerance: "medium",
      profileUsed: "default",
      customerResearchFindings,
      seoKeywordFindings,
      competitorResearchFindings,
      additionalCandidates
    });

    assert.deepEqual(
      result.candidates.map((candidate) => candidate.id),
      [
        "customer-audience",
        "customer-safety",
        "seo-breakout",
        "seo-buying",
        "competitor-same-audience",
        "competitor-saturation",
        "competitor-backlash",
        "manual-research-safety"
      ]
    );

    assert.deepEqual(
      result.draft.evidence.map((item) => [item.id, item.sourceTier, item.confidence]),
      [
        ["customer-audience", "primary", "medium"],
        ["customer-safety", "proxy", "medium"],
        ["seo-breakout", "secondary", "high"],
        ["seo-buying", "secondary", "medium"],
        ["competitor-same-audience", "proxy", "medium"],
        ["competitor-saturation", "primary", "high"],
        ["competitor-backlash", "secondary", "medium"],
        ["manual-research-safety", "secondary", "high"]
      ]
    );

    assert.equal(result.evidenceCase.id, "demo_orchestrated_evidence");
    assert.equal(result.evidenceCase.case, "demo_orchestrated");
    assert.equal(result.evidenceCase.expectedAdjustedScores.commercialIntent, 100);
    assert.equal(result.evidenceCase.expectedAdjustedScores.brandSafety, 50);
    assert.equal(result.evidenceCase.expectedAdjustedScores.timingSaturation, 75);
    assert.equal(result.evidenceCase.expectedEvidenceGate, "pass");
    assert.deepEqual(result.evidenceCase.expectedGateMissing, []);
    assert.equal(result.evidenceCase.expectedDimensionConfidence.commercialIntent, "evidence-revised (medium)");
  });
});
