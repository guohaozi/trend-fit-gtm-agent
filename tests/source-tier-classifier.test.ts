import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { EvidenceAdjustmentCase, EvidenceItem } from "../lib/evidence-adjustment";
import {
  classifySourceTier,
  clampEvidenceConfidence,
  isForcedProxySource
} from "../lib/source-tier-classifier";

const dataDir = path.join(process.cwd(), "data");
const evidenceFiles = fs.readdirSync(dataDir).filter((fileName) => fileName.endsWith("_evidence.json"));

type EvidenceRecord = {
  fileName: string;
  item: EvidenceItem;
};

function readEvidenceRecords(): EvidenceRecord[] {
  return evidenceFiles.flatMap((fileName) => {
    const evidenceCase = JSON.parse(fs.readFileSync(path.join(dataDir, fileName), "utf8")) as EvidenceAdjustmentCase;
    return evidenceCase.evidence.map((item) => ({ fileName, item }));
  });
}

describe("source-tier classifier guard", () => {
  it("does not allow forced-proxy URL patterns to be tagged non-proxy", () => {
    const failures = readEvidenceRecords()
      .filter(({ item }) => {
        return isForcedProxySource(item.sourceUrl, item.dimension).isForcedProxy;
      })
      .filter(({ item }) => item.sourceTier !== "proxy")
      .map(({ fileName, item }) => `${fileName}:${item.id} ${item.sourceUrl} is ${item.sourceTier}`);

    assert.deepEqual(failures, []);
  });

  it("caps proxy evidence confidence at medium", () => {
    const failures = readEvidenceRecords()
      .filter(({ item }) => item.sourceTier === "proxy" && item.confidence === "high")
      .map(({ fileName, item }) => `${fileName}:${item.id} proxy evidence has high confidence`);

    assert.deepEqual(failures, []);
  });

  it("only treats single Reddit threads as primary raw user-language for audience or use-case", () => {
    const allowedPrimaryDimensions = new Set(["audienceOverlap", "useCaseRelevance"]);
    const failures = readEvidenceRecords()
      .filter(({ item }) => item.sourceUrl.includes("reddit.com") && item.sourceUrl.includes("/comments/"))
      .filter(({ item }) => item.sourceTier === "primary")
      .filter(({ item }) => !allowedPrimaryDimensions.has(item.dimension) || item.confidence === "high")
      .map(
        ({ fileName, item }) =>
          `${fileName}:${item.id} ${item.dimension} Reddit thread cannot be primary/${item.confidence}`
      );

    assert.deepEqual(failures, []);
  });

  it("classifies unverified sources as proxy with low-confidence evidence only", () => {
    const classification = classifySourceTier({
      sourceUrl: "https://www.nytimes.com/example",
      dimension: "timingSaturation",
      verificationStatus: "unverified",
      sourceSignals: ["reputable_journalism"]
    });

    assert.equal(classification.action, "keep");
    assert.equal(classification.sourceTier, "proxy");
    assert.equal(classification.maxConfidence, "low");
    assert.match(classification.reasons.join(" "), /unverified/i);
  });

  it("drops contradicted sources instead of allowing directional evidence", () => {
    const classification = classifySourceTier({
      sourceUrl: "https://example.com/article",
      dimension: "brandSafety",
      verificationStatus: "contradicted",
      sourceSignals: ["reputable_journalism"]
    });

    assert.equal(classification.action, "drop");
    assert.equal(classification.sourceTier, null);
  });

  it("allows one Reddit thread as medium-confidence primary only for raw audience or use-case language", () => {
    const audienceClassification = classifySourceTier({
      sourceUrl: "https://www.reddit.com/r/example/comments/abc123/thread/",
      dimension: "audienceOverlap",
      verificationStatus: "verified",
      sourceSignals: ["single_social_thread"]
    });
    const commercialClassification = classifySourceTier({
      sourceUrl: "https://www.reddit.com/r/example/comments/abc123/thread/",
      dimension: "commercialIntent",
      verificationStatus: "verified",
      sourceSignals: ["single_social_thread"]
    });

    assert.equal(audienceClassification.sourceTier, "primary");
    assert.equal(audienceClassification.maxConfidence, "medium");
    assert.equal(commercialClassification.sourceTier, "proxy");
    assert.equal(commercialClassification.maxConfidence, "medium");
  });

  it("keeps supplier-owned category reports secondary but caps their confidence at medium", () => {
    const classification = classifySourceTier({
      sourceUrl: "https://www.glanbianutritionals.com/en-au/node/2346",
      dimension: "commercialIntent",
      verificationStatus: "verified",
      sourceSignals: ["supplier_category_report"]
    });

    assert.equal(classification.action, "keep");
    assert.equal(classification.sourceTier, "secondary");
    assert.equal(classification.maxConfidence, "medium");
    assert.match(classification.reasons.join(" "), /supplier/i);
  });

  it("clamps requested evidence confidence to the source-tier ceiling", () => {
    assert.equal(clampEvidenceConfidence("high", "medium"), "medium");
    assert.equal(clampEvidenceConfidence("medium", "low"), "low");
    assert.equal(clampEvidenceConfidence("low", "high"), "low");
  });
});
