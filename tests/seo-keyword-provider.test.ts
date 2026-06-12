import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import {
  SeoKeywordProviderError,
  SerpApiGoogleTrendsSource,
  seoKeywordFindingsToCandidates,
  serpApiKeywordResearchToFindings
} from "../lib/seo-keyword-provider";
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
  it("collects live Google Trends findings through SerpApi", async () => {
    const requested: URL[] = [];
    const source = new SerpApiGoogleTrendsSource({
      apiKey: "test-serpapi-key",
      geo: "US",
      date: "today 12-m",
      fetcher: async (url) => {
        requested.push(new URL(url.toString()));
        const dataType = url.searchParams.get("data_type");
        if (dataType === "RELATED_QUERIES") {
          return {
            related_queries: {
              rising: [
                { query: "protein drink convenience store", formatted_value: "Breakout" },
                { query: "where to buy protein drink", formatted_value: "+120%", extracted_value: 120 }
              ],
              top: [{ query: "protein drink", extracted_value: 100 }]
            }
          };
        }
        return {
          interest_over_time: {
            timeline_data: [
              { values: [{ extracted_value: 10 }] },
              { values: [{ extracted_value: 20 }] },
              { values: [{ extracted_value: 60 }] },
              { values: [{ extracted_value: 80 }] }
            ]
          }
        };
      }
    });

    const result = await source.collect({
      product: "protein drink",
      market: "US convenience retail",
      trend: "grab-and-go protein",
      queries: [],
      limitPerQuery: 2
    });

    assert.equal(requested.length, 2);
    assert.deepEqual(
      requested.map((url) => url.searchParams.get("data_type")),
      ["RELATED_QUERIES", "TIMESERIES"]
    );
    assert.equal(requested[0].searchParams.get("engine"), "google_trends");
    assert.equal(requested[0].searchParams.get("api_key"), "test-serpapi-key");
    assert.equal(requested[0].searchParams.get("geo"), "US");
    assert.equal(requested[0].searchParams.get("date"), "today 12-m");
    assert.equal(requested[0].searchParams.get("q"), "grab-and-go protein");
    assert.equal(result.tooling, "SerpApi Google Trends");
    assert.deepEqual(
      result.seoKeywordFindings?.map((finding) => [finding.signal, finding.query, finding.growthLabel ?? finding.changePct]),
      [
        ["breakout_keyword", "protein drink convenience store", "Breakout"],
        ["related_buying_query", "where to buy protein drink", "+120%"],
        ["trend_rising", "protein drink", 366.67]
      ]
    );
  });

  it("queries Google Trends with the trend term only, not product or market", async () => {
    let capturedQuery = "";
    const source = new SerpApiGoogleTrendsSource({
      apiKey: "test-serpapi-key",
      fetcher: async (url) => {
        capturedQuery = url.searchParams.get("q") ?? "";
        return url.searchParams.get("data_type") === "RELATED_QUERIES"
          ? { related_queries: { rising: [], top: [] } }
          : { interest_over_time: { timeline_data: [] } };
      }
    });

    await source.collect({
      product: "snack brand x",
      market: "germany",
      trend: "dubai chocolate",
      queries: [],
      limitPerQuery: 2
    });

    // product and market must not pollute the Google Trends search term; market
    // belongs in the geo parameter, not the query text.
    assert.equal(capturedQuery, "dubai chocolate");
  });

  it("emits no fabricated trend when search demand is near zero", async () => {
    const source = new SerpApiGoogleTrendsSource({
      apiKey: "test-serpapi-key",
      fetcher: async (url) => {
        const dataType = url.searchParams.get("data_type");
        if (dataType === "RELATED_QUERIES") {
          // SerpApi signals "no results" via an error field, not related_queries.
          return { error: "Google Trends hasn't returned any results for this query." };
        }
        // Even a computable (here upward) interest series must be discarded when
        // SerpApi says the query has no results: the data is too sparse to trust.
        return {
          interest_over_time: {
            timeline_data: [
              { values: [{ extracted_value: 10 }] },
              { values: [{ extracted_value: 20 }] },
              { values: [{ extracted_value: 60 }] },
              { values: [{ extracted_value: 80 }] }
            ]
          }
        };
      }
    });

    const result = await source.collect({
      product: "ultra niche widget",
      market: "nowhere market",
      trend: "a query nobody searches",
      queries: [],
      limitPerQuery: 2
    });

    assert.deepEqual(result.seoKeywordFindings, []);
    assert.ok(result.notes && result.notes.length > 0, "should surface a data-insufficiency note");
    assert.match(result.notes[0], /No Google Trends evidence/);
  });

  it("produces no trend finding when calculateTrend yields no direction", () => {
    const findings = serpApiKeywordResearchToFindings({
      idPrefix: "lowdemand",
      sourceUrl: "https://serpapi.com/search?engine=google_trends&q=lowdemand",
      relatedQueries: { rising: [], top: [] },
      trend: undefined
    });

    assert.deepEqual(findings, []);
  });

  it("requires a SerpApi key for live Google Trends collection", async () => {
    assert.throws(
      () => new SerpApiGoogleTrendsSource({ apiKey: "" }),
      (error) => error instanceof SeoKeywordProviderError && /SERPAPI_API_KEY/.test(error.message)
    );
  });

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

  it("filters unrelated or spammy Google Trends related queries before evidence mapping", () => {
    const findings = serpApiKeywordResearchToFindings({
      idPrefix: "labubu",
      sourceUrl: "https://serpapi.com/search?engine=google_trends&q=labubu",
      relatedQueries: {
        rising: [
          { query: "ac repair near me", formatted_value: "Breakout" },
          { query: "labubu seo traffic service", formatted_value: "Breakout" },
          { query: "labubu doll", formatted_value: "Breakout" },
          { query: "where to buy labubu", formatted_value: "+120%" }
        ],
        top: [{ query: "labubu", value: 100 }]
      },
      trend: undefined
    });

    assert.deepEqual(
      findings.map((finding) => [finding.signal, finding.query]),
      [
        ["breakout_keyword", "labubu doll"],
        ["related_buying_query", "where to buy labubu"]
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
