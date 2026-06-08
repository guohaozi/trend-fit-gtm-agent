# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-08

This file is a handoff snapshot for starting a fresh Codex / Claude conversation.

## Project Snapshot

- Project path: `/Users/guo/gtm/trend-fit-gtm-agent`
- Git branch: `main`
- Current state: v1.2 rigor layer is implemented in docs, skills, TypeScript, tests, UI, and three evidence-backed demo cases.
- This handoff round added the AI photo-tool evidence case and the snack / Dubai-style chocolate evidence case, then prepared the repo for a clean commit.
- Latest baseline before this round: `1ae23f7 Initial Trend-Fit GTM Agent MVP`
- The exact latest commit hash should be checked with `git log -1 --oneline`.

## What The Project Is

Trend-Fit GTM Agent is a portfolio-grade GTM decision tool for answering:

> Should this specific product follow this specific social trend, and if so, from what angle, with what risk, and in what brand voice?

The core positioning is the "missing middle layer" between:

- Trend tools, which tell users what is popular
- Influencer tools, which tell users who is popular
- This project, which judges whether a trend actually fits a product

Important framing:

- It is a deterministic, explainable GTM decision framework.
- It is not an outcome-calibrated sales predictor yet.
- High raw score is an analyst claim; the v1.2 evidence gate decides what recommendation the agent is allowed to stand behind.

## Current App / Engineering State

The Next.js MVP exists and now includes a v1.2 rigor layer.

Core app files:

- `app/` — Next.js App Router pages and report API
- `components/` — reusable UI components
- `components/RigorSummary.tsx` — v1.2 gate / stability / next action panel
- `components/ProfileSwitcher.tsx` — goal-based weight profile switcher
- `lib/types.ts` — product, trend, scores, recommendation types
- `lib/scoring.ts` — frozen scoring contract, anchors, weighted totals, overrides
- `lib/recommendation-rigor.ts` — v1.2 weight profiles, evidence gate, caps, stability, decision type
- `lib/evidence-adjustment.ts` — structured evidence -> score adjustment model
- `lib/demo-cases.ts` — demo JSON loader plus profile-aware scoring and evidence results
- `tests/scoring.test.ts` — frozen scoring contract tests
- `tests/evidence-adjustment.test.ts` — evidence adjustment tests
- `tests/recommendation-rigor.test.ts` — v1.2 rigor-layer tests
- `tests/report-markdown.test.ts` — Markdown parsing regression tests

Routes:

- `/` — demo dashboard / entry
- `/product-profile` — product profile form
- `/trend-input` — trend input form
- `/fit-score` — score breakdown page, now with profile switcher and rigor summary
- `/report` — GTM brief page, now with profile switcher, rigor summary, and evidence comparison
- `/api/report/[id]` — report Markdown download endpoint

Supported query parameters:

- `case=demo_fashion | demo_robotics | demo_ai_tool | demo_snack`
- `profile=default | brand_awareness | ecommerce_conversion | b2b_pipeline | creator_seeding | risk_sensitive`

Examples:

- `/fit-score?case=demo_fashion`
- `/fit-score?case=demo_fashion&profile=risk_sensitive`
- `/report?case=demo_ai_tool`
- `/report?case=demo_fashion&profile=risk_sensitive`
- `/report?case=demo_snack`

Verification:

- `npm test` passes: 26 tests, 4 suites.
- `npm run build` passes.
- Local page smoke checks passed for:
  - `/fit-score?case=demo_fashion`
  - `/fit-score?case=demo_fashion&profile=risk_sensitive`
  - `/report?case=demo_fashion&profile=risk_sensitive`
  - `/report?case=demo_ai_tool`
  - `/report?case=demo_snack`
- The sandbox may block `npm test` because `tsx` creates a local IPC pipe under `/var/folders/...`; rerun with elevated permissions if the error is `listen EPERM ... tsx-501/*.pipe`.
- Avoid running `npm run build` while `npm run dev` is active because both can write `.next/` and trigger stale chunk errors.

## Frozen Scoring Contract

The base scoring contract remains frozen and should not be casually changed.

Seven dimensions:

- Audience Overlap
- Use-case Relevance
- Message Bridge
- Creative Feasibility
- Commercial Intent
- Brand Safety
- Timing & Saturation

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

Do not introduce off-anchor values such as `85`; earlier review found that was the main contract bug.

## v1.2 Rigor Layer

v1.2 is additive: it does not rewrite the frozen base scoring contract.

It adds:

- Goal-based weight profiles
- Evidence gate
- No-evidence caps
- Source-tier discipline
- Recommendation stability
- Decision type
- Next validation action

