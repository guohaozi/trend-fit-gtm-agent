# Evidence Integrity Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent generic trend discussion from being treated as product-trend fit proof, make paid social collection explicit, and expose enough provider diagnostics to distinguish no demand from provider failure.

**Architecture:** Add an `evidenceUse` contract that separates contextual observations from decision evidence. Runtime search results start as `context`; a deterministic product/trend relevance classifier may promote a snippet to `decision`, and only decision evidence may affect scores, evidence gates, dimension caps, or fragility support. Provider runs return typed diagnostics, while TikHub is disabled unless the user explicitly enables paid social collection.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Node test runner, existing deterministic scoring/evidence pipeline.

---

## Audit Corrections That Govern This Plan

1. `direction: "confirm"` already produces zero score pressure in `lib/evidence-adjustment.ts`; the current defect does **not** directly raise anchor scores.
2. Generic HN/TikHub snippets still satisfy `audienceOrUseCase`, remove the unsupported-100 cap, and skip the unsupported-dimension fragility check because they are classified as non-proxy evidence. That is the P0 defect.
3. Adding a zero magnitude is not the right fix: magnitude does not control evidence-gate eligibility, and the current magnitude type has no zero value.
4. An empty provider response must not become a negative fit signal. Empty can mean no demand, timeout, rate limiting, disabled credentials, query mismatch, or response-schema drift. Negative score pressure requires an explicit contradictory observation.
5. The GitHub About URL is already `https://trend-fit-seven.vercel.app`; remove that completed item from the backlog.

## File Structure

- Create `lib/evidence-relevance.ts`: deterministic tokenization and fit-specific eligibility checks.
- Create `lib/evidence-provider-diagnostics.ts`: provider status/result metadata shared by the route and UI.
- Create `tests/evidence-relevance.test.ts`: bilingual relevance qualification coverage.
- Create `tests/evidence-provider-diagnostics.test.ts`: empty/error/disabled/ok semantics and aggregation coverage.
- Modify `lib/evidence-adjustment.ts`: add `EvidenceUse`, prevent contextual evidence from creating score pressure, export a shared eligibility helper.
- Modify `lib/evidence-collector.ts`: preserve `evidenceUse` from candidate to materialized evidence.
- Modify `lib/recommendation-rigor.ts`: accept only non-proxy decision evidence for gates, caps, and stability support.
- Modify `lib/free-evidence-providers.ts`: mark generic HN/GDELT observations as contextual and return diagnostics.
- Modify `lib/tikhub-provider.ts`: mark generic social snippets as contextual, qualify relevant snippets, filter requested platforms, and return diagnostics.
- Modify `app/api/evidence/collect/route.ts`: accept the full product/trend context and explicit paid-social selection.
- Modify `components/EvaluateClient.tsx`: send complete context, add paid-social opt-in, and distinguish contextual observations from decision evidence.
- Modify `tests/evidence-adjustment.test.ts`, `tests/evidence-collector.test.ts`, `tests/recommendation-rigor.test.ts`, `tests/free-evidence-providers.test.ts`, `tests/tikhub-provider.test.ts`, and `tests/route-smoke.test.ts` for regression coverage.
- Modify `README.md`, `docs/current-state.md`, and `docs/changelog.md` only after behavior ships and verification passes.

### Task 1: Add the contextual-versus-decision evidence contract

**Files:**
- Modify: `lib/evidence-adjustment.ts`
- Modify: `lib/evidence-collector.ts`
- Test: `tests/evidence-adjustment.test.ts`
- Test: `tests/evidence-collector.test.ts`

- [ ] **Step 1: Write failing adjustment and collector tests**

Add a test proving contextual evidence is displayable but cannot move a score:

```ts
it("keeps contextual evidence out of score pressure", () => {
  const baseline = Object.fromEntries(SCORE_KEYS.map((key) => [key, 50])) as Scores;
  const result = adjustScores(baseline, [
    {
      id: "context-only",
      dimension: "audienceOverlap",
      direction: "up",
      magnitude: "strong",
      confidence: "high",
      sourceTier: "primary",
      evidenceUse: "context",
      sourceUrl: "https://news.ycombinator.com/item?id=1",
      note: "Discussion exists, but product fit is not established."
    }
  ]);

  assert.equal(result.adjusted.audienceOverlap, 50);
  assert.equal(result.netByDimension.audienceOverlap, 0);
  assert.equal(result.stepsByDimension.audienceOverlap, 0);
  assert.equal(result.confidenceByDimension.audienceOverlap, "evidence-confirmed (high)");
});
```

