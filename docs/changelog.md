# Changelog

This changelog records project-level changes and the reasoning behind them. It is intended for handoff between Codex / Claude conversations, not just release notes.

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

- Current working tree, not committed yet at the time of this handoff.

Files changed:

- Added `outputs/demo_fashion_evidence_case.md`
- Updated `README.md`
- Updated `skills/competitor-evidence/SKILL.md`

What landed:

- A real evidence-backed version of the fashion / quiet luxury demo.
- Demonstrates the exact Assumption -> Evidence upgrade that the project needed.
- Keeps frozen demo inputs and reports unchanged.

Main result:

- Original deterministic demo: `90`, Strong Go
- Evidence-backed read: `88`, Strong Go
- Timing & Saturation revised from `75` to `50`
- Brand Safety remains `50`, but the risk is now evidence-backed

Evidence used:

- Refinery29:
  - TikTok scale / 2023 momentum
  - named expert quotes on classism and racial/cultural critique
- Essence:
  - additional cultural/racial critique context
- The VOU / Chic Style Collective / The Nod Mag:
  - affordable quiet luxury / budget-dupe / mid-market brand activity
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

Recommended commit:

```bash
git add README.md skills/competitor-evidence/SKILL.md outputs/demo_fashion_evidence_case.md docs/current-state.md docs/changelog.md
git commit -m "Add real evidence case for quiet luxury"
```

## Next Recommended Changelog Entry

Planned:

- Portfolio case study and screenshots.

Target files may include:

- `docs/case-study.md`
- README screenshot section
- images under a future `public/` or `docs/assets/` directory

Recommended scope:

- Keep it presentation-focused.
- Do not change scoring contract unless a new test fails first.