New output fields:

- `profileUsed`
- `evidenceGate`
- `gateMissing`
- `gatedBand`
- `dimensionCaps`
- `recommendationStability`
- `decisionType`
- `nextValidationAction`

Key design decision:

- Raw score is the analysis claim.
- `gatedBand` is the recommendation the agent is allowed to stand behind.
- A pure-assumption `90 Strong Go` must be downgraded to gated `Go` until required evidence exists.

Strong Go evidence gate:

- Standard gate requires non-proxy evidence for:
  - `timingSaturation`
  - `brandSafety`
  - `audienceOverlap` or `useCaseRelevance`
- `ecommerce_conversion` and `b2b_pipeline` additionally require non-proxy `commercialIntent` evidence.
- Proxy/listicle/affiliate/SEO pages cannot satisfy the Strong Go gate.

No-evidence caps:

- `audienceOverlap`, `creativeFeasibility`, `commercialIntent`, and `timingSaturation` cannot be treated as confidently supported at `100` without non-proxy evidence.

Stability:

- `stable`, `moderate`, or `fragile`
- A fragile recommendation can still be useful, but it should become a small test or validation step rather than a scaled campaign.

## Weight Profiles

Profiles live in both:

- `skills/trend-product-fit/weight_profiles.md`
- `lib/recommendation-rigor.ts`

Profiles:

- `default`
- `brand_awareness`
- `ecommerce_conversion`
- `b2b_pipeline`
- `creator_seeding`
- `risk_sensitive`

Important verified example:

- Fashion demo under `default`: raw `90`, Strong Go, gated `Go` because assumption-only
- Fashion demo under `risk_sensitive`: raw `81`, Go; Brand Safety weight becomes `25%`
- Evidence-backed fashion under `default`: raw `88`, Strong Go, but gated `Go` because audience/use-case support is still proxy/listicle-based
- Evidence-backed AI tool under `default`: raw `86`, Strong Go, gate `pass`, stability `fragile`, decision type `organic push`
- Evidence-backed snack under `default`: raw `74`, Go, gate `pass`, stability `fragile`, decision type `small test`

UI support:

- `/fit-score` and `/report` include the profile switcher.
- Case switching preserves the selected profile.
- Score breakdown and evidence comparison tables show the active profile's actual weights.

## Evidence Model And Case

Structured evidence assets:

- `skills/trend-product-fit/evidence_model.md`
- `data/demo_fashion_evidence.json`
- `data/demo_ai_tool_evidence.json`
- `data/demo_snack_evidence.json`
- `outputs/demo_fashion_evidence_case.md`
- `outputs/demo_ai_tool_evidence_case.md`
- `outputs/demo_snack_evidence_case.md`
- `tests/evidence-adjustment.test.ts`

Purpose:

- Demonstrates the shift from strategy scaffold to evidence agent.
- Uses real web research for the fashion / quiet luxury, AI photo-tool, and snack / Dubai-style chocolate cases.
- Keeps frozen demo data compatible with the base contract.

Key result — fashion:

- Original deterministic demo: raw `90`, gated `Go` because it is assumption-only
- Evidence-backed read: raw `88`, gated `Go` because the Audience / Use-case support is still proxy/listicle-based
- Timing & Saturation revised from `75` to `50`
- Brand Safety remains `50`, but the classism/racial-cultural risk is evidence-backed rather than merely assumed

Key result — AI photo tool:

- Original deterministic demo: raw `89`, gated `Go` because it is assumption-only
- Evidence-backed read: raw `86`, gated `Strong Go` because required non-proxy evidence exists
- Brand Safety revised from `75` to `50` due to recruiter authenticity concerns and AI-headshot backlash
- Stability remains `fragile` because the score is only one point above the Strong Go threshold, so the recommended action is `organic push`, not paid push

Key result — snack / Dubai-style chocolate:

- Original deterministic demo: raw `81`, Go, assumption-heavy
- Evidence-backed read: raw `74`, Go, evidence gate `pass`
- Timing & Saturation revised from `50` to `25` because the trend is late-stage and crowded
- Commercial Intent revised from `75` to `50` because raw consumer discussion questions hype-driven pricing
- Brand Safety revised from `75` to `50` because generic Dubai-chocolate copying can dilute brand identity and create origin/authenticity risk
- Stability remains `fragile`, so the recommended action is `small test`

Evidence source quality:

