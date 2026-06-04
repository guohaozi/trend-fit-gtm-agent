# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-04

This file is a handoff snapshot for starting a fresh Codex / Claude conversation.

## Project Snapshot

- Project path: `/Users/guo/gtm/trend-fit-gtm-agent`
- Git branch: `main`
- Baseline commit: `1ae23f7 Initial Trend-Fit GTM Agent MVP`
- Current working tree is not fully committed yet.
- Current uncommitted work:
  - `README.md` updated with an evidence-agent example link
  - `skills/competitor-evidence/SKILL.md` updated with a worked real example pointer
  - `outputs/demo_fashion_evidence_case.md` added as the first real evidence-backed case
  - `docs/current-state.md` and `docs/changelog.md` added by this handoff step

## What The Project Is

Trend-Fit GTM Agent is a portfolio-grade GTM decision tool for answering:

> Should this specific product follow this specific social trend, and if so, from what angle, with what risk, and in what brand voice?

The core positioning is the "missing middle layer" between:

- Trend tools, which tell users what is popular
- Influencer tools, which tell users who is popular
- This project, which judges whether a trend actually fits a product

## Current App / Engineering State

The Next.js MVP exists and is committed in the initial baseline.

Core app files:

- `app/` — Next.js App Router pages and report API
- `components/` — reusable UI components
- `lib/types.ts` — product, trend, scores, recommendation types
- `lib/scoring.ts` — scoring contract, anchor validation, overrides
- `lib/demo-cases.ts` — demo JSON loader
- `lib/report-sections.ts` — report section helpers
- `lib/report-markdown.ts` — Markdown parser/renderer support
- `tests/scoring.test.ts` — scoring contract tests
- `tests/report-markdown.test.ts` — Markdown parsing regression tests

Routes:

- `/` — demo dashboard / entry
- `/product-profile` — product profile form
- `/trend-input` — trend input form
- `/fit-score` — score breakdown page
- `/report` — GTM brief page
- `/api/report/[id]` — report Markdown download endpoint

Verification:

- `npm test` passes: 12 tests, 2 suites
- The sandbox may block `npm test` because `tsx` creates a local IPC pipe under `/var/folders/...`; rerun with elevated permissions if the error is `listen EPERM ... tsx-501/*.pipe`.
- A previous `npm run build` passed, but avoid running `npm run build` while `npm run dev` is active because both can write `.next/` and trigger stale chunk errors like `Cannot find module './331.js'`.

## Scoring Contract

The scoring contract is frozen and should not be casually changed.

Seven dimensions:

- Audience Overlap — 20%
- Use-case Relevance — 20%
- Message Bridge — 15%
- Creative Feasibility — 15%
- Commercial Intent — 10%
- Brand Safety — 10%
- Timing & Saturation — 10%

Legal score anchors only:

- `0`
- `25`
- `50`
- `75`
- `100`

Rounding:

- Display total = `floor(raw + 0.5)`

Decision bands:

- `85-100` — Strong Go
- `70-84` — Go
- `55-69` — Cautious test
- `40-54` — Weak fit
- `0-39` — No-go

Overrides:

- Brand Safety <= 25 caps final recommendation at Cautious test
- Low risk tolerance + Brand Safety < 50 forces No-go
- Audience Overlap <= 25 and Use-case Relevance <= 25 caps final recommendation at Weak fit

Frozen demo totals:

- Fashion / quiet luxury: `90`, Strong Go
- Robotics / smart home setup: `74`, Go with qualifier `trust-building angle`
- AI photo tool / before-after: `89`, Strong Go

Do not introduce off-anchor values such as `85`; earlier review found that was the main contract bug.

## Strategy / Skill Assets

Project-local skills live in `skills/`.

Core skill:

- `skills/trend-product-fit/SKILL.md`
- Supporting files:
  - `scoring_rubric.md`
  - `risk_taxonomy.md`
  - `brand_voice_rules.md`
  - `examples.md`

Sibling skills:

- `skills/competitor-evidence/SKILL.md`
- `skills/campaign-generator/SKILL.md`
- `skills/outreach-copy/SKILL.md`

Important design decision:

- `trend-product-fit` is the core decision layer.
- `competitor-evidence` is an adapter/evidence layer, not a full crawler by itself.
- `campaign-generator` and `outreach-copy` should only run after the fit decision exists.

## Evidence Case Added In This Round

A real evidence-backed case has been added:

- `outputs/demo_fashion_evidence_case.md`

Purpose:

- Demonstrates the shift from strategy scaffold to evidence agent.
- Uses real web research for the fashion / quiet luxury case.
- Keeps frozen demo data untouched.

Key result:

- Original deterministic demo: `90`, Strong Go
- Evidence-backed read: `88`, Strong Go
- Timing & Saturation revised from `75` to `50`
- Brand Safety remains `50`, but the classism/racial-cultural risk is now evidence-backed rather than merely assumed

Important distinction:

- This evidence case is a separate worked example.
- It does not change `data/demo_fashion.json`, `outputs/demo_fashion_report.md`, or the scoring tests.
- That separation is intentional: baseline demo = deterministic scaffold; evidence case = evidence-agent demonstration.

Evidence source quality:

- Refinery29 supports the strongest claims: TikTok scale, 2023 timing, classism critique, named expert quotes.
- Essence supports cultural/racial critique context.
- The VOU / Chic Style Collective / The Nod Mag support affordable-dupe / mid-market activity, but they are commerce/listicle sources and should be treated as directional signals.
- Accio / Influencers Time are secondary trend-analysis sources for post-peak trajectory; production-grade Timing should eventually use raw Google Trends data.

## Git / Repo Hygiene

`.gitignore` is in place and should ignore:

- `.next/`
- `node_modules/`
- `.DS_Store`
- `.env*`
- `coverage/`
- `*.tsbuildinfo`
- `*.docx`

The handoff DOCX files are intentionally ignored.

Current recommended next commit:

```bash
git status
npm test
git add README.md skills/competitor-evidence/SKILL.md outputs/demo_fashion_evidence_case.md docs/current-state.md docs/changelog.md
git commit -m "Add real evidence case for quiet luxury"
```

## Known Issues / Caveats

- GooseWorks CLI is not installed locally, so the first evidence case used web research instead of GooseWorks.
- `product-swipefile` exists under `/Users/guo/gtm/.claude/skills/product-swipefile`, but its full deep-research flow depends on its own runtime expectations and may require Claude/opencli setup.
- The evidence case is not yet a fully automated pipeline.
- Commercial Intent in the evidence case is still proxy-based: commerce/listicle volume, not measured purchase behavior or live "where to buy" comments.
- Creative Feasibility in the evidence case remains an assumption.
- Timing & Saturation should eventually use `seo-keyword-research` / Google Trends raw timeseries instead of secondary trend-analysis pages.
- If running `npm test` inside Codex sandbox fails with `tsx` pipe `EPERM`, rerun with elevated permissions.
- Do not run `npm run build` concurrently with `npm run dev`; stale `.next` chunks previously caused a runtime error.

## Recommended Next Steps

1. Commit the evidence-case + docs handoff changes.
2. Create a new branch for the next iteration, for example:

```bash
git checkout -b polish/portfolio-case-study
```

3. Add a portfolio case study page or doc that tells the project story:
   - problem
   - scoring model
   - evidence-backed upgrade
   - output brief
   - screenshots
   - limitations
4. Capture visual screenshots of the app for README / portfolio use.
5. Add a smoke test or simple route check for `/`, `/fit-score`, and `/report`.
6. Later, integrate a real evidence toolchain:
   - `seo-keyword-research` for Google Trends / Timing
   - GooseWorks for Reddit/X comments and competitor activity
   - `product-swipefile` for deeper competitor/product research

## Best One-Sentence Framing

This is not just a prompt bundle: it is a deterministic GTM scoring scaffold with tests, risk loops, and an early evidence-backed case showing the path toward a real evidence agent.
