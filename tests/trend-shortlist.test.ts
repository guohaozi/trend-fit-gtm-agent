import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  buildTrendShortlist,
  renderTrendShortlistMarkdown,
  type TrendShortlistInput
} from "../lib/trend-shortlist";

const dataDir = path.join(process.cwd(), "data");

function readShortlist(fileName: string): TrendShortlistInput & { expectedWinnerId: string } {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as TrendShortlistInput & {
    expectedWinnerId: string;
  };
}

describe("trend shortlist ranking", () => {
  it("ranks on gated band before raw adjusted total", () => {
    const shortlist = buildTrendShortlist({
      id: "ranking_contract",
      productName: "Example product",
      profileUsed: "default",
      riskTolerance: "medium",
      candidates: [
        {
          id: "assumption_only_strong_go",
          trendName: "Assumption-only viral fit",
          baselineScores: {
            audienceOverlap: 100,
            useCaseRelevance: 100,
            messageBridge: 100,
            creativeFeasibility: 100,
            commercialIntent: 75,
            brandSafety: 75,
            timingSaturation: 75
          },
          evidence: [],
          oneLineVerdict: "Looks strong on assumptions, but the evidence gate downgrades it."
        },
        {
          id: "evidenced_strong_go",
          trendName: "Evidence-backed fit",
          baselineScores: {
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
              id: "audience-evidence",
              dimension: "audienceOverlap",
              direction: "confirm",
              magnitude: "moderate",
              confidence: "medium",
              sourceTier: "primary",
              sourceUrl: "https://example.com/audience",
              note: "Primary audience evidence confirms the audience fit."
            },
            {
              id: "brand-safety-evidence",
              dimension: "brandSafety",
              direction: "confirm",
              magnitude: "moderate",
              confidence: "medium",
              sourceTier: "secondary",
              sourceUrl: "https://example.com/brand-safety",
              note: "Secondary coverage confirms low brand-safety risk."
            },
            {
              id: "timing-evidence",
              dimension: "timingSaturation",
              direction: "confirm",
              magnitude: "moderate",
              confidence: "medium",
              sourceTier: "secondary",
              sourceUrl: "https://example.com/timing",
              note: "Secondary timing evidence confirms the trend is current."
            }
          ],
          oneLineVerdict: "Lower raw total, but it keeps Strong Go after the evidence gate."
        }
      ]
    });

    assert.equal(shortlist.rows[0].id, "evidenced_strong_go");
    assert.equal(shortlist.rows[0].rigor.gatedBand, "Strong Go");
    assert.equal(shortlist.rows[1].id, "assumption_only_strong_go");
    assert.equal(shortlist.rows[1].adjustedResult.total > shortlist.rows[0].adjustedResult.total, true);
    assert.equal(shortlist.rows[1].rigor.gatedBand, "Go");
  });

  it("builds the LEGO trend shortlist demo with F1 as the recommended trend", () => {
    const data = readShortlist("lego_trend_shortlist.json");
    const shortlist = buildTrendShortlist(data);
    const markdown = renderTrendShortlistMarkdown(shortlist);

    assert.equal(shortlist.winner.id, data.expectedWinnerId);
    assert.equal(shortlist.winner.id, "lego_f1_race_trend");
    assert.deepEqual(
      shortlist.rows.map((row) => row.id),
      ["lego_f1_race_trend", "lego_world_cup_trend", "lego_graduation_season_trend"]
    );
    assert.match(markdown, /Trend shortlist for LEGO/);
    assert.match(markdown, /F1 race weekend/);
    assert.match(markdown, /World Cup/);
    assert.match(markdown, /Graduation season/);
  });
});