Add a collector test proving the field survives classification:

```ts
assert.equal(draft.evidence[0].evidenceUse, "context");
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
node --import tsx --test tests/evidence-adjustment.test.ts tests/evidence-collector.test.ts
```

Expected: failure because `evidenceUse` is not part of `EvidenceItem`/`EvidenceCandidate` and contextual evidence still creates pressure when its direction is `up` or `down`.

- [ ] **Step 3: Implement the contract and compatibility rule**

In `lib/evidence-adjustment.ts`, add:

```ts
export type EvidenceUse = "context" | "decision";

export type EvidenceItem = {
  id: string;
  dimension: ScoreKey;
  direction: EvidenceDirection;
  magnitude: EvidenceMagnitude;
  confidence: EvidenceConfidence;
  sourceTier: SourceTier;
  evidenceUse?: EvidenceUse;
  sourceUrl: string;
  note: string;
};

export function isDecisionEvidence(item: Pick<EvidenceItem, "evidenceUse">): boolean {
  // Existing curated JSON predates this field and remains decision evidence.
  return item.evidenceUse !== "context";
}
```

Make `evidencePressure()` return zero before reading direction when `isDecisionEvidence(item)` is false. In `lib/evidence-collector.ts`, add `evidenceUse?: EvidenceUse` to `EvidenceCandidate` and copy it into the resulting `EvidenceItem`.

- [ ] **Step 4: Run focused tests and verify they pass**

Run the same focused command. Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit the contract**

```bash
git add lib/evidence-adjustment.ts lib/evidence-collector.ts tests/evidence-adjustment.test.ts tests/evidence-collector.test.ts
git commit -m "fix: separate contextual and decision evidence"
```

### Task 2: Close the rigor-gate bypass

**Files:**
- Modify: `lib/recommendation-rigor.ts`
- Test: `tests/recommendation-rigor.test.ts`

- [ ] **Step 1: Write the failing rigor regression test**

```ts
it("does not let contextual primary evidence satisfy rigor", () => {
  const scores: Scores = {
    audienceOverlap: 100,
    useCaseRelevance: 75,
    messageBridge: 75,
    creativeFeasibility: 100,
    commercialIntent: 100,
    brandSafety: 75,
    timingSaturation: 100
  };
  const result = calculateTrendFitWithProfile(scores, "medium", "default");
  const rigor = applyRecommendationRigor({
    scores,
    result,
    profile: "default",
    evidence: [{
      id: "hn-context",
      dimension: "audienceOverlap",
      direction: "confirm",
      magnitude: "moderate",
      confidence: "medium",
      sourceTier: "primary",
      evidenceUse: "context",
      sourceUrl: "https://news.ycombinator.com/item?id=1",
      note: "The trend is discussed; target-audience overlap is not proven."
    }]
  });

  assert.equal(rigor.evidenceGate, "fail");
  assert.ok(rigor.gateMissing.includes("audienceOrUseCase"));
  assert.ok(rigor.dimensionCaps.includes("audienceOverlap"));
  assert.equal(rigor.recommendationStability, "fragile");
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
node --import tsx --test tests/recommendation-rigor.test.ts
```

Expected: the evidence gate reports `partial` or omits the audience cap because current logic checks only source tier.

- [ ] **Step 3: Require decision eligibility everywhere rigor checks support**

Import `isDecisionEvidence` and replace `hasNonProxyEvidence` with:

```ts
function hasNonProxyDecisionEvidence(evidence: EvidenceItem[], dimension: ScoreKey): boolean {
  return evidence.some(
    (item) =>
      item.dimension === dimension &&
      isDecisionEvidence(item) &&
      (item.sourceTier === "primary" || item.sourceTier === "secondary")
  );
}
```

Use this helper in `getDimensionCaps`, `missingGateSlots`, `canFlipDownBand`, and `decisionTypeFor`.

- [ ] **Step 4: Run the focused test and the full rigor suite**

Run:

```bash
node --import tsx --test tests/recommendation-rigor.test.ts
```

Expected: all rigor tests pass, including existing curated evidence cases whose absent `evidenceUse` defaults to decision use.

- [ ] **Step 5: Commit the gate fix**

```bash
git add lib/recommendation-rigor.ts tests/recommendation-rigor.test.ts
git commit -m "fix: exclude contextual evidence from rigor gates"
```

