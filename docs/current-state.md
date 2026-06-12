# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-12. Main is pushed to origin; run `git log -1` for the exact HEAD
(do not hardcode a commit hash here — it goes stale on every commit).

Compact handoff snapshot for the next Codex / Claude conversation. **Full change history
lives in `docs/changelog.md` and `git log` — this file is current state only.**

Project path: `/Users/guo/gtm/trend-fit-gtm-agent` · Public repo:
`https://github.com/guohaozi/trend-fit-gtm-agent`.

## What it is

A GTM decision tool for one question: **should this specific product follow this specific
trend, and if so from what angle, with what risk?** It is the missing middle layer between
"what's trending" and "who's influential" — it judges product↔trend *fit*, with an
explainable, evidence-constrained score. It is a deterministic decision framework, **not**
an outcome-calibrated sales predictor.

**Key boundary (confirmed with the user): the system does NOT discover trends.** You input
`product + market + trend`; it gathers evidence for that pair, constrains the score, and
writes a GTM brief. A "product → candidate trends" discovery layer is intentionally out of
scope for now.

## Latest conversation handoff (2026-06-12)

User compared the project against a classmate's FitFuel Prep portfolio project and asked for
a stronger resume-ready presentation. The project now has a Chinese-first homepage and a
Chinese README:

- `/` is a Chinese product showcase page, not a bare technical homepage. It opens with
  "这个产品该不该追这个热点？", then shows a gated decision panel, proof strip, evidence
  discipline, workspace preview, and case-study cards.
- `public/case-studies/` contains four 900x563 PNG case visuals for README/homepage:
  quiet luxury fashion, AI photo before/after, Dubai chocolate snack, and LEGO F1 shortlist.
- `README.md` is now Chinese-first with local demo links, product preview images, project
  positioning, scoring model, API notes, deployment/domain guidance, and current gaps.
- `tests/route-smoke.test.ts` now asserts the redesigned Chinese homepage story and entry
  points so the portfolio surface has a cheap regression guard.

Important ops note from the same conversation: `http://127.0.0.1:3000` failed for the user
because the local `npm run dev` process had been reclaimed. Restarting with
`npm run dev -- -H 127.0.0.1 -p 3000` restored it. A sandboxed `curl` can fail to reach the
host loopback even when the Browser and elevated `curl` can; verify local reachability from
the host context when debugging this symptom.

## Data flow (product + market + trend → brief)

1. **Input**: product + market + candidate trend + risk tolerance (+ optional competitors).
2. **Baseline scores**: 7 dimensions, each an anchor score `{0,25,50,75,100}` — a *human's*
   initial judgment (demo JSON, or hand-edited in `/workspace`). The system does not invent
   the baseline.
3. **Evidence collection**: `buildResearchQueries` splits the input into 7 lanes
   (audience / useCase / commercial / timingSaturation / brandSafety / competitor) across
   web/reddit/x/xiaohongshu/youtube, plus SerpApi Google Trends for Timing.
4. **Source-tier classification** (`lib/source-tier-classifier.ts`): every candidate is
   graded deterministically — vendor copy/docs/listicle/single-thread → `proxy`; journalism
   → `secondary`; raw user language → `primary`; contradicted → dropped. Tier is computed,
   never hand-assigned.
5. **Evidence adjustment**: evidence moves the baseline anchor scores by whole steps;
   evidence gate / caps / stability / decisionType applied on top (v1.2 rigor).
6. **Output**: `outputs/*_evidence_case.md` (the GTM brief) + `data/*_evidence.json`.

## How it runs (two entry points)

- **Chinese portfolio homepage** (`/`): resume-facing entry with decision preview,
  evidence discipline, workspace preview, and visual case-study cards. This is now the best
  page to show first in a portfolio/demo context.
- **Workspace UI** (`/workspace`, the real entry): edit product/market/3 candidate
  trends/7 anchor scores/evidence rows; single-trend scoring or shortlist ranking; run
  Google Trends or replay a fixture; auto-save to localStorage + JSON import/export.
  `sourceTier` is read-only (classifier-owned). `/product-profile` and `/trend-input` are
  older demo-review screens.
- **CLI**: `npm run evidence:case:research -- --product … --market … --trend … --provider
  google-trends|opencli …` → writes `data/*_evidence.json` + `outputs/*_evidence_case.md`.

## Frozen scoring contract (do not casually change)

- 7 dimensions: Audience Overlap, Use-case Relevance, Message Bridge, Creative Feasibility,
  Commercial Intent, Brand Safety, Timing & Saturation.
