import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { EvidenceAdjustmentCase, EvidenceItem } from "../lib/evidence-adjustment";

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

function urlFor(item: EvidenceItem): URL {
  return new URL(item.sourceUrl);
}

function isVendorHelpOrDocs(url: URL): boolean {
  return url.hostname.startsWith("help.") || url.pathname.includes("/hc/en-us/articles/");
}

function isKnownVendorMarketingPage(url: URL): boolean {
  return url.hostname === "www.shopify.com" && url.pathname === "/magic";
}

function isListicleOrAffiliate(url: URL): boolean {
  const pathName = url.pathname.toLowerCase();
  return (
    pathName.includes("affordable") ||
    pathName.includes("dupe") ||
    pathName.includes("best-") ||
    pathName.includes("top-")
  );
}

function isSingleRedditThread(url: URL): boolean {
  return url.hostname.endsWith("reddit.com") && url.pathname.includes("/comments/");
}

describe("source-tier classifier guard", () => {
  it("does not allow forced-proxy URL patterns to be tagged non-proxy", () => {
    const failures = readEvidenceRecords()
      .filter(({ item }) => {
        const url = urlFor(item);
        return isVendorHelpOrDocs(url) || isKnownVendorMarketingPage(url) || isListicleOrAffiliate(url);
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
      .filter(({ item }) => isSingleRedditThread(urlFor(item)) && item.sourceTier === "primary")
      .filter(({ item }) => !allowedPrimaryDimensions.has(item.dimension) || item.confidence === "high")
      .map(
        ({ fileName, item }) =>
          `${fileName}:${item.id} ${item.dimension} Reddit thread cannot be primary/${item.confidence}`
      );

    assert.deepEqual(failures, []);
  });
});
