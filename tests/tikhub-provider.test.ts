import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractSnippets, snippetsToCandidates } from "../lib/tikhub-provider";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { SCORE_KEYS, type Scores } from "../lib/types";

const neutral = Object.fromEntries(SCORE_KEYS.map((k) => [k, 50])) as Scores;

describe("tikhub provider — defensive deep-text extractor", () => {
  it("pulls text from title/desc/caption keys at any nesting depth", () => {
    const response = {
      data: {
        items: [
          { note_card: { display_title: "ignored", title: "静奢风穿搭分享" }, desc: "低调高级感" },
          { aweme_info: { caption: "old money 风格教程" } }
        ]
      }
    };
    const snippets = extractSnippets(response, 5);
    assert.ok(snippets.includes("静奢风穿搭分享"));
    assert.ok(snippets.includes("低调高级感"));
    assert.ok(snippets.includes("old money 风格教程"));
  });

  it("dedupes, applies the length filter, and respects max", () => {
    const response = { a: { title: "repeat" }, b: { title: "repeat" }, c: { desc: "x" }, d: { content: "valid text" } };
    const snippets = extractSnippets(response, 5);
    assert.equal(snippets.filter((s) => s === "repeat").length, 1, "deduped");
    assert.ok(!snippets.includes("x"), "too short (<4) filtered");
    assert.ok(snippets.includes("valid text"));
  });

  it("returns nothing for an empty / textless response", () => {
    assert.deepEqual(extractSnippets({ data: { items: [] } }), []);
    assert.deepEqual(extractSnippets({ count: 5, ok: true }), []);
  });
});

describe("tikhub provider — snippet → candidate mapping", () => {
  const platform = {
    key: "xiaohongshu",
    label: "小红书",
    searchUrl: (q: string) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`
  };

  it("maps each snippet to audience + use-case candidates with comment_corpus + medium cap", () => {
    const candidates = snippetsToCandidates(platform, ["静奢风穿搭", "通勤高级感"], "静奢风");
    assert.equal(candidates.length, 4); // 2 snippets x 2 dimensions
    assert.ok(candidates.every((c) => c.verificationStatus === "verified"));
    assert.ok(candidates.every((c) => c.sourceSignals?.includes("comment_corpus")));
    assert.ok(candidates.every((c) => c.desiredConfidence === "medium"));
    assert.match(candidates[0].note, /^小红书：/);
    assert.match(candidates[0].sourceUrl, /xiaohongshu\.com/);
  });

  it("classifier grades it primary but buildEvidenceDraft clamps confidence to medium", () => {
    const draft = buildEvidenceDraft({
      id: "t",
      case: "t",
      researchDate: "2026-06-14",
      tooling: "tikhub",
      baselineScores: neutral,
      candidates: snippetsToCandidates(platform, ["静奢风穿搭", "通勤高级感"], "静奢风")
    });
    assert.ok(draft.evidence.length > 0);
    assert.ok(draft.evidence.every((e) => e.sourceTier === "primary" && e.confidence === "medium"));
  });
});
