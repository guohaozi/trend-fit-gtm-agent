import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateEvidenceAdjustmentCaseFromDraft } from "../lib/evidence-case-generator";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { customerResearchFindingsToCandidates } from "../lib/customer-research-provider";
import {
  buildOpenCliCustomerResearchCommands,
  openCliRowsToCustomerResearchFindings
} from "../lib/opencli-customer-research";
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

describe("OpenCLI customer research provider", () => {
  it("builds read-only OpenCLI commands for customer research discovery", () => {
    const commands = buildOpenCliCustomerResearchCommands({
      query: "protein drink daily routine",
      themes: ["audience_language", "commercial_intent"],
      platforms: ["reddit", "youtube"],
      limit: 5
    });

    assert.deepEqual(commands, [
      {
        platform: "reddit",
        theme: "audience_language",
        command: ["opencli", "reddit", "search", "protein drink daily routine audience", "--limit", "5", "-f", "json"]
      },
      {
        platform: "youtube",
        theme: "audience_language",
        command: ["opencli", "youtube", "search", "protein drink daily routine audience", "--limit", "5", "-f", "json"]
      },
      {
        platform: "reddit",
        theme: "commercial_intent",
        command: ["opencli", "reddit", "search", "protein drink daily routine buy worth it", "--limit", "5", "-f", "json"]
      },
      {
        platform: "youtube",
        theme: "commercial_intent",
        command: ["opencli", "youtube", "search", "protein drink daily routine buy worth it", "--limit", "5", "-f", "json"]
      }
    ]);
  });

  it("turns OpenCLI Reddit and YouTube rows into customer research findings", () => {
    const findings = openCliRowsToCustomerResearchFindings({
      platform: "reddit",
      theme: "audience_language",
      rows: [
        {
          id: "abc123",
          title: "Protein drinks that fit a normal workday?",
          subreddit: "fitness",
          score: 42,
          comments: 18,
          url: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
          selftext: "I want protein that is easy after work, not another powder ritual."
        }
      ]
    }).concat(
      openCliRowsToCustomerResearchFindings({
        platform: "youtube",
        theme: "commercial_intent",
        sourceUrl: "https://www.youtube.com/watch?v=video123",
        rows: [
          {
            rank: 1,
            author: "viewer",
            text: "Where can I buy this? The convenience is the point.",
            likes: 12,
            time: "2 weeks ago"
          }
        ]
      })
    );

    assert.deepEqual(
      findings.map((finding) => ({
        id: finding.id,
        theme: finding.theme,
        sourceType: finding.sourceType,
        sourceUrl: finding.sourceUrl,
        confidence: finding.confidence,
        intensity: finding.intensity,
        quote: finding.quote
      })),
      [
        {
          id: "opencli-reddit-audience-language-abc123",
          theme: "audience_language",
          sourceType: "reddit_thread",
          sourceUrl: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
          confidence: "medium",
          intensity: "weak",
          quote: "I want protein that is easy after work, not another powder ritual."
        },
        {
          id: "opencli-youtube-commercial-intent-1",
          theme: "commercial_intent",
          sourceType: "youtube_comments",
          sourceUrl: "https://www.youtube.com/watch?v=video123",
          confidence: "medium",
          intensity: "moderate",
          quote: "Where can I buy this? The convenience is the point."
        }
      ]
    );
  });

  it("feeds OpenCLI-derived findings into the evidence draft and case generator", () => {
    const findings = openCliRowsToCustomerResearchFindings({
      platform: "reddit",
      theme: "audience_language",
      rows: [
        {
          id: "abc123",
          title: "Protein drinks that fit a normal workday?",
          subreddit: "fitness",
          score: 42,
          comments: 18,
          url: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
          selftext: "I want protein that is easy after work, not another powder ritual."
        }
      ]
    }).concat(
      openCliRowsToCustomerResearchFindings({
        platform: "youtube",
        theme: "commercial_intent",
        sourceUrl: "https://www.youtube.com/watch?v=video123",
        rows: [
          {
            rank: 1,
            author: "viewer",
            text: "Where can I buy this? The convenience is the point.",
            likes: 12,
            time: "2 weeks ago"
          }
        ]
      })
    );
    const draft = buildEvidenceDraft({
      id: "demo_opencli_customer_research_evidence",
      case: "demo_opencli_customer_research",
      researchDate: "2026-06-09",
      tooling: "customer-research + OpenCLI fixture; GooseWorks intentionally not used",
      baselineScores,
      candidates: customerResearchFindingsToCandidates(findings)
    });
    const generated = generateEvidenceAdjustmentCaseFromDraft({
      draft,
      riskTolerance: "medium",
      profileUsed: "default"
    });

    assert.deepEqual(
      draft.evidence.map((item) => [item.id, item.sourceTier, item.confidence]),
      [
        ["opencli-reddit-audience-language-abc123", "primary", "medium"],
        ["opencli-youtube-commercial-intent-1", "primary", "medium"]
      ]
    );
    assert.equal(generated.expectedAdjustedScores.commercialIntent, 100);
    assert.equal(generated.expectedEvidenceGate, "partial");
    assert.deepEqual(generated.expectedGateMissing, ["timingSaturation", "brandSafety"]);
  });
});
