# Changelog

This changelog records project-level changes and the reasoning behind them. It is intended for handoff between Codex / Claude conversations, not just release notes.

## 2026-06-08 — Review + Fix: Source-Tier Inflation In Evidence Cases

Status:

- Claude review pass over the evidence cases Codex produced, plus a fix and a structural prevention.

What was checked:

- **Anti-fabrication rule held.** Spot-verified cited sources via web search — The Drum (Dr Ella Ward / Ehrenberg-Bass), Shake Shack's Dubai Chocolate Pistachio Shake details, and PetaPixel's exact "44% of US adults" survey figure all real. Codex did not invent URLs or numbers.
- Anchor-step math and all 26 tests verified correct.

Bug found:

- Codex tagged three vendor-owned pages as `primary`: `shopify.com/magic`, `help.shopify.com/...`, `help.picsart.io/...`.
- The project's own `evidence_model.md` §3a rubric classifies vendor copy / vendor docs as `proxy`.
- Consequence: AI-tool `creativeFeasibility = 100` was supported only by a vendor marketing page, so it should have appeared in `dimensionCaps`, but `dimensionCaps` was empty.
- Why tests missed it: `sourceTier` is human-judgment input, not computed. A mis-graded tier flows through the deterministic engine and the unit test (which compares engine output to the JSON's own expected fields) still passes green.

What landed (fix):

- `data/demo_ai_tool_evidence.json`: three vendor sources re-tiered `primary → proxy`; `expectedDimensionCaps` now `["creativeFeasibility"]`; `useCaseRelevance` and `creativeFeasibility` confidence labels `high → medium` (proxy caps confidence at medium).
- `outputs/demo_ai_tool_evidence_case.md`: discloses the `creativeFeasibility` cap; vendor sources labeled proxy in the evidence and recommendation sections.
- Result unchanged where it matters: raw `86`, Strong Go, gate `pass` — the Strong Go is still genuinely earned because the gate-required evidence (Accio timing, TechRadar/Digital Camera World safety, PetaPixel/Reddit audience) was never vendor copy. The fix removed inflated support, not real support.
- All 26 tests still pass; the engine now computes `dimensionCaps: ["creativeFeasibility"]` matching the updated expected field, proving the fix is real.

What landed (structural prevention):

- Added `skills/trend-product-fit/source_tier_classifier.md` — a deterministic, checklist-driven tier classifier:
  - **Verify-first gate:** fetch the URL and confirm the cited claim before tiering above proxy. Can't fetch → cap at proxy + `confidence: low` + mark `UNVERIFIED`. Claim absent → drop the item (fabrication guard). An agent that cannot browse may not assert `primary`/`secondary`.
  - **Forced-proxy list:** vendor copy, vendor docs, listicles/affiliate/SEO, press releases, and single social threads (as measured signals) → always `proxy`, no manual upgrade.
  - **Tie-breaker → lower tier.**
  - Includes the worked Shopify/Picsart re-classification.
- Wired in as a mandatory pre-step from `evidence_model.md §3a` and `competitor-evidence/SKILL.md`.

Key design decision / root cause:

- The failure mode is that the same agent that *gathers* evidence also *grades its strength* and drifts optimistic. `sourceTier` is the one field with no math check, so a biased grade silently poisons the chain. The fix is to make tiering a deterministic, conservative, verify-first checklist rather than a judgment call.

Known issue carried forward:

- The classifier is currently a soft (prose) constraint. The recommended next step is a CI/test guard that fails when a vendor/listicle URL pattern is tagged non-proxy in any `*_evidence.json`. Fashion and snack cases were not re-audited against the classifier this round.

Verification:

- `npm test` passed: 26 tests, 4 suites.

## 2026-06-08 — Handoff Commit For Evidence Case Expansion

Status:

- Prepared this conversation's evidence-case expansion for commit.

What landed in this round:

- Added a second evidence-backed case for the AI photo-tool demo.
- Added a fourth baseline demo plus a third evidence-backed case for snack / Dubai-style chocolate.
- Updated app demo loading, labels, tests, README, current-state docs, and evidence-case outputs.
- Used project-local skills as the decision lens:
  - `skills/trend-product-fit/SKILL.md` for the seven-dimension fit rubric.
  - `skills/trend-product-fit/evidence_model.md` for source tiers and evidence-to-score adjustment.
  - `skills/competitor-evidence/SKILL.md` for evidence discipline and anti-overclaiming.

Key design decisions:

- Evidence-backed cases are not fake training data or historical calibration. They are analyst-reviewed cases used to improve and demonstrate the scoring and gate logic.
- Historical calibration remains future work until real labelled campaign outcomes exist.
- Project skills can guide collection and judgment, but there is still no automated collector that turns trend + product into structured `evidence.json`.
- The snack case intentionally lands at `Go` / `small test`, showing that evidence can validate fit while preventing a broad launch recommendation.

Known issues carried forward:

- Evidence collection is still mostly manual web research, not an integrated GooseWorks / Trends / SEO pipeline.
- Raw Google Trends timeseries has not been wired into Timing & Saturation.
- The three evidence-backed cases are a portfolio proof of concept, not statistical calibration.

Next recommended move:

- Build either a reusable `evidence-collector` skill/script or a trend-shortlist demo that runs one product against three candidate trends using evidence-adjusted gated scoring.

Verification:

- `npm test` passed with 26 tests across 4 suites.
- `npm run build` passed.
- `git diff --check` passed.

## 2026-06-08 — Snack Evidence-backed Case For Dubai-style Chocolate

Status:

- Added a snack / confectionery demo and a structured evidence-backed case.

What landed:

- Added `data/demo_snack.json`.
- Added `data/demo_snack_evidence.json`.
- Added `outputs/demo_snack_report.md`.
- Added `outputs/demo_snack_evidence_case.md`.
- Updated `lib/demo-cases.ts` so `case=demo_snack` is available in app flows.
- Updated `lib/display-labels.ts` with the snack category label.
- Extended scoring, evidence adjustment, and recommendation rigor tests.
- Updated README and current-state docs.

How project skills were used:

- `skills/trend-product-fit/SKILL.md` supplied the seven-dimension GTM scoring lens.
- `skills/competitor-evidence/SKILL.md` supplied the evidence discipline and source-tier caution.
- `skills/trend-product-fit/evidence_model.md` supplied the typed evidence-to-score contract.

Key result:

- Baseline deterministic demo: raw `81`, Go, assumption-heavy.
- Evidence-backed read: raw `74`, Go, evidence gate `pass`.
- Timing & Saturation revised from `50` to `25` because the trend is crowded and late-stage.
- Commercial Intent revised from `75` to `50` because raw consumer discussion shows price and hype skepticism.
- Brand Safety revised from `75` to `50` because generic copying can dilute identity and create origin/authenticity risk.
- Stability remains `fragile`, so decision type is `small test`.

Why this matters:

- The case adds a consumer-packaged-goods / snack example, not another fashion or software case.
- It demonstrates a useful middle outcome: evidence validates the trend-product fit but prevents a broad launch recommendation.

Verification:

- `npm test` passed with 26 tests across 4 suites.
- Final handoff verification also passed `npm run build` and `git diff --check`.

## 2026-06-07 — Second Evidence-backed Case For AI Photo Tool

Status:

- Added a second structured evidence case for the AI photo-editing demo.

What landed:

- Added `data/demo_ai_tool_evidence.json`.
- Added `outputs/demo_ai_tool_evidence_case.md`.
- Updated `lib/demo-cases.ts` so `/fit-score?case=demo_ai_tool` and `/report?case=demo_ai_tool` can load the AI evidence comparison.
- Extended `tests/evidence-adjustment.test.ts` and `tests/recommendation-rigor.test.ts` to verify the new case.
- Updated `README.md` and `docs/current-state.md` so project handoff no longer implies fashion is the only evidence-backed case.

Key result:

- Original deterministic demo: raw `89`, Strong Go, gated `Go` because assumption-only.
- Evidence-backed read: raw `86`, Strong Go, gate `pass`, gated `Strong Go`.
- Brand Safety revised from `75` to `50` due to recruiter authenticity concerns and AI-headshot backlash.
- Recommendation stability remains `fragile` because the adjusted total sits one point above the Strong Go threshold.
- Decision type is `organic push`, not paid push.

Why this matters:

- The project now has two contrasting evidence examples:
  - Fashion: raw Strong Go but gated Go because key support is proxy/listicle-based.
  - AI tool: raw Strong Go preserved after non-proxy evidence, but still fragile.
- This gives the evidence gate a clearer portfolio story: it can both downgrade unsupported confidence and preserve a top recommendation when evidence coverage is good.

Verification:

- `npm test` passed with 23 tests across 4 suites.
- `npm run build` passed.

## 2026-06-06 — v1.2 Rigor Layer, Evidence Gate, And Profile Switching

Status:

- v1.2 handoff entry. Check `git log -1 --oneline` for the exact commit hash after the handoff commit.

What landed:

- Implemented the v1.2 rigor layer in TypeScript, not just in skill docs.
- Added `lib/recommendation-rigor.ts` with:
  - goal-based weight profiles
  - evidence gate
  - no-evidence caps
  - recommendation stability
  - decision type
  - next validation action
- Added `components/RigorSummary.tsx` to show the actual stand-behind recommendation.
- Added `components/ProfileSwitcher.tsx` to expose weight profiles in the app UI.
- Updated `/fit-score` and `/report` so `?profile=...` changes the scoring lens.
- Updated score breakdown and evidence comparison tables to show active profile weights.
- Updated `data/*.json`, `outputs/*.md`, `HANDOFF_TO_CODEX.md`, and skills to include gate fields and v1.2 behavior.
- Added `tests/recommendation-rigor.test.ts`.

Key design decisions:

- Base scoring remains frozen: anchors, rounding, bands, and overrides are unchanged.
- v1.2 is additive: raw score is the analyst claim; `gatedBand` is the recommendation the agent is allowed to stand behind.
- A pure-assumption `90 Strong Go` is no longer allowed to stand as a true Strong Go; it becomes gated `Go` until required non-proxy evidence exists.
- Strong Go gate requires non-proxy evidence for Timing, Brand Safety, and Audience or Use-case. Conversion profiles also require non-proxy Commercial Intent.
- Proxy/listicle/affiliate/SEO content can inform direction, but cannot satisfy the Strong Go gate.
- Historical calibration was deliberately not created because there are no real labelled campaign outcomes yet. Fake calibration would undermine the project's honesty.

Important correction:

- The VOU and Chic Style Collective are now treated as `proxy` sources.
- Essence is `secondary` cultural context.
- Refinery29 is the strongest `primary` source for named expert critique.
- The evidence-backed fashion case is raw `88 Strong Go`, but gated `Go` because audience/use-case evidence remains proxy/listicle-based.

Verified examples:

- Fashion under `default`: raw `90`, Strong Go, gated `Go` because assumption-only.
- Fashion under `risk_sensitive`: raw `81`, Go; Brand Safety weight displays as `25%`.
- Fashion evidence case under `default`: raw `88`, Strong Go, gated `Go`, `evidenceGate=partial`, `decisionType=small test`.

Verification:

- `npm test` passed with 21 tests across 4 suites.
- `npm run build` passed.
- Local page smoke checks returned 200 for:
  - `/fit-score?case=demo_fashion`
  - `/fit-score?case=demo_fashion&profile=risk_sensitive`
  - `/report?case=demo_fashion&profile=risk_sensitive`

Known limitations after this change:

- No automatic trend discovery yet.
- No automatic multi-source evidence collection yet.
- No real outcome-calibrated weight set yet.
- Commercial Intent is still proxy-based in the fashion evidence case.
- Creative Feasibility remains assumption-based in the fashion evidence case.

## 2026-06-04 — Initial MVP Baseline

Commit:

- `1ae23f7 Initial Trend-Fit GTM Agent MVP`

What landed:

- Initialized Git repo in `/Users/guo/gtm/trend-fit-gtm-agent`.
- Added `.gitignore` to exclude generated and local-only files:
  - `.next/`
  - `node_modules/`
  - `.DS_Store`
  - `.env*`
  - coverage/build caches
  - `*.docx`
- Added README with the core "missing middle layer" positioning.
- Committed the Next.js MVP:
  - app routes
  - components
  - scoring logic
  - report rendering
  - demo cases
  - tests
  - project-local skills

Verification:

- `npm test` passed with 12 tests.
- Staged files were checked before commit.
- Generated folders and DOCX files were not committed.

Key design decisions:

- Treat `trend-fit-gtm-agent/` as the Git repo root, not `/Users/guo/gtm`.
- Keep global `.claude/skills` outside this repo.
- Commit project-local `skills/` because they are part of this project's strategy layer.
- Ignore generated caches and handoff DOCX artifacts.

## 2026-06-04 — Contract Cleanup Before Engineering

Status:

- Included in initial MVP baseline.

What changed:

- The scoring contract was corrected and frozen.
- All dimension scores must use only `{0, 25, 50, 75, 100}`.
- Removed earlier off-anchor values such as `85`.
- Aligned `examples.md`, `data/*.json`, and `outputs/*.md`.
- Made `examples.md` the single source of truth for the three demo cases.
- Split recommendation logic into structured fields:
  - `rawBand`
  - `finalBand`
  - `overrideReason`
  - `qualifier`

Frozen totals:

- Fashion: `90`, Strong Go
- Robotics: `74`, Go, qualifier `trust-building angle`
- AI tool: `89`, Strong Go

Why this mattered:

- Without this cleanup, `lib/scoring.ts` and tests could not produce deterministic results.
- Consistency was prioritized over preserving "nice-looking" old scores.

## 2026-06-04 — Next.js MVP Implementation

Status:

- Included in initial MVP baseline.

What landed:

- `app/` routes:
  - `/`
  - `/product-profile`
  - `/trend-input`
  - `/fit-score`
  - `/report`
  - `/api/report/[id]`
- `components/`:
  - case switching
  - workflow navigation
  - score breakdown
  - recommendation card
  - report viewer
  - product/trend input forms
- `lib/`:
  - TypeScript types
  - scoring calculation
  - demo loading
  - report helpers
  - Markdown parsing
- `tests/`:
  - scoring contract tests
  - Markdown parsing tests

Key design decisions:

- Keep v1 deterministic.
- Render existing `outputs/*.md` instead of generating new prose live.
- Preserve the demo reports as gold-standard artifacts.
- Use tests to protect scoring math and Markdown rendering behavior.

## 2026-06-04 — Open Brief / Runtime Fixes

Status:

- Included in initial MVP baseline.

Issue:

- Clicking or refreshing report pages previously exposed two classes of problems:
  - Markdown soft-wrapped paragraphs/lists/quotes rendered poorly.
  - Next dev cache produced a runtime error like `Cannot find module './331.js'`.

Fixes:

- Added `lib/report-markdown.ts`.
- Added `tests/report-markdown.test.ts`.
- Updated report rendering to parse headings, paragraphs, lists, blockquotes, and tables more safely.
- Cleared `.next/` and restarted dev server after cache corruption.

Known caveat:

- Avoid running `npm run build` while `npm run dev` is active.

## 2026-06-04 — README / Repo Hygiene

Status:

- Included in initial MVP baseline.

What landed:

- README explains:
  - the problem
  - demo results
  - scoring model
  - override rules
  - skill architecture
  - routes
  - test command
  - v1 boundaries
  - path toward evidence agent
- `.gitignore` covers the generated and local-only files.

Key messaging:

- v1 is a manual-input strategy scaffold, not a full crawler or scraping agent.
- This boundary is intentional and makes the project more credible.

## 2026-06-04 — Real Evidence Case For Quiet Luxury

Status:

- Superseded by the 2026-06-06 v1.2 rigor-layer work, which keeps the evidence case but tightens its claims.

Files changed:

- Added `outputs/demo_fashion_evidence_case.md`
- Updated `README.md`
- Updated `skills/competitor-evidence/SKILL.md`

What landed:

- A real evidence-backed version of the fashion / quiet luxury demo.
- Demonstrates the exact Assumption -> Evidence upgrade that the project needed.
- Keeps frozen demo inputs and reports unchanged.

Main result:

- Original deterministic demo: raw `90`, gated `Go` because it is assumption-only
- Evidence-backed read: raw `88`, gated `Go` because the Audience / Use-case support is still proxy/listicle-based
- Timing & Saturation revised from `75` to `50`
- Brand Safety remains `50`, but the risk is now evidence-backed

Evidence used:

- Refinery29:
  - TikTok scale / 2023 momentum
  - named expert quotes on classism and racial/cultural critique
- Essence:
  - additional cultural/racial critique context
- The VOU / Chic Style Collective / The Nod Mag:
  - affordable quiet luxury / budget-dupe / mid-market brand activity, treated as proxy evidence under v1.2
- Accio / Influencers Time:
  - secondary trend-analysis support for post-peak timing

Important correction already made:

- README now says Refinery29 provides named-expert quotes and Essence provides cultural-critique context.
- Commercial Intent now says affordable-dupe commerce/listicle content is a proxy, not measured purchase behavior.

Known limitations:

- GooseWorks was not used.
- Raw Google Trends timeseries was not used.
- Commercial Intent is still proxy-based.
- Creative Feasibility remains an assumption.

## Next Recommended Changelog Entry

Planned:

- Portfolio case study and screenshots.
- A small trend-shortlist demo: 1 product + 3 candidate trends -> evidence/gate-aware ranking.
- Optional route smoke tests for `/`, `/fit-score`, and `/report`.

Recommended scope:

- Keep the base scoring contract frozen unless a new test fails first.
- Treat historical calibration as future work unless real campaign outcomes are available.
