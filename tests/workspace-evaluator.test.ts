import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { TrendShortlistInput } from "../lib/trend-shortlist";
import {
  buildWorkspaceEvidenceGaps,
  buildWorkspaceEvidenceRowsFromEvidence,
  buildWorkspaceProviderPreview,
  materializeWorkspaceEvidenceRows,
  evaluateSingleWorkspaceTrend,
  evaluateWorkspaceShortlist,
  renderSingleWorkspaceMarkdown,
  renderShortlistWorkspaceMarkdown,
  type WorkspaceCandidate,
  type WorkspaceProduct
} from "../lib/workspace-evaluator";

const dataDir = path.join(process.cwd(), "data");

const product: WorkspaceProduct = {
  name: "LEGO",
  category: "Toy / collectible building system",
  market: "Global",
  audience: "Families, kids, adult collectors, gift shoppers",
  positioning: "Creative play and collectible display",
  sellingPoints: "Hands-on building, display value, fandom collaborations",
  brandTone: "Imaginative, precise, family-safe",
  riskTolerance: "medium",
  profileUsed: "brand_awareness"
};

const f1Candidate: WorkspaceCandidate = {
  id: "lego_f1_race_trend",
  trendName: "F1 race weekend",
  trendDescription: "Race-weekend fandom and adult collector culture.",
  scores: {
    audienceOverlap: 75,
    useCaseRelevance: 100,
    messageBridge: 100,
    creativeFeasibility: 100,
    commercialIntent: 75,
    brandSafety: 75,
    timingSaturation: 75
  },
  evidence: [
    {
      id: "f1-lego-category-fit",
      dimension: "useCaseRelevance",
      direction: "confirm",
      magnitude: "strong",
      confidence: "high",
      sourceTier: "primary",
      sourceUrl: "https://www.lego.com/en-us/categories/formula-1",
      note: "LEGO has a Formula 1 category surface."
    },
    {
      id: "f1-creative-fit",
      dimension: "creativeFeasibility",
      direction: "confirm",
      magnitude: "strong",
      confidence: "high",
      sourceTier: "primary",
      sourceUrl: "https://www.lego.com/en-us/themes/speed-champions",
      note: "Speed Champions gives the trend a native build format."
    },
    {
      id: "f1-timing",
      dimension: "timingSaturation",
      direction: "confirm",
      magnitude: "moderate",
      confidence: "medium",
      sourceTier: "secondary",
      sourceUrl: "https://www.formula1.com/en/latest/article/formula-1-and-lego-group-announce-new-partnership.4WPDbkJQJ9K71DEzHGIPMl",
      note: "Formula 1 partnership coverage supports timing."
    },
    {
      id: "f1-brand-safety",
      dimension: "brandSafety",
      direction: "confirm",
      magnitude: "moderate",
      confidence: "medium",
      sourceTier: "secondary",
      sourceUrl: "https://www.formula1.com/en/latest/article/formula-1-and-lego-group-announce-new-partnership.4WPDbkJQJ9K71DEzHGIPMl",
      note: "Mainstream partnership context supports brand fit."
    }
  ],
  oneLineVerdict: "Best fit because the product bridge is direct."
};

