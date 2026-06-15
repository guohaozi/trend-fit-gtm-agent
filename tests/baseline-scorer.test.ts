import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { parseBaselinePayload, snapToAnchor } from "../lib/baseline-scorer";
import { POST as baselineRoutePost } from "../app/api/evaluate/baseline/route";
import { checkAccess, clientIp, gatingEnabled } from "../lib/access-gate";
import { SCORE_KEYS } from "../lib/types";

describe("baseline scorer — pure helpers", () => {
  it("snaps arbitrary numbers to the nearest legal anchor", () => {
    assert.equal(snapToAnchor(0), 0);
    assert.equal(snapToAnchor(12), 0);
    assert.equal(snapToAnchor(13), 25);
    assert.equal(snapToAnchor(60), 50);
    assert.equal(snapToAnchor(63), 75);
    assert.equal(snapToAnchor(100), 100);
    assert.equal(snapToAnchor(140), 100); // clamp high
    assert.equal(snapToAnchor(-20), 0); // clamp low
  });

  it("defaults invalid scores to the neutral anchor 50", () => {
    assert.equal(snapToAnchor("nope"), 50);
    assert.equal(snapToAnchor(undefined), 50);
    assert.equal(snapToAnchor(NaN), 50);
  });

  it("parses a well-formed payload into engine-ready anchor scores", () => {
    const payload = {
      audienceOverlap: { score: 75, rationale: "受众高度重合" },
      useCaseRelevance: { score: 70, rationale: "场景自然" }, // off-anchor → snaps to 75
      messageBridge: { score: 50, rationale: "卖点可桥接" },
      creativeFeasibility: { score: 75, rationale: "易做内容" },
      commercialIntent: { score: 25, rationale: "购买意图弱" },
      brandSafety: { score: 100, rationale: "无明显风险" },
      timingSaturation: { score: 50, rationale: "仍有空间" },
      overallRationale: "适合先做小测试。"
    };
    const result = parseBaselinePayload(payload);

    for (const key of SCORE_KEYS) {
      assert.ok([0, 25, 50, 75, 100].includes(result.scores[key]), `${key} must be a legal anchor`);
    }
    assert.equal(result.scores.useCaseRelevance, 75, "70 snaps to the nearest anchor 75");
    assert.equal(result.rationales.audienceOverlap, "受众高度重合");
    assert.equal(result.overallRationale, "适合先做小测试。");
  });

  it("fills missing dimensions with a neutral score instead of throwing", () => {
    const result = parseBaselinePayload({ audienceOverlap: { score: 75, rationale: "x" } });
    assert.equal(result.scores.audienceOverlap, 75);
    assert.equal(result.scores.brandSafety, 50, "missing dimension defaults to 50");
    assert.equal(result.rationales.brandSafety, "");
  });

  it("rejects a non-object payload", () => {
    assert.throws(() => parseBaselinePayload(null));
    assert.throws(() => parseBaselinePayload("oops"));
  });
});

describe("baseline scorer — API route graceful degradation", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("returns 503 with setupRequired when GEMINI_API_KEY is absent", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await baselineRoutePost(
      new Request("http://test/api/evaluate/baseline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: { name: "X" }, trend: { trendName: "Y" } })
      })
    );
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.setupRequired, true);
  });

  it("returns 400 for missing product/trend names (no model call)", async () => {
    process.env.GEMINI_API_KEY = "test-key-not-used";
    const response = await baselineRoutePost(
      new Request("http://test/api/evaluate/baseline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: {}, trend: {} })
      })
    );
    assert.equal(response.status, 400);
  });
});

describe("access gate — disabled / parsing paths (no Redis needed)", () => {
  it("is disabled (open) when ACCESS_CODES is not configured", async () => {
    assert.equal(gatingEnabled(), false);
    const result = await checkAccess({ code: "", ip: "1.2.3.4" });
    assert.deepEqual(result, { ok: true, gated: false, remaining: null });
  });

  it("parses the caller IP from x-forwarded-for (first hop)", () => {
    const request = new Request("http://test/", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }
    });
    assert.equal(clientIp(request), "203.0.113.7");
  });

  it("returns empty IP when no proxy headers are present", () => {
    assert.equal(clientIp(new Request("http://test/")), "");
  });
});