### Task 3: Make all aggregate runtime hits contextual by default

**Files:**
- Modify: `lib/free-evidence-providers.ts`
- Modify: `lib/tikhub-provider.ts`
- Test: `tests/free-evidence-providers.test.ts`
- Test: `tests/tikhub-provider.test.ts`

- [ ] **Step 1: Write failing provider-mapping assertions**

For HN and generic TikHub snippets, assert:

```ts
assert.ok(candidates.every((candidate) => candidate.evidenceUse === "context"));
```

For GDELT, assert coverage-volume findings are contextual while an explicit negative-tone finding is decision evidence:

```ts
assert.equal(candidates.find((item) => item.id === "gdelt-timing")?.evidenceUse, "context");
assert.equal(candidates.find((item) => item.id === "gdelt-brand-safety")?.evidenceUse, "decision");
```

- [ ] **Step 2: Run provider tests and verify they fail**

```bash
node --import tsx --test tests/free-evidence-providers.test.ts tests/tikhub-provider.test.ts
```

Expected: failures because provider candidates do not yet carry `evidenceUse`.

- [ ] **Step 3: Apply conservative defaults**

Set `evidenceUse: "context"` on HN audience/use-case candidates, TikHub audience/use-case candidates, and GDELT coverage-volume candidates. Set `evidenceUse: "decision"` only on the GDELT negative-tone `brandSafety` candidate because it contains an explicit directional observation.

- [ ] **Step 4: Run provider and rigor tests**

```bash
node --import tsx --test tests/free-evidence-providers.test.ts tests/tikhub-provider.test.ts tests/recommendation-rigor.test.ts
```

Expected: all tests pass; a generic runtime hit is visible but cannot strengthen the recommendation.

- [ ] **Step 5: Commit runtime defaults**

```bash
git add lib/free-evidence-providers.ts lib/tikhub-provider.ts tests/free-evidence-providers.test.ts tests/tikhub-provider.test.ts
git commit -m "fix: treat aggregate runtime hits as context"
```

### Task 4: Add deterministic fit-relevance qualification

**Files:**
- Create: `lib/evidence-relevance.ts`
- Create: `tests/evidence-relevance.test.ts`
- Modify: `lib/free-evidence-providers.ts`
- Modify: `lib/tikhub-provider.ts`
- Modify: `app/api/evidence/collect/route.ts`
- Modify: `components/EvaluateClient.tsx`

- [ ] **Step 1: Write bilingual relevance tests**

Cover these exact cases:

```ts
it("promotes a snippet only when trend and audience signals both match", () => {
  assert.equal(classifySnippetEvidenceUse({
    snippet: "20–35 岁男性白领正在讨论 old money 通勤穿搭",
    dimension: "audienceOverlap",
    product: {
      name: "Northbound",
      category: "中端男装",
      market: "美国城市",
      audience: "20–35 岁男性白领",
      positioning: "平价质感",
      sellingPoints: "通勤版型",
      brandTone: "克制"
    },
    trend: { name: "old money 穿搭", description: "静奢通勤风" }
  }), "decision");
});

it("keeps trend heat without product fit as context", () => {
  assert.equal(classifySnippetEvidenceUse({
    snippet: "old money is trending across social platforms",
    dimension: "audienceOverlap",
    product: {
      name: "Northbound",
      category: "menswear",
      market: "US",
      audience: "male office workers",
      positioning: "affordable quality",
      sellingPoints: "durable commuter fit",
      brandTone: "restrained"
    },
    trend: { name: "old money style", description: "quiet luxury outfits" }
  }), "context");
});

it("does not qualify use-case evidence from an audience-only match", () => {
  assert.equal(classifySnippetEvidenceUse({
    snippet: "男性白领正在讨论 old money",
    dimension: "useCaseRelevance",
    product: {
      name: "Northbound",
      category: "中端男装",
      market: "美国城市",
      audience: "男性白领",
      positioning: "平价质感",
      sellingPoints: "通勤版型",
      brandTone: "克制"
    },
    trend: { name: "old money", description: "静奢风" }
  }), "context");
});
```

- [ ] **Step 2: Run the new tests and verify module-not-found failure**

```bash
node --import tsx --test tests/evidence-relevance.test.ts
```

Expected: failure because `lib/evidence-relevance.ts` does not exist.

- [ ] **Step 3: Implement deterministic token overlap**

Export these exact contracts:

```ts
export type EvidenceFitProduct = {
  name: string;
  category: string;
  market: string;
  audience: string;
  positioning: string;
  sellingPoints: string;
  brandTone: string;
};

export type EvidenceFitTrend = { name: string; description: string };

export function classifySnippetEvidenceUse(input: {
  snippet: string;
  dimension: "audienceOverlap" | "useCaseRelevance";
  product: EvidenceFitProduct;
  trend: EvidenceFitTrend;
}): EvidenceUse;
```

Implementation rules:

- Normalize with Unicode `NFKC` and lowercase.
- Extract Latin/digit tokens of length at least 2 after removing a fixed stopword set.
- Extract overlapping CJK bigrams from contiguous Chinese/Japanese/Korean sequences.
- Require at least one trend token/bigram match.
- For `audienceOverlap`, also require a match from `category + market + audience`.
- For `useCaseRelevance`, also require a match from `category + positioning + sellingPoints`.
- Product-name-only matches never qualify a snippet.
- Return only `context` or `decision`; this function never assigns direction, tier, magnitude, or confidence.

- [ ] **Step 4: Send the full fit context to evidence collection**

Change `collectEvidenceFor()` to send the same product fields already sent to baseline scoring plus `trendDescription`. Parse those fields in `app/api/evidence/collect/route.ts`, pass them through `collectFreeEvidence`, and use `classifySnippetEvidenceUse` when mapping HN/TikHub snippets.

- [ ] **Step 5: Run relevance, provider, and route smoke tests**

```bash
node --import tsx --test tests/evidence-relevance.test.ts tests/free-evidence-providers.test.ts tests/tikhub-provider.test.ts tests/route-smoke.test.ts
```

Expected: all tests pass; on-topic fit snippets become decision evidence, trend-only snippets remain contextual.

- [ ] **Step 6: Commit relevance qualification**

```bash
git add lib/evidence-relevance.ts tests/evidence-relevance.test.ts lib/free-evidence-providers.ts lib/tikhub-provider.ts app/api/evidence/collect/route.ts components/EvaluateClient.tsx
git commit -m "feat: qualify runtime evidence against product fit"
```

### Task 5: Add provider diagnostics and explicit paid-social activation

**Files:**
- Create: `lib/evidence-provider-diagnostics.ts`
- Create: `tests/evidence-provider-diagnostics.test.ts`
- Modify: `lib/free-evidence-providers.ts`
- Modify: `lib/tikhub-provider.ts`
- Modify: `app/api/evidence/collect/route.ts`
- Modify: `components/EvaluateClient.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write failing diagnostic semantics tests**

Define and test this contract:

```ts
export type ProviderRunStatus = "ok" | "empty" | "disabled" | "error" | "timeout";

export type ProviderDiagnostic = {
  provider: string;
  status: ProviderRunStatus;
  resultCount: number;
  contextCount: number;
  decisionCount: number;
  latencyMs: number;
  message: string;
};
```

Tests must prove that `empty`, `disabled`, `error`, and `timeout` never synthesize an `EvidenceCandidate` and never become a `down` direction.

- [ ] **Step 2: Run the new test and verify it fails**

```bash
node --import tsx --test tests/evidence-provider-diagnostics.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Return typed diagnostics without swallowing provider state**

Refactor fetch wrappers to retain status while preserving graceful degradation. Abort errors map to `timeout`; non-2xx responses map to `error`; successful zero-result responses map to `empty`; missing TikHub activation maps to `disabled`.

- [ ] **Step 4: Disable TikHub unless the request explicitly opts in**

Add `includePaidSocial?: boolean` to the route body. Call `collectTikhubEvidence` only when it is exactly `true`; otherwise return a TikHub diagnostic with `status: "disabled"`. Keep HN and GDELT as the default free path.

In `components/EvaluateClient.tsx`, add an unchecked checkbox labeled:

```text
启用付费社媒采集（每个候选热点最多调用 5 个 TikHub 平台；会消耗预付余额）
```

Send `includePaidSocial` with the request. Do not persist this checkbox in localStorage, so a new session returns to the free default.

- [ ] **Step 5: Show decision/context counts and provider health**

Replace the single kept count with:

```text
可用于判断 N 条 · 仅作背景 M 条
```

Render one compact row per provider with status, result count, and latency. Do not label contextual observations as “一手 / 强证据”.

- [ ] **Step 6: Run focused tests**

```bash
node --import tsx --test tests/evidence-provider-diagnostics.test.ts tests/free-evidence-providers.test.ts tests/tikhub-provider.test.ts tests/route-smoke.test.ts
```

