# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-18. Main is pushed to origin; run `git log -1` for the exact HEAD
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

## Latest conversation handoff (2026-06-18) — evidence-bias audit (analysis only, no code shipped)

Two findings from an audit pass; both are also folded into Known issues + Next steps below.

**1. Structural evidence bias — live evidence can't move the score at all, and one-sidedly inflates the
gate.** (Corrects an earlier claim in this doc that confirm evidence "raises" the score — it does not.)
`evidencePressure` returns **0 for `direction: "confirm"`** (`evidence-adjustment.ts:82`), and every
runtime provider (HN in `free-evidence-providers.ts`, all 5 platforms in `tikhub-provider.ts`)
hard-codes `confirm`. So **live-collected evidence moves the 7 scores ≈ 0** — after 评估 the scores are
still the AI baseline. The only live source that could emit `down` is GDELT negative tone → brandSafety,
and it's switched off. (The demo "81→76" correction comes from **hand-written `down` rows in
`data/demo_*_evidence.json`** — 4 confirm + 3 down in snack — which live collection never reproduces.)
The real defect is on the gate/confidence side, which only checks whether non-proxy evidence *exists*,
not its direction: a `comment_corpus` snippet is graded **primary** (`source-tier-classifier.ts:174`),
so any returned text (a) satisfies the `audienceOrUseCase` gate slot (`recommendation-rigor.ts:192`),
(b) lifts the 100-cap (`:172`), and (c) drops out of the fragility flip (`:219`). Net: "trend heat"
reads as "fit evidence" at the gate/confidence layer (never the score), and only ever one-way (no `down`
source) — which still undercuts "evidence-constrained, auditable, 采集者不能兼裁判". An evidence layer
that can only confirm = no judgment. **Why the overall band hasn't blown up: luck, not discipline** —
the Strong-Go gate also needs non-proxy `timingSaturation` + `brandSafety`, which the live path happens
not to produce (GDELT `unverified`→proxy; brandSafety has no live source), so the gate stalls at
`partial`. Fix = the AI-stance layer in Next steps (AI judges stance per snippet → deterministic rules
map to up/down; gate bound to ≥N `supports` rows). Decided 2026-06-18 with Codex's plan; see Next steps
for the interview-week split.