- Refinery29 = `primary`, strongest evidence for named expert critique
- Essence = `secondary`, cultural/racial critique context
- Accio / Influencers Time = `secondary`, directional timing/saturation evidence
- The VOU / Chic Style Collective = `proxy`, affordable-dupe/listicle/commercial-direction evidence only
- Shopify / Picsart docs = `primary`, direct product-workflow evidence for AI product-photo use cases
- Reddit threads = `primary`, raw user-language evidence, but usually medium-confidence because each thread is narrow
- PetaPixel / TechRadar / Digital Camera World = `secondary`, market and risk context for AI headshot adoption/backlash
- Shake Shack official product page = `primary`, directly observed brand adaptation for snack/food trend fit
- AP / FoodNavigator / The Drum = `secondary`, market, timing, and brand-risk context for Dubai-style chocolate

Critical correction:

- The VOU and Chic Style Collective must not be allowed to satisfy the Strong Go gate.
- They are useful for direction, but they are not real user comments, raw platform data, or measured buying behavior.

## Strategy / Skill Assets

Project-local skills live in `skills/`.

Core skill:

- `skills/trend-product-fit/SKILL.md`
- Supporting files:
  - `scoring_rubric.md`
  - `risk_taxonomy.md`
  - `brand_voice_rules.md`
  - `examples.md`
  - `evidence_model.md`
  - `weight_profiles.md`

Sibling skills:

- `skills/competitor-evidence/SKILL.md`
- `skills/campaign-generator/SKILL.md`
- `skills/outreach-copy/SKILL.md`
- `skills/trend-shortlist/SKILL.md`

Important design decisions:

- `trend-product-fit` is the core decision layer.
- `competitor-evidence` is an adapter/evidence layer, not a full crawler by itself.
- `trend-shortlist` ranks multiple candidate trends using evidence-adjusted and gated results.
- `campaign-generator` should only create full campaign output after gate pass; otherwise it should recommend small tests.
- `outreach-copy` should not mass-DM when evidence is insufficient; it should move into creator discovery or validation.

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

If this state is ever found uncommitted, use:

```bash
git status
npm test
npm run build
git add <current-round-files>
git commit -m "Add evidence-backed AI and snack cases"
```

## Known Issues / Caveats

- No real historical calibration set exists yet.
- Do not invent a 20-50 case calibration set without real campaign outcomes.
- The current weights are expert priors, not empirically calibrated posteriors.
- GooseWorks CLI is not available in the current Codex environment; project-local skills were used as scoring / evidence discipline, while source collection still used manual web research fallback.
- Raw Google Trends / SEO timeseries was not used.
- Commercial Intent in the fashion evidence case is still proxy-based, not measured purchase behavior or live "where to buy" comments.
- Creative Feasibility in the fashion evidence case remains an assumption.
- Reddit evidence in AI and snack cases is useful raw user language, but each thread is narrow and should not be treated as market-wide measurement.
- The evidence-backed cases are not model-training labels. They are analyst-reviewed examples used to pressure-test and improve the scoring logic, evidence gate, and case-study story.
- Timing & Saturation should eventually use raw Google Trends / SEO timeseries instead of secondary trend-analysis pages.
- The app does not yet auto-discover trends; trends are still manual/demo inputs.
- The app does not yet run automatic multi-source evidence collection.
- If running `npm test` inside Codex sandbox fails with `tsx` pipe `EPERM`, rerun with elevated permissions.
- Do not run `npm run build` concurrently with `npm run dev`; stale `.next` chunks previously caused a runtime error.

## Recommended Next Steps

1. Start the next conversation from this file, `docs/changelog.md`, and the latest commit shown by `git log -1 --oneline`.
2. Turn the repeated manual workflow into a reusable `evidence-collector` skill or script: trend + product -> source candidates -> source tiering -> `data/*_evidence.json`.
3. Add a small trend shortlist demo: 1 product + 3 candidate trends -> evidence-adjusted gated ranking.
4. Add route smoke tests for `/`, `/fit-score`, and `/report`, including `demo_ai_tool` and `demo_snack`.
5. Add portfolio screenshots and a short case-study page/doc showing the three evidence-backed examples.
6. Later, integrate a real evidence toolchain:
   - GooseWorks for Reddit/X comments, competitor activity, and creator discovery
   - Google Trends / SEO timeseries for Timing & Saturation
   - Product/competitor research skill for deeper product-market context
7. Much later, build a real historical calibration set only from labelled campaign outcomes.

## Best One-Sentence Framing

This is not just a prompt bundle: it is a deterministic GTM scoring scaffold with tests, goal-based lenses, evidence gates, source-tier discipline, and three evidence-backed cases showing the path toward an evidence-aware trend-fit agent.
