import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { writeEvidenceCaseFiles, type EvidenceCaseCliInput } from "../lib/evidence-case-file-writer";

const input: EvidenceCaseCliInput = {
  id: "fixture_case_evidence",
  caseId: "fixture_case",
  researchDate: "2026-06-10",
  riskTolerance: "medium",
  profileUsed: "default",
  baselineScores: {
    audienceOverlap: 75,
    useCaseRelevance: 75,
    messageBridge: 75,
    creativeFeasibility: 75,
    commercialIntent: 75,
    brandSafety: 75,
    timingSaturation: 75
  },
  report: {
    title: "Fixture Product x Fixture Trend",
    productName: "Fixture Product",
    trendName: "Fixture Trend",
    recommendation: "Run a small validation test before scaling."
  },
  customerResearchFindings: [
    {
      id: "customer-audience",
      theme: "audience_language",
      sourceType: "reddit_thread",
      sourceUrl: "https://www.reddit.com/r/fitness/comments/abc123/protein_drinks/",
      verificationStatus: "verified",
      confidence: "high",
      intensity: "weak",
      quote: "I want something easy after work.",
      note: "Raw user language confirms audience fit."
    }
  ],
  seoKeywordFindings: [
    {
      id: "seo-buying",
      signal: "related_buying_query",
      query: "where to buy fixture product",
      sourceUrl: "https://serpapi.com/search?engine=google_trends&q=fixture",
      verificationStatus: "verified",
      growthLabel: "+120%",
      note: "Related query contains buying language."
    }
  ],
  competitorResearchFindings: [
    {
      id: "competitor-content",
      competitorName: "Fixture Competitor",
      competitorUrl: "https://example.com/fixture-competitor",
      origin: "competitor-profiling",
      findingType: "competitor_content_angle",
      sourceType: "direct_competitor_campaign",
      sourceUrl: "https://example.com/fixture-competitor/campaign",
      verificationStatus: "verified",
      confidence: "high",
      intensity: "moderate",
      quote: "A campaign angle that maps to the trend.",
      note: "Competitor content confirms message bridge."
    }
  ]
};

function makeTempProject(): { root: string; dataDir: string; outputDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "evidence-case-writer-"));
  return {
    root,
    dataDir: path.join(root, "data"),
    outputDir: path.join(root, "outputs")
  };
}

describe("evidence case CLI/file writer", () => {
  it("writes evidence JSON and markdown report from provider findings", () => {
    const { dataDir, outputDir } = makeTempProject();

    const result = writeEvidenceCaseFiles(input, { dataDir, outputDir });

    assert.equal(result.evidenceCase.id, "fixture_case_evidence");
    assert.equal(result.candidateCount, 3);
    assert.equal(result.evidenceCount, 3);
    assert.equal(path.basename(result.evidencePath), "fixture_case_evidence.json");
    assert.equal(path.basename(result.reportPath), "fixture_case_evidence_case.md");

    const evidence = JSON.parse(fs.readFileSync(result.evidencePath, "utf8"));
    const report = fs.readFileSync(result.reportPath, "utf8");

    assert.equal(evidence.case, "fixture_case");
    assert.equal(evidence.expectedAdjustedScores.commercialIntent, 100);
    assert.match(report, /# 证据简报：Fixture Product x Fixture Trend/);
    assert.match(report, /证据门槛：/);
    assert.doesNotMatch(report, /Evidence Case|Executive Read|Collector Notes|Before \/ After|Evidence Items|Rigor Layer|Next Evidence To Collect|Source:/);
    assert.match(report, /customer-audience/);
  });

  it("runs from the command line with explicit input and output directories", () => {
    const { root, dataDir, outputDir } = makeTempProject();
    const inputPath = path.join(root, "input.json");
    fs.writeFileSync(inputPath, `${JSON.stringify(input, null, 2)}\n`);

    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/evidence-case.ts", "--input", inputPath, "--data-dir", dataDir, "--output-dir", outputDir],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /fixture_case_evidence.json/);
    assert.match(result.stdout, /fixture_case_evidence_case.md/);
    assert.equal(fs.existsSync(path.join(dataDir, "fixture_case_evidence.json")), true);
    assert.equal(fs.existsSync(path.join(outputDir, "fixture_case_evidence_case.md")), true);
  });
});
