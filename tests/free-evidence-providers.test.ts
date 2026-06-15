import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageTone,
  mapGdeltToCandidates,
  mapHnToCandidates,
  mapRedditToCandidates
} from "../lib/free-evidence-providers";
import { buildEvidenceDraft } from "../lib/evidence-collector";
import { classifySourceTier } from "../lib/source-tier-classifier";
import { SCORE_KEYS, type Scores } from "../lib/types";

const neutral = Object.fromEntries(SCORE_KEYS.map((k) => [k, 50])) as Scores;

describe("free evidence providers — Reddit", () => {
  const listing = {
    data: {
      children: [
        { data: { title: "Why everyone is into quiet luxury now", permalink: "/r/malefashion/comments/abc/x/", subreddit: "malefashion" } },
        { data: { title: "Old money aesthetic on a budget", permalink: "/r/frugalmalefashion/comments/def/y/", subreddit: "frugalmalefashion" } }
      ]
    }
  };

  it("maps each post to audience + use-case candidates only (raw-language lanes)", () => {
    const candidates = mapRedditToCandidates(listing);
    assert.equal(candidates.length, 4); // 2 posts x 2 dimensions
    const dims = new Set(candidates.map((c) => c.dimension));
    assert.deepEqual([...dims].sort(), ["audienceOverlap", "useCaseRelevance"]);
    assert.ok(candidates.every((c) => c.verificationStatus === "verified"));
    assert.match(candidates[0].note, /Reddit r\/malefashion/);
  });

  it("classifier grades a Reddit raw-language candidate as primary/medium", () => {
    const c = mapRedditToCandidates(listing)[0];
    const cls = classifySourceTier({
      sourceUrl: c.sourceUrl,
      dimension: c.dimension,
      verificationStatus: c.verificationStatus,
      sourceSignals: c.sourceSignals
    });
    assert.equal(cls.sourceTier, "primary");
    assert.equal(cls.maxConfidence, "medium");
  });

  it("returns nothing for an empty listing", () => {
    assert.equal(mapRedditToCandidates({ data: { children: [] } }).length, 0);
  });
});

describe("free evidence providers — Hacker News", () => {
  const hn = {
    hits: [
      { objectID: "111", title: "Show HN: AI photo before/after tool", points: 240, num_comments: 88 },
      { objectID: "222", title: "The rise of before/after content", points: 30, num_comments: 12 }
    ]
  };

  it("tags HN as comment_corpus but caps desired confidence at medium", () => {
    const candidates = mapHnToCandidates(hn);
    assert.equal(candidates.length, 4);
    assert.ok(candidates.every((c) => c.sourceSignals?.includes("comment_corpus")));
    assert.ok(candidates.every((c) => c.desiredConfidence === "medium"));
  });

  it("buildEvidenceDraft clamps HN evidence to medium confidence (not high)", () => {
    const draft = buildEvidenceDraft({
      id: "t",
      case: "t",
      researchDate: "2026-06-14",
      tooling: "test",
      baselineScores: neutral,
      candidates: mapHnToCandidates(hn)
    });
    assert.ok(draft.evidence.length > 0);
    assert.ok(draft.evidence.every((e) => e.confidence === "medium"));
    assert.ok(draft.evidence.every((e) => e.sourceTier === "primary"));
  });
});

describe("free evidence providers — GDELT", () => {
  it("computes a count-weighted average tone", () => {
    const tone = averageTone({
      tonechart: [
        { bin: -5, count: 8 },
        { bin: 0, count: 2 }
      ]
    });
    assert.equal(tone, -4); // (-5*8 + 0*2) / 10
    assert.equal(averageTone({ tonechart: [] }), null);
  });

  it("negative tone produces a brandSafety down-signal; all GDELT stays proxy/low", () => {
    const artList = { articles: [{ url: "https://news.example.com/a", title: "Backlash over X", domain: "news.example.com" }] };
    const candidates = mapGdeltToCandidates(artList, -3, 5);
    const brand = candidates.find((c) => c.dimension === "brandSafety");
    assert.ok(brand);
    assert.equal(brand!.direction, "down");
    assert.ok(candidates.every((c) => c.verificationStatus === "unverified"));

    const draft = buildEvidenceDraft({
      id: "t",
      case: "t",
      researchDate: "2026-06-14",
      tooling: "test",
      baselineScores: neutral,
      candidates
    });
    assert.ok(draft.evidence.every((e) => e.sourceTier === "proxy" && e.confidence === "low"));
  });

  it("returns nothing when there are no articles", () => {
    assert.equal(mapGdeltToCandidates({ articles: [] }, -3).length, 0);
  });
});
