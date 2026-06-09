import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { seoKeywordFindingsToCandidates, serpApiKeywordResearchToFindings } from "../lib/seo-keyword-provider";
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

describe("SEO keyword provider", () => {
  it("maps SEO keyword findings into timing and commercial-intent evidence candidates", () => {
    const candidates = seoKeywordFindingsToCandidates([
      {
        id: "breakout-timing",
        signal: "breakout_keyword",
        query: "protein drink convenience store",
        sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
        verificationStatus: "verified",
        growthLabel: "Breakout",
        note: "Related query is marked Breakout."
      },
      {
        id: "buying-query",
        signal: "related_buying_query",
        query: "where to buy protein drink",
        sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
        verificationStatus: "verified",
        growthLabel: "+120%",
        note: "Related query shows buying language."
      },
      {
        id: "declining-timing",
        signal: "trend_declining",
        query: "old protein trend",
        sourceUrl: "https://serpapi.com/search?engine=google_trends&q=old+protein+trend",
        verificationStatus: "verified",
        changePct: -35,
        note: "Timeseries recent average is down."
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
          id: "breakout-timing",
          dimension: "timingSaturation",
          direction: "up",
          magnitude: "strong",
          desiredConfidence: "high",
          sourceSignals: ["research_report"]
        },
        {
          id: "buying-query",
          dimension: "commercialIntent",
          direction: "up",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["research_report"]
        },
        {
          id: "declining-timing",
          dimension: "timingSaturation",
          direction: "down",
          magnitude: "moderate",
          desiredConfidence: "medium",
          sourceSignals: ["research_report"]
        }
      ]
    );
    assert.match(candidates[0].note, /Google Trends query: protein drink convenience store/);
  });

  it("extracts SEO findings from SerpApi-style related queries and timeseries research", () => {
    const findings = serpApiKeywordResearchToFindings({
      idPrefix: "protein",
      sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
      relatedQueries: {
        rising: [
          { query: "protein drink convenience store", formatted_value: "Breakout" },
          { query: "where to buy protein drink", formatted_value: "+120%" },
          { query: "protein drink review", formatted_value: "+80%" }
        ],
        top: [{ query: "protein drink", value: 100 }]
      },
      trend: {
        direction: "DECLINING",
        change_pct: -28
      }
    });

    assert.deepEqual(
      findings.map((finding) => [finding.id, finding.signal, finding.query, finding.growthLabel ?? finding.changePct]),
      [
        ["protein-breakout-1", "breakout_keyword", "protein drink convenience store", "Breakout"],
        ["protein-buying-1", "related_buying_query", "where to buy protein drink", "+120%"],
        ["protein-buying-2", "related_buying_query", "protein drink review", "+80%"],
        ["protein-declining", "trend_declining", "protein drink", -28]
      ]
    );
  });

  it("feeds SEO keyword candidates through draft building and evidence-case generation", () => {
    const candidates = seoKeywordFindingsToCandidates([
      {
        id: "breakout-timing",
        signal: "breakout_keyword",
        query: "protein drink convenience store",
        sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
        verificationStatus: "verified",
        growthLabel: "Breakout",
        note: "Related query is marked Breakout."
      },
      {
        id: "buying-query",
        signal: "related_buying_query",
        query: "where to buy protein drink",
        sourceUrl: "https://serpapi.com/search?engine=google_trends&q=protein+drink",
        verificationStatus: "verified",
        growthLabel: "+120%",
        note: "Related query shows buying language."
      }
    ]);
    const draft = buildEvidenceDraft({
      id: "demo_seo_keyword_evidence",
      case: "demo_seo_keyword",
      researchDate: "2026-06-09",
      tooling: "seo-keyword-research fixture",
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
        ["breakout-timing", "secondary", "high"],
        ["buying-query", "secondary", "medium"]
      ]
    );
    assert.equal(generated.expectedAdjustedScores.timingSaturation, 100);
    assert.equal(generated.expectedAdjustedScores.commercialIntent, 100);
    assert.equal(generated.expectedEvidenceGate, "partial");
    assert.deepEqual(generated.expectedGateMissing, ["brandSafety", "audienceOrUseCase"]);
  });
});
