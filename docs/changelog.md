# Changelog

This changelog records project-level changes and the reasoning behind them. It is intended for handoff between Codex / Claude conversations, not just release notes.

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
