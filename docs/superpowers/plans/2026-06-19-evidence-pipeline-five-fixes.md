# Evidence Pipeline Five Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the offline PixAI/LEGO evidence pipeline reject irrelevant or duplicate signals, preserve source provenance, validate Gemini output, and prevent contradictory evidence from satisfying positive rigor gates.

**Architecture:** Keep the existing providers and scoring engine. Add optional provenance fields to the existing evidence types, one small pure stance module, and conservative central validation in `buildEvidenceDraft`; no new dependency and no UI work.

**Tech Stack:** TypeScript, Node test runner, existing `@google/genai` SDK.

---

### Task 1: Collapse duplicate source pressure and tighten SerpApi relevance

**Files:**
- Modify: `lib/evidence-collector.ts`
- Modify: `lib/seo-keyword-provider.ts`
- Test: `tests/evidence-collector.test.ts`
- Test: `tests/seo-keyword-provider.test.ts`

- [x] Add failing tests proving one canonical source contributes at most once per dimension, conflicting directions from one source are dropped, `ai news today` and `best ai video generator` are irrelevant to `AI art generator`.
- [x] Run `node --import tsx --test tests/evidence-collector.test.ts tests/seo-keyword-provider.test.ts`; verify expected failures.
- [x] Add optional `canonicalSourceId` to `EvidenceCandidate`; collapse candidates in `buildEvidenceDraft` before classification. Keep the strongest same-direction row; drop conflicted groups.
- [x] Require a discriminating trend token (generic `ai` / `generator` matches do not count); keep the current spam filter.
- [x] Re-run focused tests and verify zero failures.

### Task 2: Preserve structured snippets and canonical TikHub posts

**Files:**
- Modify: `lib/evidence-collector.ts`
- Modify: `lib/tikhub-provider.ts`
- Modify: `lib/free-evidence-providers.ts`
- Test: `tests/tikhub-provider.test.ts`
- Test: `tests/free-evidence-providers.test.ts`

- [x] Add failing tests for `CollectedSnippet` provenance, nested Xiaohongshu/Reddit post extraction, canonical post URLs, and rejection of usernames/dates/audio/navigation text.
- [x] Run provider tests and verify failures.
- [x] Define `CollectedSnippet` with `id`, `provider`, `platform`, `query`, `text`, `sourceUrl`, `canonicalSourceId`, `verificationStatus`, and `sourceSignals`.
- [x] Replace generic first-three-string extraction with a small platform config of content/id/permalink keys. Return snippets plus backward-compatible candidates.
- [x] Add HN/GDELT snippets to `FreeEvidenceResult`; preserve provider-specific source signals instead of rewriting them later.
- [x] Re-run provider tests and verify zero failures.

### Task 3: Add a pure, validated stance module

**Files:**
- Create: `lib/evidence-stance.ts`
- Create: `tests/evidence-stance.test.ts`
- Modify: `scripts/collect-and-judge.ts`

- [x] Add failing tests proving: complete snippet-id coverage is required; duplicate dimensions are rejected; pure hashtags/short labels fail quote validation; valid quotes preserve canonical source metadata.
- [x] Run `node --import tsx --test tests/evidence-stance.test.ts`; verify module-not-found failure.
- [x] Move prompt/schema/mapping into `lib/evidence-stance.ts`. Include product category, audience, positioning, selling points, market, trend, and query lane in the prompt.
- [x] Use schema enums, one impact per dimension, verbatim meaningful quote checks, and exact judgement coverage.
- [x] Batch at 12 snippets in the script; fail closed on malformed output. Record model and prompt version in fixture tooling.
- [x] Re-run stance tests and verify zero failures.

### Task 4: Make rigor stance-aware without breaking legacy fixtures

**Files:**
- Modify: `lib/evidence-adjustment.ts`
- Modify: `lib/evidence-collector.ts`
- Modify: `lib/recommendation-rigor.ts`
- Modify: `lib/free-evidence-providers.ts`
- Modify: `lib/tikhub-provider.ts`
- Test: `tests/evidence-adjustment.test.ts`
- Test: `tests/recommendation-rigor.test.ts`

- [x] Add failing tests proving contextual evidence has zero pressure and cannot satisfy gates; non-proxy `down` evidence cannot lift caps or satisfy positive slots; legacy decision `confirm` fixtures still work.
- [x] Run focused tests and verify failures.
- [x] Add optional `evidenceUse: "context" | "decision"`; absence remains decision for committed legacy fixtures.
- [x] Mark raw HN/GDELT/TikHub candidates context, AI/Serp directional candidates decision.
- [x] Replace direction-blind rigor lookup with non-proxy decision support: `up`, plus legacy `confirm`; never `down`.
- [x] Re-run focused tests and verify zero failures.

### Task 5: Integrate the offline script and verify

**Files:**
- Modify: `scripts/collect-and-judge.ts`
- Modify: `lib/demo-fixture-guard.ts`
- Test: `tests/demo-fixture-guard.test.ts`
- Test: all `tests/*.test.ts`

- [x] Add a failing guard test requiring at least two canonical decision sources for every moved dimension.
- [x] Run the guard test and verify failure.
- [x] Load PixAI context from `data/demo_pixai.json`, keep LEGO config minimal, consume `CollectedSnippet[]`, reuse `seoKeywordFindingsToCandidates`, and generate the complete fixture through `generateEvidenceAdjustmentCase`.
- [x] Make `--dry` write no fixture; preserve cache behavior. Correct the stale CLI usage text.
- [x] Run focused tests, `npm test`, and `npm run build`; all must exit 0.
- [x] Run `git diff --check` and inspect the final diff. Do not call paid APIs in verification.

## Deliberate Ponytail Deferrals

- No live `/evaluate` stance integration; add only after the offline PixAI and LEGO fixtures remain stable under the hardened rules.
- No UI/provider diagnostics work.
- No refactor of `EvaluateClient`, `WorkspaceClient`, or the demo registry.