**2. API-cost model verified (answers "会不会爆" — no).** `/evaluate` 评估 calls
`/api/evidence/collect` **once per candidate trend**; each collect fans out to HN (free) + GDELT
(free) + TikHub (**5 platform calls**: 小红书/TikTok/IG/X/Reddit, `tikhub-provider.ts:161`). So
**TikHub = 5 requests per trend per 评估**; **SerpApi = 0 in the /evaluate path** (SerpApi/Google
Trends only runs from the `/workspace` manual button, 1 search/click). TikHub is prepaid +
auto-recharge-off = a hard cap (can't overspend; on empty it returns `[]`). Caveat: a 200-with-empty
result still bills. SerpApi free tier is 100/mo and is untouched by evaluations.

**3. Interview MVP narrowed to one case and verified.** The visible homepage and `/cases` gallery now
feature only `demo_ai_tool` (Snapforge AI × image before/after), and the homepage primary CTA goes
straight to `/cases/demo_ai_tool`. The case keeps the existing curated evidence fixture: baseline 89 →
evidence-adjusted 86, with `brandSafety` revised 75 → 50. The generated Markdown brief now uses the
same evidence-adjusted scores/rigor as the page (previously it mixed the baseline gate with the evidence
summary). `scripts/collect-and-judge.ts` was live-tried once: collection returned 3 TikTok snippets but
Gemini correctly judged all irrelevant, so the existing fixture was restored. A new fail-closed guard
now refuses to overwrite a demo fixture unless directional evidence exists and actually moves a score.
Fresh verification: 144/144 tests and `npm run build` pass; desktop `/` → full demo click-through passes
with no browser console errors. Mobile visual QA remains pending because the browser viewport override
did not apply in the verification environment.

## Prior conversation handoff (2026-06-15)

The latest work closed the evidence-first loop and simplified runtime evidence sources.

- **`/evaluate` now collects live evidence during evaluation.** Clicking 评估 calls
  `POST /api/evidence/collect` per candidate, attaches the returned tiered `EvidenceItem[]`
  to the `WorkspaceCandidate`, then runs the existing deterministic `adjustScores` +
  recommendation gate. The result page now shows a "采集到的真实证据" block with collected/kept
  counts, source-tier counts, and per-source counts. If collection fails or returns nothing,
  the UI falls back to baseline-only scoring.
- **TikHub replaced the short-lived Reddit OAuth path.** `lib/tikhub-provider.ts` uses one
  `TIKHUB_API_KEY` for 小红书 / TikTok / Instagram / X / Reddit social evidence. The provider
  is defensive because each platform response shape differs: it extracts snippets from
  title/desc/caption/content-style keys and maps them to audience/use-case raw-language
  candidates capped to medium confidence. It is wired into `collectFreeEvidence` and activates
  only when the key is set. It has unit coverage but has **not** been live-tested in this
  environment because no TikHub key is available.
- **Free runtime providers are now HN Algolia + GDELT only.** HN remains reliable for tech
  audience/use-case signals; GDELT remains best-effort for news coverage/timing. Google Trends
  stays on SerpApi. Apify remains deferred.
- **Vercel env vars after this change:** `GEMINI_API_KEY` for AI baseline scoring,
  `TIKHUB_API_KEY` for social evidence, optional `SERPAPI_API_KEY` for Google Trends, and
  `ACCESS_CODES` + `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for registration-code
  limits. `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` are no longer used.

## Prior conversation handoff (2026-06-13)

Customer-facing IA restructure (Claude, Phases 0–2). The user's diagnosis: the site was two
disconnected apps — a read-only 4-step demo tour (`/product-profile → /trend-input →
/fit-score → /report`) and the dense `/workspace` — with inconsistent nav verbs. Decision:
**「开始评估」is an analyst-style flow** (the engine cannot auto-score from free text — the 7
anchor scores are an *input*, so the user supplies them), and **do a full IA restructure**.

- **Homepage** (`/`): two primary CTAs — `开始评估 → /evaluate`, `案例展示 → /cases`. Topbar
  verbs unified to the same two. Case cards gained a score legend ("基准分 → 证据修正后") and
  now link to `/cases/[id]`. Homepage + gallery share `getFeaturedCaseCards()` in
  `lib/demo-cases.ts` (featured: fashion / ai_tool / snack).
- **`/evaluate`** (`components/EvaluateClient.tsx`, client): product-profile form + candidate
  trends with 7-dimension segmented `{0,25,50,75,100}` scoring → click 评估 → ~700ms reveal
  loading → 1 trend uses `evaluateSingleWorkspaceTrend`, ≥2 uses `evaluateWorkspaceShortlist`
  → signature score + gated band / gate / stability + `buildWorkspaceEvidenceGaps` +
  downloadable brief (`render*WorkspaceMarkdown`, rendered via `ReportViewer`). With no
  evidence the gate fails and the result teaches exactly what evidence to collect — the
  evidence-discipline differentiator made visible.
- **`/cases`** gallery + **`/cases/[id]`** one-page detail (SSG, 3 prerendered): input summary
  + signature verdict + RigorSummary + ScoreBreakdown + EvidenceComparison + ReportViewer, all
  instant, no submit/spinner. The dark `RecommendationCard` was dropped to keep the page light.
- **ReportViewer bug fix**: section `key`/`id` was derived from the heading text, but workspace
  briefs have Chinese-only `##` titles → empty ids → duplicate keys *silently dropped sections*.
  Keys are now index-based (list/table item keys too).
- **Chinese localization** of evidence-finding notes (`competitor-research-provider`,
  `seo-keyword-provider`) and `scoring.ts` override reasons; `tests/scoring.test.ts` synced.

Verification: `npm test` **124/124**, `npm run build` 15 pages. Browser-verified `/evaluate`
end-to-end (example scores 73 → gated 建议跟进, gate 证据不足, 3 blocking evidence gaps,
4-section brief) and the `/cases` gallery + detail on desktop.

**Phase 3 (cleanup) — done in the same session:** deleted the `/product-profile`,
`/trend-input`, `/fit-score`, `/report` page routes + the 7 components only they used
(`WorkflowNav`, `CaseSwitcher`, `ProfileSwitcher`, `PageHeader`, `ProductProfileForm`,
`TrendInputForm`, `RecommendationCard`); the `/api/report/[id]` download stays. `/workspace`
is no longer a primary CTA — it now lives in a new site footer ("高级 / 引擎视图"). Deleted a
641-line dead `.home-*` / `.case-study-*` old-homepage CSS block (every class verified unused
in TSX; tangled dead-class remnants inside shared `@media` blocks were left — they target no
live element). README routes table + demo links updated to the new IA. **Remaining loose end:
set the GitHub About URL to the live domain** (a repo setting, not in-code).

## Prior handoff (2026-06-12)

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
- `/report` and `/api/report/[id]` now output customer-facing Chinese GTM brief Markdown
  for all five demo cases. The brief copy avoids interviewer/AI-internal framing and focuses
  on recommendation, marketing angle, risk boundary, creator fit, evidence status, and next
  test. `outputs/demo_*_report.md` has been regenerated from the same Chinese generator.
- `tests/route-smoke.test.ts` now asserts the redesigned Chinese homepage story and entry
  points plus Chinese-only GTM brief downloads, so the portfolio/report surface has a cheap
  regression guard.

Important ops note from the same conversation: `http://127.0.0.1:3000` failed for the user
because the local `npm run dev` process had been reclaimed. Restarting with
`npm run dev -- -H 127.0.0.1 -p 3000` restored it. A sandboxed `curl` can fail to reach the
host loopback even when the Browser and elevated `curl` can; verify local reachability from
the host context when debugging this symptom.

## Data flow (product + market + trend → brief)

1. **Input**: product + market + candidate trend + risk tolerance (+ optional competitors).
2. **Baseline scores**: 7 dimensions, each an anchor score `{0,25,50,75,100}` — an initial
   judgment from a human (demo JSON, hand-edited in `/workspace`/`/evaluate`) **or proposed by
   an LLM (Gemini)** via `/api/evaluate/baseline` (labeled a hypothesis, gated by evidence — see the LLM
   baseline scoring section below). The engine still doesn't *invent* a trustworthy score: the
   baseline is an assumption until evidence moves and the gate clears it.
3. **Evidence collection**: `buildResearchQueries` splits the input into 7 lanes
   (audience / useCase / commercial / timingSaturation / brandSafety / competitor) across
   web/reddit/x/xiaohongshu/youtube, plus SerpApi Google Trends for Timing.
4. **Source-tier classification** (`lib/source-tier-classifier.ts`): every candidate is
   graded deterministically — vendor copy/docs/listicle/single-thread → `proxy`; journalism
   → `secondary`; raw user language → `primary`; contradicted → dropped. Tier is computed,
   never hand-assigned.
5. **Evidence adjustment**: evidence moves the baseline anchor scores by whole steps;
   evidence gate / caps / stability / decisionType applied on top (v1.2 rigor).
6. **Output**: `/report` + `/api/report/[id]` return the Chinese GTM brief; committed
   `outputs/demo_*_report.md` mirror those demo briefs. Evidence collection still writes
   `outputs/*_evidence_case.md` + `data/*_evidence.json`.

## How it runs (customer-facing entry points)

- **Homepage** (`/`): resume-facing entry; opens with the gated decision question and two
  primary CTAs — `开始评估 → /evaluate` and `案例展示 → /cases`.
- **`/evaluate`** (analyst-style flow): fill the product profile + candidate trends, score the
  7 dimensions on `{0,25,50,75,100}`, click 评估 → ~700ms reveal → signature score + gated
  decision + evidence gaps + downloadable GTM brief. Deterministic + local (no API call); the
  engine does not invent the 7 anchor scores.
- **`/cases`** + **`/cases/[id]`**: one-page case detail (input + score + brief, instant) for
  the featured demos — the "no submit, no spinner" gallery for quick show-and-tell.
- **Workspace UI** (`/workspace`, the deep engine): edit product/market/3 candidate trends/7
  anchor scores/evidence rows; single-trend scoring or shortlist ranking; run Google Trends or
  replay a fixture; auto-save to localStorage + JSON import/export. `sourceTier` is read-only
  (classifier-owned). Kept for the depth story; reachable from the site footer ("高级 / 引擎视图").
- The old read-only demo-tour screens (`/product-profile`, `/trend-input`, `/fit-score`,
  `/report`) were **retired in Phase 3**. The `/api/report/[id]` Markdown download stays (used
  by `/cases/[id]`).
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

Routes: `/`, `/evaluate`, `/cases`, `/cases/[id]` (SSG: demo_fashion / demo_ai_tool /
demo_snack), `/workspace`, `/api/report/[id]`, `/api/workspace/google-trends`,
`/api/evaluate/baseline` (LLM baseline scoring), `/api/evidence/collect` (free Reddit/HN/GDELT
evidence). Valid case ids
for `/cases/[id]` + `/api/report/[id]`: `demo_fashion|demo_robotics|demo_ai_tool|demo_snack|
demo_protein_drink` (unknown → default demo). The `?case=`/`?profile=` query params went away
with the retired demo tour; weight profiles still exist in code
(`default|brand_awareness|ecommerce_conversion|b2b_pipeline|creator_seeding|risk_sensitive`,
default used by `/evaluate` unless changed).

Verification: `npm test` → **140 passing**; `npm run build` succeeds; CI
(`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run build` on push/PR. Route smoke
tests cover `/`, `/evaluate`, `/cases`, `/cases/[id]`, `/workspace`, the `/api/report/[id]`
download, and `/api/evaluate/baseline` (503 no-key + 400 bad-input + access-gate paths). Browser
checks were run for the homepage, `/cases`, the full `/evaluate` flow, the AI-scoring 503 fallback,
and the 注册码 input rendering on desktop. **Not yet end-to-end tested: the real Gemini baseline call
and the gated path** — need `GEMINI_API_KEY` (and, for the gate, Upstash + `ACCESS_CODES`) set; none
available in this environment.

## LLM baseline scoring (2026-06-13) — answers "do users have to score manually?"

The 7 anchor scores were always an *input* (the engine can't derive them from free text). `/evaluate`
offers a "✨ 用 AI 评分" button per candidate that calls `POST /api/evaluate/baseline`
(`lib/baseline-scorer.ts`, **`@google/genai`**, **Gemini Flash** `gemini-3.1-flash-lite` via `GEMINI_MODEL` (was `gemini-2.5-flash`; swapped 2026-06-18 for higher free-tier RPM/RPD),
structured `responseSchema` → 7 anchor scores + per-dimension rationale; `snapToAnchor` guards the
anchors). The model is instructed these are **reasoned baseline hypotheses, not evidence** (no
fabricated metrics/URLs); the deterministic engine + source-tier classifier + evidence gate still
discipline whatever it proposes — a proposed 90 is gated until evidence exists. Manual sliders remain
as an override. Runs on the Gemini AI Studio **free tier**. **Graceful degradation:** no
`GEMINI_API_KEY` → `503`, UI keeps manual scoring. Set `GEMINI_API_KEY` in `.env.local` + Vercel to
enable. *(Originally built on Anthropic `claude-opus-4-8`; swapped to Gemini for the free tier — the
route/frontend/JSON contract were provider-agnostic, so only `baseline-scorer.ts` changed.)*

**Calibration stays LLM-free (the moat):** the LLM only proposes the *baseline*. Evidence → mapping →
source-tier classifier → `adjustScores` → gate/rigor is all deterministic TypeScript. AI must never
grade evidence tier or compute the adjusted score — that would break "采集者不能兼裁判 / auditable".

## Cost-control gate (`lib/access-gate.ts`, 2026-06-13)

Registration code + per-code use quota (Upstash Redis KV) + per-IP rate limit, wired into
`/api/evaluate/baseline` (and reusable by future paid routes). Order: `503` no-key → `400` bad input →
`checkAccess` (rate-limit + validate code + quota, **no consume**) → call → `consumeAccess` on success
→ returns `remaining`. `/evaluate` has a 注册码 input (localStorage → `x-access-code` header). **Env
vars:** `ACCESS_CODES` (comma-separated), `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`,
optional `ACCESS_CODE_LIMIT` (default 5) / `ACCESS_RATE_PER_MIN` (default 20). **Graceful:** if
`ACCESS_CODES` empty or Upstash unset → gating disabled (open) — that's why local dev needs nothing.
This is the cost/abuse answer: the API key lives server-side, the gate caps usage per code + per IP.

## Free evidence providers (`lib/free-evidence-providers.ts`, 2026-06-13)

First real *runtime* evidence (the live app previously only had SerpApi-fixture + offline OpenCLI).
`POST /api/evidence/collect` runs three free providers in parallel and grades each candidate through
the deterministic `classifySourceTier` (providers never assign tier), returning tiered evidence +
drops + per-source counts. Pure `map*ToCandidates` are unit-tested with fixtures. Honesty guards:
`verificationStatus` + a `desiredConfidence` cap keep aggregate web signals at their proper level.

- **Hacker News (Algolia)** — reliable from datacenter. Maps to audience/use-case as `comment_corpus`
  → primary, **capped to medium** via `desiredConfidence`. *Verified live: 10 real items, graded
  primary/medium.*
- **GDELT** — global news. Single `artlist` call → `timingSaturation` (coverage volume), unverified →
  proxy/low. `mapGdeltToCandidates(..., avgTone)` also supports a negative-tone → `brandSafety` down
  signal, but the `tonechart` call is left out of the live path because GDELT **rate-limits ~1 req/5s**
  (best-effort). *Verified live in isolation (3 real articles).*
(Reddit was briefly on a free OAuth provider but **moved to TikHub** — see below — so the free
providers are now just HN + GDELT. The `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` path was removed.)

The route is gated + per-IP rate-limited but does **not** consume a registration-code use (evidence is
free). Apify (LinkedIn etc., paid) intentionally deferred.

- **TikHub** (`lib/tikhub-provider.ts`, paid) — covers the social platforms:
  **小红书 / TikTok / Instagram / X / Reddit**. One key `TIKHUB_API_KEY` (pay-per-request, prepaid
  balance — *don't enable auto-recharge* = hard cost cap, on top of the registration gate). Search
  endpoints + keyword params verified from the TikHub Python SDK source (all GET, `Authorization:
  Bearer`). Response shapes are deeply nested + per-platform, so a **defensive deep-text extractor**
  (`extractSnippets`) pulls real snippets → audience/use-case raw-language candidates (`comment_corpus`,
  capped medium) → same classifier. Activates only when the key is set; otherwise returns nothing.
  **Not yet live-tested (no key in this env)** — if a platform returns junk/empty against the real API,
  tune `TEXT_KEYS` / the endpoint path in `tikhub-provider.ts`. Google stays on SerpApi (no free
  official Trends API). `bySource` is now a dynamic `Record`.

**Wired into `/evaluate` scoring (evidence-first loop closed, 2026-06-13):** clicking 评估 now (async)
calls `/api/evidence/collect` per candidate, attaches the returned `EvidenceItem[]` to the
`WorkspaceCandidate`, and the existing deterministic `adjustScores` + gate run on it. The result shows
an "采集到的真实证据" block (collected/kept counts, tier breakdown, per-source counts) and the
门槛后分 is the baseline corrected by real evidence. *Verified live: trend "AI agents" → 10 real HN
items (一手 ×10) fed in; the gate moved from 证据不足 → 证据部分通过.* Note: the collect call adds
~8s (GDELT's 8s timeout dominates); failures degrade gracefully to baseline-only scoring.

## Known issues

- **Live evidence never moves the score; it only one-sidedly inflates the gate (structural bias, P0).**
  All runtime providers (HN + TikHub) emit `direction: "confirm"`, and `evidencePressure` treats confirm
  as 0 pressure (`evidence-adjustment.ts:82`) — so live evidence moves the 7 scores ≈ 0 (no live `down`
  source either). The damage is at the gate/confidence layer: `comment_corpus` → primary, and the gate
  slot / 100-cap / fragility checks only test whether non-proxy evidence *exists*, not its direction, so
  any returned text passes them. Overall band is held only by the live path lacking non-proxy
  timing/brandSafety (luck, not design). Details in the 2026-06-18 handoff; fix = the AI-stance layer in
  Next steps. **Demo cases keep their curated fixtures — that's where the real up/down comes from.**
- Deployed to Vercel: https://trend-fit-seven.vercel.app (homepage verified live). No custom
  domain yet — the `*.vercel.app` URL is the public demo. Local dev still works via
  `npm run dev` at `http://127.0.0.1:3000`. Note: `/workspace`, `/report`, `/fit-score` and the
  fixture Google Trends button were not yet click-through-verified on the prod deploy — do a
  browser pass to confirm the interactive paths.
- Trends are manual; no auto-discovery (intentional). Shortlist ranks supplied candidates only.
- Browser-triggered OpenCLI/GooseWorks/marketplace/social collection not wired into the UI
  (Google Trends is, via the server route + fixture replay). No DB/auth/persistence — only
  localStorage + JSON export.
- Vercel deploy was done via the Vercel web UI + GitHub repo import (Vercel CLI is not
  installed locally). Redeploys happen automatically on push to `main`.
- Weights are expert priors, not calibrated. **Do not invent a calibration set without real
  campaign outcomes** (violates the evidence rule).
- `verificationStatus` is source-specific by design. Structured SerpApi Google Trends findings
  are `verified`; unread OpenCLI Twitter/Google rows and fixture/web search hits are
  `unverified`. Future providers should keep this distinction.

## Next steps

> Reframed 2026-06-18 around an interview deadline (demo must be showable next week). The full AI-stance
> rebuild is correct but moved to P1 — the existing engine already supports `up`/`down` pressure, it just
> never had a provider emit them, so the *demo* needs a fixture with AI-judged up/down, not an engine change.

**P0 — interview-week minimal demo path (implemented; core engine/gate unchanged):**

- **Stable interview path:** `/` and `/cases` expose only `demo_ai_tool`; the primary CTA lands directly on
  `/cases/demo_ai_tool`. The detail page shows input → seven dimensions → curated evidence → 89→86 score
  movement → gate verdict → aligned downloadable brief. Keep `/evaluate` out of the stage flow.
- **Offline AI-stance script is experimental, not demo truth:** it enforces per-dimension impacts, verbatim
  quotes, no baseline score in the stance prompt, and deterministic stance→direction mapping. The first
  real run found no usable directional evidence (HN/GDELT 0; TikTok snippets all irrelevant), so do not
  claim the current fixture was AI-judged. The script now fails closed unless evidence moves a score.
- **Verification:** `npm test` (144/144) and `npm run build` pass; desktop browser click-through has zero
  console warnings/errors. Complete a real mobile-device pass before the interview; automated viewport
  override did not take effect in the current browser session.
- **Interview narrative:** demo the curated `/cases` story; surface the AI stance `quote`/`claim` as the
  auditability highlight. Do NOT live-run `/evaluate` collection on stage (8s+, external deps, and the
  confirm-only defect). It is fine to *name* the live defect as a known gap with a designed fix — "I know
  where my evidence layer is weak and how I'd fix it without handing the verdict to an LLM" is a strength.

**P1 — full AI-stance architecture (after the interview; touches the core engine + tests):**

- **AI stance layer in live `/evaluate`** via an injectable fetcher (so tests mock it, like the SerpApi
  fetcher). Batch 10–15 snippets/candidate in one Gemini call. AI emits only `{dimension, stance, quote,
  claim}`; deterministic rules map `supports→up` / `contradicts→down` / `irrelevant→context (no score,
  no gate)`. AI never emits score/tier/confidence/magnitude/verdict. `quote` verbatim-checked; dedupe
  same URL/repost/text to one independent source.
- **Gate bound to stance (the real bypass fix — do it WITH the stance layer, not before):** change
  `hasNonProxyEvidence` (`recommendation-rigor.ts:166`) so a slot needs ≥N non-proxy **supports** rows,
  not merely "non-proxy evidence exists". Start the bar LOW (decision ①: e.g. 1 strong supports or 2
  independent). Bumping the count on confirm-only rows (1→2) without stance is a fake fix.
- **Pressure mapping:** AI-judged rows use `weak` magnitude so existing thresholds form consensus (1
  primary/medium = pressure 2, no move; 2 independent same-direction = 4, one step — verified against
  `evidence-adjustment.ts`). `audience_match: no` ≠ down; only an explicit contradicting quote lowers a
  dim. Optional: same dim with both supports + contradicts → flag "conflicted", lower stability.
- **Re-wire GDELT negative-tone → brandSafety down** (already coded, off for rate-limit) as best-effort.
- **Connect SerpApi to /evaluate** (deterministic Timing/Commercial, no AI; explicit-enable or cached to
  respect the 100/mo free tier) — only AFTER the gate is stance-bound, else it widens the bypass.
- **Full live end-to-end** on real keys once the above lands; then refresh demo fixtures if desired.

**P2 — prior backlog:**

1. **Set the GitHub repo About URL** to https://trend-fit-seven.vercel.app and click-through
   verify the prod pages (`/evaluate`, `/cases`, `/cases/[id]`, `/workspace` fixture Google
   Trends button, case images) after this push redeploys. Mobile pass for `/evaluate` + `/cases`.
2. **One real end-to-end through `/workspace`** with a live `SERPAPI_API_KEY` (rotate the key
   first — it was shared in chat): confirm browser → API → classifier → score on real data.
3. Provider health checks in the workspace panel before live OpenCLI/GooseWorks execution.
4. Xiaohongshu / TikTok social-language mappers; marketplace/review providers.
5. Optional: prune the dead-class remnants still left inside shared `@media` blocks in
   `globals.css` (harmless — they target no live element).

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
npm test                      # 140 passing
```
