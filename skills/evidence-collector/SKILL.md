---
name: evidence-collector
description: "Turn product + trend research into structured evidence candidates, then pass them through the project's conservative source-tier classifier before they can affect scores. Use when creating or updating data/*_evidence.json, before trend-shortlist ranking, or whenever a trend-fit recommendation needs sourced evidence instead of assumptions."
---

# Evidence Collector — candidate sources into score-ready evidence

This skill is the missing middle step between manual web/social research and the
deterministic scoring engine.

It does **not** pretend to crawl the internet by itself. It accepts candidate sources from
GooseWorks, browser research, user-supplied URLs, or manual competitor research, verifies
the claims, and converts only the safe subset into typed `EvidenceItem` records.

```
Product + trend
      │
      ├─ gather candidate sources (GooseWorks / browser / user URLs)
      ├─ verify the claim at each URL
      ├─ classify source tier with lib/source-tier-classifier.ts
      ├─ build typed evidence draft with lib/evidence-collector.ts
      └─ run evidence adjustment + rigor gate tests
```

The key rule: the agent that finds a source is not trusted to grade the source upward.
Tiering goes through the project-local classifier every time.

---

## Borrowed Research Surface

Preferred candidate-source order:

1. **GooseWorks** — broad data/API layer for Reddit, X, LinkedIn, websites, company data,
   and enrichment when the CLI is logged in.
2. **OpenCLI** — local platform-search layer for Reddit, X/Twitter, TikTok, Douyin,
   Xiaohongshu, Bilibili, YouTube, Zhihu, Weibo, Product Hunt, Hacker News, and other
   site adapters.
3. **Browser/manual web research** — fallback when a data CLI is unavailable, blocked, or
   not logged in.

This workflow can borrow the user-level `.claude/skills/gooseworks` skill for candidate
discovery:

- Search/scrape Reddit, X, LinkedIn, websites, or general web results.
- Find competitor activity, user language, comments, creator campaigns, and review data.
- Produce URLs, snippets, and raw findings.

But GooseWorks output is only a **candidate list**. It is not score-ready until this
skill verifies each claim and classifies each source using the project rules.

OpenCLI output is also only a **candidate list**. It is useful for raw platform language
and creator/community discovery, but a post/thread/video still has to pass the same
verification gate and source-tier classifier.

If GooseWorks or OpenCLI is unavailable or not logged in, use browser/manual research and
mark the tooling honestly, for example:

```text
manual browser research; GooseWorks unavailable; OpenCLI blocked
```

---

## Inputs

Use the same product/trend pair as `trend-product-fit`, plus a source candidate list.

Each candidate should include:

```ts
type EvidenceCandidate = {
  id: string;
  dimension: ScoreKey;
  direction: "up" | "down" | "confirm";
  magnitude: "weak" | "moderate" | "strong";
  desiredConfidence: "low" | "medium" | "high";
  sourceUrl: string;
  verificationStatus: "verified" | "unverified" | "contradicted";
  sourceSignals?: SourceSignal[];
  note: string;
};
```

`sourceSignals` should describe what the source is, not what you wish it were:

- `vendor_copy`
- `vendor_documentation`
- `listicle_affiliate_seo`
- `press_release`
- `single_social_thread`
- `single_anecdote`
- `raw_platform_data`
- `comment_corpus`
- `named_expert_quote`
- `direct_competitor_campaign`
- `reputable_journalism`
- `research_report`
- `supplier_category_report`
- `unknown`

---

## Verification Gate

Before a candidate can become evidence:

1. Open/fetch the URL.
2. Confirm the claim appears there.
3. Set `verificationStatus`:
   - `verified` — claim appears at the URL.
   - `unverified` — URL could not be fetched or claim could not be checked.
   - `contradicted` — URL does not support the claim.

Rules:

- `contradicted` candidates are dropped.
- `unverified` candidates are kept only as `proxy`, with `confidence: low`, and the note
  is prefixed with `UNVERIFIED:`.
- A sandboxed or offline agent may not assert `primary` or `secondary`.

---

## Source-Tier Classification

Use [`lib/source-tier-classifier.ts`](../../lib/source-tier-classifier.ts), which encodes
[`trend-product-fit/source_tier_classifier.md`](../trend-product-fit/source_tier_classifier.md).

The classifier enforces:

- Vendor copy/docs → `proxy`.
- Listicles, affiliate, SEO roundups → `proxy`.
- Press releases/sponsored/native ads → `proxy`.
- Single anecdotes → `proxy`.
- One Reddit/social thread → `primary` only for raw Audience or Use-case language, with
  max `medium` confidence; otherwise `proxy`.
- Raw platform data, comment corpora, named-expert quotes, and directly observed
  competitor campaigns can earn `primary` if verified.
- Reputable journalism and research reports can earn `secondary` if verified.
- Supplier-owned category reports can earn `secondary` if verified, but max confidence is
  `medium` because the publisher has category exposure.
- Unknown source type → `proxy`.

Requested confidence is always clamped to the tier's ceiling.

---

## Draft Builder

Use [`buildEvidenceDraft()`](../../lib/evidence-collector.ts) to produce a score-ready
draft:

```ts
const draft = buildEvidenceDraft({
  id: "demo_example_evidence",
  case: "demo_example",
  researchDate: "2026-06-09",
  tooling: "manual + GooseWorks candidate search",
  baselineScores,
  candidates
});
```

The result contains:

- `evidence` — typed `EvidenceItem[]` safe to feed into `adjustScores()`.
- `droppedCandidates` — contradicted or unusable sources with reasons.
- `classifications` — classifier output per candidate for audit.

Do not paste `droppedCandidates` into `data/*_evidence.json` unless you intentionally
want an audit artifact. The existing evidence case JSONs store only accepted evidence and
expected computed fields.

---

## Evidence Collection Priority

When research time is limited, collect evidence in this order:

1. **Timing & Saturation** — this often decides whether a high-fit trend is still worth
   entering.
2. **Brand Safety** — this can cap or sink the recommendation regardless of total score.
3. **Audience or Use-case** — required to pass the Strong Go gate.
4. **Commercial Intent** — especially for ecommerce conversion or B2B pipeline profiles.
5. **Creative Feasibility / Message Bridge** — useful, but vendor docs often only provide
   proxy support.

Prefer three verified, high-signal sources over ten weak proxy links.

---

## Output Contract

For a portfolio-grade evidence case:

1. Build the draft.
2. Copy accepted `evidence` into `data/{case}_evidence.json`.
3. Run `adjustScores()` and `applyRecommendationRigor()` to compute expected fields.
4. Update `outputs/{case}_evidence_case.md` with the before/after table and source list.
5. Run:

```bash
npx tsx --test tests/evidence-collector.test.ts tests/source-tier-classifier.test.ts
npm test
```

Quality bar:

- Every score movement traces to a typed evidence item.
- No non-proxy tier without verified claim support.
- No proxy evidence with `confidence: high`.
- Contradicted sources are dropped, not softened into assumptions.
- The final recommendation shows raw score, evidence-adjusted score, gate, stability, and
  next validation action.