- Legal anchors only: `{0, 25, 50, 75, 100}`. No off-anchor values (e.g. `85`) — that was
  the original contract bug.
- Default weights: audience .20 / useCase .20 / bridge .15 / creative .15 / commercial .10
  / safety .10 / timing .10. Total = `floor(raw + 0.5)`.
- Bands: 85-100 Strong Go · 70-84 Go · 55-69 Cautious test · 40-54 Weak fit · 0-39 No-go.
- Overrides: Brand Safety ≤25 → cap at Cautious; low risk tolerance + Brand Safety <50 →
  No-go; Audience ≤25 AND Use-case ≤25 → cap at Weak fit.
- Lives in `lib/scoring.ts` + `tests/scoring.test.ts`. **Iron rule: evidence-backed, never
  fabricate metrics or URLs.**

## v1.2 rigor layer (additive — does not rewrite the frozen contract)

`lib/recommendation-rigor.ts`. Raw score is the analyst claim; `gatedBand` is what the agent
is allowed to stand behind. A pure-assumption `90 Strong Go` is downgraded to gated `Go`
until evidence exists. Output fields: `profileUsed`, `evidenceGate`, `gateMissing`,
`gatedBand`, `dimensionCaps`, `recommendationStability`, `decisionType`, `nextValidationAction`.

- **Strong Go gate** requires non-proxy evidence for `timingSaturation`, `brandSafety`, and
  (`audienceOverlap` or `useCaseRelevance`); `ecommerce_conversion` / `b2b_pipeline`
  profiles additionally require non-proxy `commercialIntent`. Proxy/listicle cannot satisfy it.
- **No-evidence caps**: `audienceOverlap`, `creativeFeasibility`, `commercialIntent`,
  `timingSaturation` cannot sit confidently at `100` without non-proxy evidence.
- **Stability**: stable / moderate / fragile. Fragile → small test, not a scaled campaign.
- **Weight profiles** (`weight_profiles.md` + `recommendation-rigor.ts`): default,
  brand_awareness, ecommerce_conversion, b2b_pipeline, creator_seeding, risk_sensitive.

Verified baselines (regression anchors): fashion default raw `90` Strong Go → gated `Go`
(assumption-only); fashion risk_sensitive raw `81` Go; evidence fashion raw `88` gated `Go`
(support still proxy); evidence AI-tool raw `86` gate `pass` Strong Go, fragile (creative
capped as proxy), `organic push`; evidence snack raw `76` gate `pass` Go, moderate,
`creator seeding`.

## Key architecture

- `lib/scoring.ts` — frozen contract. `lib/recommendation-rigor.ts` — v1.2 gate/caps/etc.
- `lib/evidence-adjustment.ts` — evidence → anchor-step score moves.
- `lib/source-tier-classifier.ts` — deterministic tiering (verify-first, forced-proxy list).
- `lib/evidence-collector.ts` — candidates → tiered evidence draft (every candidate passes
  the classifier; agents cannot hand-grade tier).
- Providers: `lib/seo-keyword-provider.ts` (SerpApi Google Trends → Timing/Commercial),
  `lib/opencli-research-source.ts` (reddit/youtube/x raw language), `lib/customer-research-provider.ts`,
  `lib/competitor-research-provider.ts`.
- `lib/evidence-case-research-runner.ts` — CLI orchestration (7-lane queries → providers →
  draft → case files). `lib/evidence-case-orchestrator.ts` — offline merge of provider findings.
- `lib/trend-shortlist.ts` — ranks supplied candidate trends. `lib/workspace-evaluator.ts` —
  bridges `/workspace` UI state into scoring/rigor/shortlist.
- `app/page.tsx` + homepage styles in `app/globals.css` — Chinese portfolio homepage. It uses
  the same demo/evidence data as the scoring system; no separate fake marketing metrics.
- `app/api/workspace/google-trends/route.ts` — server-only SerpApi run (key never from
  browser; `fixture:true` replays `examples/google-trends-workspace.fixture.json`).
- Evidence trust tightening: Google Trends related queries must share a trend token and
  obvious SEO/spam queries are dropped before evidence mapping. Queries that keep a real
  trend token but pile on more than 4 unrelated tokens are dropped too. OpenCLI
  Twitter/Google rows and generic fixture/web search hits are `unverified` (`proxy` /
  `low`); structured SerpApi Trends findings remain `verified`.
