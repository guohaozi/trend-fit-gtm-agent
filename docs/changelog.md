# Changelog

Condensed milestone log for Codex / Claude handoff. **Full detail for any entry is in
`git log` (commit messages) and in this file's own git history** — entries here are
one-to-two-line summaries, newest first.

## 2026-06-11

- **Handoff docs condensed** — `current-state.md` (972→~180 lines) and `changelog.md`
  trimmed to remove duplicated sections and historical round-by-round detail; full history
  stays in git.
- **Google Trends query fix** — `SerpApiGoogleTrendsSource.collect` now queries the trend
  term only (market → `geo`), not product+market+trend. A long composite returned nothing;
  live proof: "dubai chocolate" (geo=DE) 0 → 12 findings. Timing/Commercial evidence now
  actually arrives. Follow-up noted: related_queries spam needs a relevance filter.
- **SerpApi verified live + near-zero-demand fix** — first real (non-fixture) run. A
  no-demand query made SerpApi return an `error` and a late-zero interest reading became a
  bogus `-100% trend_declining / verified` finding. Fix: `related.error` guard → emit no
  findings + a `ProviderFindingResult.notes` entry. Confirmed field paths/fixture shape
  against live data.
- **Route + page smoke tests** — `tests/route-smoke.test.ts`: report download API + all six
  pages across cases/profiles/fallbacks (test-only global React shim for the classic JSX
  transform; product code unchanged). Closed the `/workspace` UI-regression gap.
- **Workspace save/import/export** — versioned state snapshot, localStorage auto-save, JSON
  import (validated) / export, reset to default LEGO workspace.
- **Workspace Google Trends API** — `/api/workspace/google-trends` runs SerpApi server-side
  (key never from browser, redacted from source URLs); `fixture:true` replays the committed
  fixture without a key. `/workspace` has a "运行 Google Trends" action that appends rows.
- **SerpApi Google Trends provider** — `SerpApiGoogleTrendsSource` calls `engine=google_trends`
  for related queries + timeseries → SEO findings for Timing/Commercial; redacts API keys.
  CLI: `--provider google-trends`, `--serpapi-key/-geo/-date`.
- **Workspace evidence editor (classifier-owned tier)** — editable evidence rows; users edit
  URL/dimension/direction/magnitude/confidence/verification/signal/notes, but `sourceTier` +
  computed confidence are read-only outputs of the classifier (UI cannot upgrade strength).

## 2026-06-10

- **Workspace provider preview + portable OpenCLI** — dry-run provider command + fixture
  smoke command in `/workspace`; OpenCLI path resolution is now `--opencli-bin` → `OPENCLI_BIN`
  → `opencli` (no hardcoded `/Users/guo/...`).
- **Editable workspace UI** — `/workspace` becomes the real workflow screen (editable
  product/trends/scores, single-trend or shortlist, evidence-gap guidance, Markdown export).
- **Trend shortlist ranking + LEGO demo** — `lib/trend-shortlist.ts` ranks supplied candidate
  trends by gated band → evidence total → stability → Timing. LEGO: World Cup vs F1 vs
  graduation; F1 first. Candidates/baselines still supplied manually.
- **Credibility cleanup + CI** — README/context/docs stop overstating readiness;
  `.github/workflows/ci.yml` runs `npm ci`, `npm test`, `npm run build`.
- **OpenCLI research provider + hardening** — `lib/opencli-research-source.ts` maps
  reddit/youtube (customer findings) and twitter/google (conservative candidates);
  relevance filtering, `continueOnCommandError`. Note: Google Search ≠ Google Trends.
- **Product + trend research runner** — `evidence:case:research` goes product+market+trend →
  7-lane queries → provider → draft → `data/*_evidence.json` + `outputs/*_evidence_case.md`.
- **P5c CLI / file writer** — `lib/evidence-case-file-writer.ts` + `scripts/evidence-case.ts`.
- **P5a/b offline orchestrator** — `lib/evidence-case-orchestrator.ts` merges customer/SEO/
  competitor findings → `buildEvidenceDraft` → `generateEvidenceAdjustmentCaseFromDraft`
  (offline, deterministic; no network/file IO).
- **Competitor provider + AI-tool competitor variant** — `lib/competitor-research-provider.ts`;
  competitor copy stays proxy for audience claims, observed campaigns can be primary.
- **15-case-list evidence cases** — SAVAS China, OBgE China, Anker Europe, Japan service
  robots, POP MART Middle East, Thailand EV, LatAm gaming peripherals. The Anker case also
  fixed a source-tier URL bug (`desktop-charger` paths wrongly triggering the `top-` listicle
  pattern).
- **P0-P4 evidence automation** — product-marketing context (`.agents/product-marketing.md`),
  evidence-case generator, customer-research / SEO-timing / competitor providers.

## 2026-06-09

- **Source-tier guard enforced + re-audit** — `tests/source-tier-classifier.test.ts` scans
  every `data/*_evidence.json` and fails on mis-tiered vendor/listicle URLs or proxy-with-high
  confidence. Fashion/AI-tool/snack cases re-audited.
- **Evidence collector first step** — `lib/source-tier-classifier.ts` + `lib/evidence-collector.ts`
  (candidates → tiered draft; verify-first; forced-proxy; confidence clamp) +
  `skills/evidence-collector/SKILL.md`. Research agents can no longer hand-grade tier.
- **Protein-drink evidence case** — first case built through the collector; added
  `supplier_category_report` tier (supplier-owned research = secondary, max medium).
- **Tooling handoff** — GooseWorks (user logged in, ~200 credits), OpenCLI install/PATH notes,
  local-skill substitutes; remote `find-skills` blocked in sandbox (supply-chain reviewer).
- **Public GitHub portfolio** — repo pushed to `github.com/guohaozi/trend-fit-gtm-agent`.

## 2026-06-08

- **Review + fix: source-tier inflation** — caught Codex tagging vendor pages (shopify/picsart)
  as `primary`; re-tiered to `proxy` so AI-tool `creativeFeasibility` is flagged in
  `dimensionCaps`. Added `skills/trend-product-fit/source_tier_classifier.md`. Sources verified
  real (no fabrication).
- **Snack (Dubai chocolate) evidence case** — baseline 81 → evidence 76, gate pass, moderate.

## 2026-06-07

- **AI photo-tool evidence case** — baseline 89 → evidence 86, gate pass, Strong Go, fragile.

## 2026-06-06

- **v1.2 rigor layer** — evidence gate, no-evidence caps, source-tier discipline, stability,
  decisionType, 6 weight profiles. Additive on the frozen contract; `gatedBand` is what the
  agent stands behind (pure-assumption Strong Go downgraded to gated Go).

## 2026-06-04 (MVP foundation)

- Initial Next.js + TS MVP: scoring contract frozen to anchors `{0,25,50,75,100}` (removed
  off-anchor `85` bug), app routes, demo cases, tests, project-local skills, README, CI-less
  baseline. Frozen demo totals: fashion 90, robotics 74, ai_tool 89.
- First real evidence case (quiet luxury / fashion): raw 90 → evidence-backed 88, Timing 75→50;
  established the assumption→evidence upgrade pattern.

## Design rules that persist

- **Iron rule**: evidence-backed only; never fabricate metrics or URLs.
- **No data is not evidence**: missing/near-zero/contradicted sources must not become findings.
- **Tier is computed, not hand-assigned**: every candidate passes `source-tier-classifier`.
- **Frozen contract stays frozen**: rigor/providers layer on top, never rewrite scoring math.
- **No fake calibration**: do not invent a labelled outcome set without real campaign results.
