import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CollectedSnippet } from "../lib/evidence-collector";
import {
  buildStanceSystemPrompt,
  chunkStanceSnippets,
  mapStanceJudgementsToCandidates,
  validateStanceJudgements,
  type StanceCaseContext,
  type StanceJudgement
} from "../lib/evidence-stance";

const context: StanceCaseContext = {
  productName: "PixAI",
  category: "AI anime art generator",
  market: "Global creators",
  audience: "Anime artists and OC creators",
  positioning: "Fast LoRA-based character creation",
  sellingPoints: ["LoRA workflows", "anime model library"],
  trendName: "AI original characters",
  trendDescription: "Creators publish AI-generated original characters"
};

function snippet(id: string, text = "PixAI users compare LoRA workflows for original characters"): CollectedSnippet {
  return {
    id,
    provider: "tikhub",
    platform: "reddit",
    query: "PixAI",
    text,
    sourceUrl: `https://www.reddit.com/comments/${id}`,
    canonicalSourceId: `reddit:${id}`,
    verificationStatus: "verified",
    sourceSignals: ["comment_corpus"]
  };
}

describe("evidence stance", () => {
  it("builds product-rich prompts without baseline scores", () => {
    const prompt = buildStanceSystemPrompt(context);
    assert.match(prompt, /AI anime art generator/);
    assert.match(prompt, /Anime artists and OC creators/);
    assert.match(prompt, /LoRA-based character creation/);
    assert.match(prompt, /anime model library/);
    assert.doesNotMatch(prompt, /baseline|100|75|50|25/);
  });

  it("batches snippets at twelve per Gemini request", () => {
    const batches = chunkStanceSnippets(Array.from({ length: 25 }, (_, index) => snippet(`s${index}`)));
    assert.deepEqual(batches.map((batch) => batch.length), [12, 12, 1]);
  });

  it("requires exactly one judgement for every input id", () => {
    const snippets = [snippet("s1"), snippet("s2")];
    assert.throws(() => validateStanceJudgements(snippets, [{ snippetId: "s1", impacts: [] }]), /missing.*s2/i);
    assert.throws(() => validateStanceJudgements(snippets, [
      { snippetId: "s1", impacts: [] },
      { snippetId: "s1", impacts: [] },
      { snippetId: "s2", impacts: [] }
    ]), /duplicate.*s1/i);
    assert.throws(() => validateStanceJudgements(snippets, [
      { snippetId: "s1", impacts: [] },
      { snippetId: "s2", impacts: [] },
      { snippetId: "other", impacts: [] }
    ]), /unexpected.*other/i);
  });

  it("rejects duplicate dimensions in one snippet judgement", () => {
    assert.throws(() => validateStanceJudgements([snippet("s1")], [{
      snippetId: "s1",
      impacts: [
        { dimension: "audienceOverlap", stance: "supports", quote: "PixAI users compare LoRA", claim: "one" },
        { dimension: "audienceOverlap", stance: "contradicts", quote: "PixAI users compare LoRA", claim: "two" }
      ]
    }]), /duplicate dimension.*audienceOverlap/i);
  });

  it("keeps only meaningful verbatim quotes and preserves source provenance", () => {
    const source = snippet("s1", "#PixAI PixAI users compare LoRA workflows for original characters");
    const judgements: StanceJudgement[] = [{
      snippetId: "s1",
      impacts: [
        { dimension: "audienceOverlap", stance: "supports", quote: "#PixAI", claim: "tag only" },
        { dimension: "useCaseRelevance", stance: "supports", quote: "not in source text", claim: "hallucinated" },
        { dimension: "creativeFeasibility", stance: "supports", quote: "PixAI users compare LoRA workflows", claim: "real workflow" }
      ]
    }];
    const candidates = mapStanceJudgementsToCandidates([source], judgements);
    assert.deepEqual(candidates.map((candidate) => candidate.dimension), ["creativeFeasibility"]);
    assert.equal(candidates[0].canonicalSourceId, "reddit:s1");
    assert.equal(candidates[0].sourceUrl, source.sourceUrl);
    assert.deepEqual(candidates[0].sourceSignals, ["comment_corpus"]);
  });
});
