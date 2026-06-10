import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import {
  buildResearchQueries,
  runEvidenceCaseResearch,
  type ResearchSearchResult
} from "../lib/evidence-case-research-runner";

const searchResults: ResearchSearchResult[] = [
  {
    lane: "audience",
    query: "DJI drones Middle East audience",
    title: "Dubai creators discuss drone shots for tourism videos",
    url: "https://www.reddit.com/r/dubai/comments/abc123/drone_video/",
    snippet: "Creators ask whether DJI drones are worth it for desert and hotel video shoots."
  },
  {
    lane: "commercial",
    query: "DJI drones Middle East where to buy",
    title: "Middle East buyers adopt drones for inspection and public safety",
    url: "https://apnews.com/article/example-dji-enterprise-middle-east",
    snippet: "Enterprise drones are sold for public safety, inspection, and mapping workflows."
  },
  {
    lane: "brandSafety",
    query: "UAE drone regulations DJI safety",
    title: "UAE drone regulations and aviation safety",
    url: "https://www.gcaa.gov.ae/",
    snippet: "Drone users need aviation approval and must follow local safety rules."
  },
  {
    lane: "timingSaturation",
    query: "Middle East drone tourism smart city inspection market",
    title: "Middle East smart city and drone inspection programs expand",
    url: "https://apnews.com/article/example-drone-middle-east",
    snippet: "Tourism, smart city, and energy inspection programs are increasing drone use."
  }
];

function makeTempProject(): { root: string; dataDir: string; outputDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-case-research-"));
  return {
    root,
    dataDir: path.join(root, "data"),
    outputDir: path.join(root, "outputs")
  };
}

describe("evidence case research runner", () => {
  it("builds platform-aware research queries for a product, market, and trend", () => {
    const queries = buildResearchQueries({
      product: "DJI drones",
      market: "UAE Saudi Middle East",
      trend: "video creation security inspection tourism enablement",
      competitors: ["Autel", "Skydio"],
      platforms: ["web", "reddit", "x", "xiaohongshu", "youtube"]
    });

    assert.equal(queries.length, 9);
    assert.deepEqual(
      queries.map((query) => query.lane),
      [
        "audience",
        "useCase",
        "commercial",
        "timingSaturation",
        "brandSafety",
        "competitor",
        "audience",
        "audience",
        "audience"
      ]
    );
    assert.match(queries[0].query, /DJI drones/);
    assert.match(queries[0].query, /UAE Saudi Middle East/);
    assert.match(queries[6].query, /site:reddit\.com/);
    assert.match(queries[7].query, /site:x\.com OR site:twitter\.com/);
    assert.match(queries[8].query, /site:xiaohongshu\.com OR site:youtube\.com/);
  });

  it("writes an evidence case from fixture search results without live network", async () => {
    const { dataDir, outputDir } = makeTempProject();
    const result = await runEvidenceCaseResearch({
      product: "DJI drones",
      market: "Middle East",
      trend: "video creation, security inspection, and tourism enablement",
      riskTolerance: "high",
      profileUsed: "b2b_pipeline",
      competitors: ["Autel", "Skydio"],
      provider: {
        search: async () => searchResults
      },
      dataDir,
      outputDir,
      researchDate: "2026-06-10"
    });

    assert.equal(result.input.caseId, "dji_drones_middle_east_video_creation_security_inspection_and_tourism_enablement");
    assert.equal(result.fileResult.candidateCount, 4);
    assert.equal(result.fileResult.evidenceCount, 4);
    assert.equal(fs.existsSync(result.fileResult.evidencePath), true);
    assert.equal(fs.existsSync(result.fileResult.reportPath), true);

    const evidence = JSON.parse(fs.readFileSync(result.fileResult.evidencePath, "utf8"));
    const report = fs.readFileSync(result.fileResult.reportPath, "utf8");

    assert.equal(evidence.profileUsed, "b2b_pipeline");
    assert.equal(evidence.expectedAdjustedScores.commercialIntent, 100);
    assert.match(report, /DJI drones x video creation, security inspection, and tourism enablement in Middle East/);
    assert.match(report, /Candidates received: \*\*4\*\*/);
  });

  it("runs from the command line with a fixture search-results file", () => {
    const { root, dataDir, outputDir } = makeTempProject();
    const fixturePath = path.join(root, "search-results.json");
    fs.writeFileSync(fixturePath, `${JSON.stringify(searchResults, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/evidence-case-research.ts",
        "--product",
        "DJI drones",
        "--market",
        "Middle East",
        "--trend",
        "video creation security inspection tourism enablement",
        "--risk",
        "high",
        "--profile",
        "b2b_pipeline",
        "--fixture-results",
        fixturePath,
        "--data-dir",
        dataDir,
        "--output-dir",
        outputDir
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dji_drones_middle_east_video_creation_security_inspection_tourism_enablement_evidence\.json/);
    assert.match(result.stdout, /accepted evidence: 4/);
  });
});
