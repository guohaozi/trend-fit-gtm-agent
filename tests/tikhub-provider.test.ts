import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractTikhubSnippets, snippetsToCandidates } from "../lib/tikhub-provider";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { SCORE_KEYS, type Scores } from "../lib/types";

const neutral = Object.fromEntries(SCORE_KEYS.map((k) => [k, 50])) as Scores;

describe("tikhub provider — structured platform adapters", () => {
  it("extracts Xiaohongshu post text and ignores profile or audio labels", () => {
    const response = {
      data: {
        items: [
          {
            note: {
              id: "note-123",
              title: "静奢风穿搭分享",
              desc: "极简通勤穿搭，低饱和配色",
              user: { nickname: "穿搭小王" },
              music: { title: "original audio" }
            }
          }
        ]
      }
    };
    const snippets = extractTikhubSnippets("xiaohongshu", response, "静奢风");
    assert.deepEqual(snippets.map((snippet) => snippet.text), ["静奢风穿搭分享"]);
    assert.equal(snippets[0].canonicalSourceId, "xiaohongshu:note-123");
    assert.equal(snippets[0].sourceUrl, "https://www.xiaohongshu.com/explore/note-123");
  });

  it("preserves Reddit permalinks and ignores author/date metadata", () => {
    const response = {
      data: {
        children: [{
          data: {
            id: "abc123",
            title: "PixAI workflow comparison",
            author: "pixel_user",
            created_utc: "2026-06-19",
            permalink: "/r/StableDiffusion/comments/abc123/pixai_workflow/"
          }
        }]
      }
    };
    const snippets = extractTikhubSnippets("reddit", response, "PixAI");
    assert.deepEqual(snippets.map((snippet) => snippet.text), ["PixAI workflow comparison"]);
    assert.equal(snippets[0].sourceUrl, "https://www.reddit.com/r/StableDiffusion/comments/abc123/pixai_workflow/");
  });

  it("pairs an X post id with text in its legacy payload", () => {
    const response = {
      data: {
        result: {
          rest_id: "1900000000000000000",
          legacy: { full_text: "PixAI users compare LoRA workflows" },
          core: { user_results: { result: { legacy: { name: "Pixel Person" } } } }
        }
      }
    };
    const snippets = extractTikhubSnippets("twitter", response, "PixAI");
    assert.deepEqual(snippets.map((snippet) => snippet.text), ["PixAI users compare LoRA workflows"]);
    assert.equal(snippets[0].sourceUrl, "https://x.com/i/web/status/1900000000000000000");
  });

  it("returns nothing for an empty / textless response", () => {
    assert.deepEqual(extractTikhubSnippets("tiktok", { data: { items: [] } }, "PixAI"), []);
    assert.deepEqual(extractTikhubSnippets("tiktok", { count: 5, ok: true }, "PixAI"), []);
  });
});

describe("tikhub provider — snippet → candidate mapping", () => {
  const platform = {
    key: "xiaohongshu",
    label: "小红书",
    searchUrl: (q: string) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`
  };

  it("maps each snippet to audience + use-case candidates with comment_corpus + medium cap", () => {
    const snippets = ["静奢风穿搭", "通勤高级感"].map((text, index) => ({
      id: `xiaohongshu-${index}`,
      provider: "tikhub" as const,
      platform: "xiaohongshu",
      query: "静奢风",
      text,
      sourceUrl: `https://www.xiaohongshu.com/explore/${index}`,
      canonicalSourceId: `xiaohongshu:${index}`,
      verificationStatus: "verified" as const,
      sourceSignals: ["comment_corpus"] as const
    }));
    const candidates = snippetsToCandidates(platform, snippets);
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
      candidates: snippetsToCandidates(platform, ["静奢风穿搭", "通勤高级感"].map((text, index) => ({
        id: `xiaohongshu-${index}`,
        provider: "tikhub" as const,
        platform: "xiaohongshu",
        query: "静奢风",
        text,
        sourceUrl: `https://www.xiaohongshu.com/explore/${index}`,
        canonicalSourceId: `xiaohongshu:${index}`,
        verificationStatus: "verified" as const,
        sourceSignals: ["comment_corpus"] as const
      })))
    });
    assert.ok(draft.evidence.length > 0);
    assert.ok(draft.evidence.every((e) => e.sourceTier === "primary" && e.confidence === "medium"));
  });
});