describe("workspace evaluator", () => {
  it("evaluates a single editable trend with the selected profile and rigor layer", () => {
    const result = evaluateSingleWorkspaceTrend(product, f1Candidate);

    assert.equal(result.adjustedResult.total, 88);
    assert.equal(result.adjustedResult.recommendation.finalBand, "Strong Go");
    assert.equal(result.rigor.evidenceGate, "pass");
    assert.equal(result.rigor.gatedBand, "Strong Go");
  });

  it("evaluates shortlist candidates from the workspace shape", () => {
    const legoShortlist = JSON.parse(fs.readFileSync(path.join(dataDir, "lego_trend_shortlist.json"), "utf8")) as TrendShortlistInput;
    const result = evaluateWorkspaceShortlist(product, legoShortlist.candidates.map((candidate) => ({
      id: candidate.id,
      trendName: candidate.trendName,
      trendDescription: candidate.trendDescription,
      scores: candidate.baselineScores,
      evidence: candidate.evidence,
      oneLineVerdict: candidate.oneLineVerdict,
      recommendedCampaign: candidate.recommendedCampaign
    })));

    assert.equal(result.winner.id, "lego_f1_race_trend");
    assert.deepEqual(result.rows.map((row) => row.id), [
      "lego_f1_race_trend",
      "lego_world_cup_trend",
      "lego_graduation_season_trend"
    ]);
  });

  it("surfaces evidence gaps with provider-oriented next steps", () => {
    const legoShortlist = JSON.parse(fs.readFileSync(path.join(dataDir, "lego_trend_shortlist.json"), "utf8")) as TrendShortlistInput;
    const worldCup = legoShortlist.candidates[0];
    const result = evaluateSingleWorkspaceTrend(product, {
      id: worldCup.id,
      trendName: worldCup.trendName,
      trendDescription: worldCup.trendDescription ?? "",
      scores: worldCup.baselineScores,
      evidence: worldCup.evidence,
      oneLineVerdict: worldCup.oneLineVerdict
    });
    const gaps = buildWorkspaceEvidenceGaps(result.rigor);

    assert.equal(gaps.some((gap) => gap.slot === "brandSafety"), true);
    assert.equal(gaps.some((gap) => gap.slot === "audienceOrUseCase"), true);
    assert.match(gaps.map((gap) => gap.providerHint).join(" "), /raw social language/);
  });

  it("renders workspace markdown exports for single trends and shortlists", () => {
    const single = evaluateSingleWorkspaceTrend(product, f1Candidate);
    const singleMarkdown = renderSingleWorkspaceMarkdown({
      product,
      candidate: f1Candidate,
      result: single
    });
    const legoShortlist = JSON.parse(fs.readFileSync(path.join(dataDir, "lego_trend_shortlist.json"), "utf8")) as TrendShortlistInput;
    const shortlist = evaluateWorkspaceShortlist(product, legoShortlist.candidates.map((candidate) => ({
      id: candidate.id,
      trendName: candidate.trendName,
      trendDescription: candidate.trendDescription ?? "",
      scores: candidate.baselineScores,
      evidence: candidate.evidence,
      oneLineVerdict: candidate.oneLineVerdict,
      recommendedCampaign: candidate.recommendedCampaign
    })));
    const shortlistMarkdown = renderShortlistWorkspaceMarkdown({ product, shortlist });

    assert.match(singleMarkdown, /# Trend-Fit Workspace Memo/);
    assert.match(singleMarkdown, /Product: LEGO/);
    assert.match(singleMarkdown, /Trend: F1 race weekend/);
    assert.match(singleMarkdown, /Evidence gaps/);
    assert.match(shortlistMarkdown, /# Trend Shortlist Workspace Report/);
    assert.match(shortlistMarkdown, /F1 race weekend/);
    assert.match(shortlistMarkdown, /World Cup fan culture/);
  });

  it("builds a fixture-backed provider preview without exposing editable source tiers", () => {
    const candidate: WorkspaceCandidate = {
      ...f1Candidate,
      scores: {
        ...f1Candidate.scores,
        brandSafety: 100
      },
      evidence: f1Candidate.evidence.filter((item) => item.dimension !== "brandSafety")
    };
    const result = evaluateSingleWorkspaceTrend(product, candidate);
    const gaps = buildWorkspaceEvidenceGaps(result.rigor);
    const preview = buildWorkspaceProviderPreview({
      product,
      candidate,
      gaps,
      mode: "single"
    });

    assert.equal(preview.targetedSlots.some((slot) => slot.slot === "brandSafety"), true);
    assert.match(preview.dryRunCommand.command, /--dry-run-provider-commands/);
    assert.match(preview.dryRunCommand.command, /--provider opencli/);
    assert.match(preview.fixtureCommand.command, /--fixture-results examples\/dji-middle-east-search-results\.fixture\.json/);
    assert.equal(preview.commandsText.includes("sourceTier"), false);
    assert.equal(preview.targetedSlots.some((slot) => slot.plannedSources.some((source) => /policy|backlash/i.test(source))), true);
  });

  it("materializes editable evidence rows through the source-tier classifier", () => {
    const rows = buildWorkspaceEvidenceRowsFromEvidence([
      {
        id: "vendor-magic",
        dimension: "creativeFeasibility",
        direction: "confirm",
        magnitude: "strong",
        confidence: "high",
        sourceTier: "primary",
        sourceUrl: "https://www.shopify.com/magic",
        note: "Vendor page should not stay primary when edited in the workspace."
      }
    ]);
    const materialized = materializeWorkspaceEvidenceRows([
      {
        ...rows[0],
        desiredConfidence: "high",
        verificationStatus: "verified",
        sourceSignals: ["vendor_copy"]
      }
    ]);

    assert.equal(materialized.evidence.length, 1);
    assert.equal(materialized.evidence[0].sourceTier, "proxy");
    assert.equal(materialized.evidence[0].confidence, "medium");
    assert.equal(materialized.rows[0].computedSourceTier, "proxy");
    assert.equal(materialized.rows[0].computedConfidence, "medium");
    assert.equal(materialized.rows[0].classification.action, "keep");
    assert.match(materialized.rows[0].classification.reasons.join(" "), /vendor copy/);
  });

  it("drops contradicted workspace evidence rows before scoring", () => {
    const materialized = materializeWorkspaceEvidenceRows([
      {
        id: "bad-source",
        dimension: "brandSafety",
        direction: "down",
        magnitude: "strong",
        desiredConfidence: "high",
        sourceUrl: "https://example.com/claim-not-present",
        verificationStatus: "contradicted",
        sourceSignals: ["reputable_journalism"],
        note: "This should be dropped."
      }
    ]);

    assert.equal(materialized.evidence.length, 0);
    assert.equal(materialized.droppedRows.length, 1);
    assert.equal(materialized.rows[0].computedSourceTier, null);
    assert.equal(materialized.rows[0].classification.action, "drop");
  });
});