- `scripts/verify-serpapi.ts` — one-off live SerpApi check; key stays in caller's env.
- Skills: `skills/trend-product-fit/` (SKILL.md + scoring_rubric, risk_taxonomy,
  brand_voice_rules, examples, evidence_model, weight_profiles, **source_tier_classifier.md**);
  siblings `competitor-evidence`, `campaign-generator`, `outreach-copy`, `trend-shortlist`,
  `evidence-collector`. `campaign-generator` only emits a full plan after gate pass;
  `outreach-copy` switches to creator discovery when evidence is thin.

Routes: `/`, `/product-profile`, `/trend-input`, `/fit-score`, `/report`, `/workspace`,
`/api/report/[id]`, `/api/workspace/google-trends`. Query params: `case=demo_fashion|
demo_robotics|demo_ai_tool|demo_snack|demo_protein_drink` · `profile=default|brand_awareness|
ecommerce_conversion|b2b_pipeline|creator_seeding|risk_sensitive`.

Verification: `npm test` → **120 passing**; `npm run build` succeeds; CI
(`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run build` on push/PR.
Browser checks were run for the homepage on desktop and mobile: Chinese H1 renders, no
horizontal overflow, case images load, no console errors. `/workspace` click-through was also
verified after restarting the local dev server.

## Known issues

- No public Vercel deployment or fixed domain is configured yet. Local demo works only while
  `npm run dev` is running; use `http://127.0.0.1:3000` or `http://localhost:3000`.
- Trends are manual; no auto-discovery (intentional). Shortlist ranks supplied candidates only.
- Browser-triggered OpenCLI/GooseWorks/marketplace/social collection not wired into the UI
  (Google Trends is, via the server route + fixture replay). No DB/auth/persistence — only
  localStorage + JSON export.
- Vercel CLI is not installed locally. A sandboxed `npx vercel` could not resolve npm, and an
  elevated npm download/execute request was blocked by safety review. Recommended deployment
  path is Vercel web UI + GitHub repo import.
- Weights are expert priors, not calibrated. **Do not invent a calibration set without real
  campaign outcomes** (violates the evidence rule).
- `verificationStatus` is source-specific by design. Structured SerpApi Google Trends findings
  are `verified`; unread OpenCLI Twitter/Google rows and fixture/web search hits are
  `unverified`. Future providers should keep this distinction.

## Next steps

1. **Deploy to Vercel via GitHub import**, then update README demo links and the GitHub repo
   About URL. A stable `*.vercel.app` URL is enough for resume use; a custom domain can be
   added later without changing the app.
2. **One real end-to-end through `/workspace`** with a live `SERPAPI_API_KEY` (rotate the key
   first — it was shared in chat): confirm browser → API → classifier → score on real data.
3. Provider health checks in the workspace panel before live OpenCLI/GooseWorks execution.
4. Xiaohongshu / TikTok social-language mappers; marketplace/review providers.
5. Add a short public case-study page once the Vercel URL exists.

## Gotchas / ops

- **Do not run `npm run build` while `npm run dev` is active** — both write `.next/` and
  cause stale-chunk runtime errors.
- Local dev server sessions can be reclaimed between agent turns. If the browser shows
  `ERR -102` / "无法访问此站点", check `lsof -nP -iTCP:3000 -sTCP:LISTEN` and restart with
  `npm run dev -- -H 127.0.0.1 -p 3000` if nothing is listening.
- If `npm test` fails in sandbox with `tsx` pipe `EPERM` (`listen EPERM … tsx-501/*.pipe`),
  rerun with elevated permissions.
- OpenCLI lives at `/Users/guo/.npm-global/bin/opencli`; not always on the sandbox `PATH`.
  Prefix with `PATH=/Users/guo/.npm-global/bin:$PATH` or set `OPENCLI_BIN`. If it reports
  `BROWSER_CONNECT`, run `opencli daemon restart` then `opencli doctor` (healthy only outside
  the sandbox). GooseWorks: `npx gooseworks credits` (user has ~200 credits, logged in).
- SerpApi: set `SERPAPI_API_KEY` in server env; never accept it from browser input. **The key
  shared in chat should be rotated.**
- `gh auth status` token may show invalid; plain `git push` still works via local git creds.
- `.gitignore` covers `.next/`, `node_modules/`, `.env*`, `*.tsbuildinfo`, `*.docx`, etc.

## Start here

```bash
cd /Users/guo/gtm/trend-fit-gtm-agent
git status --short --branch   # expect: ## main...origin/main, clean
git log -3 --oneline          # newest commit = your starting point
npm test                      # 120 passing
```