Expected: all tests pass; paid social is off by default and diagnostics distinguish disabled/empty/error/timeout.

- [ ] **Step 7: Commit observability and cost controls**

```bash
git add lib/evidence-provider-diagnostics.ts tests/evidence-provider-diagnostics.test.ts lib/free-evidence-providers.ts lib/tikhub-provider.ts app/api/evidence/collect/route.ts components/EvaluateClient.tsx app/globals.css
git commit -m "feat: expose provider health and gate paid social"
```

### Task 6: Correct product documentation after behavior is verified

**Files:**
- Modify: `README.md`
- Modify: `docs/current-state.md`
- Modify: `docs/changelog.md`

- [ ] **Step 1: Correct the evidence-bias description**

State that generic confirm evidence does not change anchor scores but previously counted as rigor support. Replace the invalid magnitude-zero proposal with the `evidenceUse` model. Explicitly reject empty-result-as-contradiction until provider diagnostics and a platform-specific baseline exist.

- [ ] **Step 2: Remove completed or stale operational items**

Remove “set GitHub About URL”; it is already set. Remove current-route references to deleted `/report` and `/fit-score` pages. Keep those paths only inside dated historical sections that clearly say they were retired.

- [ ] **Step 3: Update README environment variables and boundaries**

Document `GEMINI_API_KEY`, `GEMINI_MODEL`, `TIKHUB_API_KEY`, `ACCESS_CODES`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ACCESS_CODE_LIMIT`, and `ACCESS_RATE_PER_MIN`. State that TikHub credentials alone do not trigger calls; users must explicitly enable paid social in `/evaluate`.

- [ ] **Step 4: Record exact verification evidence**

Update the current-state verification count only from the fresh `npm test` output. Record that the production pages `/`, `/evaluate`, `/cases`, `/cases/demo_fashion`, `/workspace`, and `/api/report/demo_fashion` returned HTTP 200 on 2026-06-18, while interactive paid-provider flows were intentionally not invoked.

- [ ] **Step 5: Check docs and commit**

```bash
git diff --check
git diff -- README.md docs/current-state.md docs/changelog.md
git add README.md docs/current-state.md docs/changelog.md
git commit -m "docs: align project status with evidence integrity model"
```

Expected: no whitespace errors and no claim that generic confirm evidence raises anchor scores.

### Task 7: Full verification and production smoke pass

**Files:**
- Test: all `tests/*.test.ts`
- Verify: production build and public read-only routes

- [ ] **Step 1: Run the complete test suite**

```bash
npm test
```

Expected: zero failed, skipped, cancelled, or todo tests.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: exit code 0; type checking succeeds; `/api/evidence/collect`, `/evaluate`, `/cases`, and `/workspace` appear in the route table.

- [ ] **Step 3: Verify the free default through the UI**

Start the app only after the build completes:

```bash
npm run dev -- -H 127.0.0.1 -p 3000
```

In `/evaluate`, load the example and run one evaluation with paid social unchecked. Verify:

- TikHub status is disabled.
- HN/GDELT may be ok, empty, error, or timeout without producing synthetic down evidence.
- Generic trend discussion appears under contextual observations.
- Contextual observations do not clear `audienceOrUseCase`, caps, or fragility.
- The page remains usable when every provider returns no decision evidence.

- [ ] **Step 4: Run one controlled paid-provider check**

Use exactly one candidate and enable paid social once. Verify five platform diagnostics are returned, secrets are absent from HTML/JSON, and each snippet is classified as context or decision. Do not repeat the run when the first response is sufficient for schema validation.

- [ ] **Step 5: Review the final diff and commit any verification-only fixes**

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only planned files are modified, no `.env.local`, `.next`, generated secrets, or unrelated user changes are staged.

## Deferred Work With Explicit Entry Criteria

- **Sparse-result down signals:** defer until each provider reports reliable `ok` versus `empty`, query quality is measured, and platform/category baselines exist. Empty alone is not contradiction.
- **Stance/sentiment down signals:** start only with a labelled fixture set containing supportive, neutral, skeptical, and mocking snippets in Chinese and English. The model may emit auditable features, but deterministic code must map features to direction.
- **GDELT live tone:** enable only after a single-call or cached strategy avoids the documented rate limit; retain proxy/low classification unless the underlying articles are fetched and verified.
- **Outcome calibration:** use real campaign outcomes only. Do not synthesize a 20–50 case calibration set.

