# Changelog

Condensed milestone log for Codex / Claude handoff. **Full detail for any entry is in
`git log` (commit messages) and in this file's own git history** — entries here are
one-to-two-line summaries, newest first.

## 2026-06-19

- **Evidence pipeline five-fix hardening shipped.** Canonical sources now contribute at most once
  per dimension; conflicting rows from one source are dropped; SerpApi related queries must match a
  discriminating trend token. HN/GDELT/TikHub now emit structured snippets with canonical post
  provenance, and TikHub uses platform-specific post/body adapters instead of a generic string walk.
- **AI semantics separated from deterministic decisions.** New `lib/evidence-stance.ts` batches 12
  snippets, requires exact response-ID coverage, rejects duplicate dimensions and weak/non-verbatim
  quotes, and preserves provider provenance. Raw provider rows are `context`; only decision evidence
  moves scores. Positive gates accept non-proxy `up` (plus legacy fixture `confirm`), never `down`.
- **Offline demo builder simplified and guarded.** `collect-and-judge.ts` now reuses the shared stance,
  Serp, fixture-generator, and structured-snippet paths; `demo_lego` keeps the user-selected 2026
  World Cup fan-culture case. A moved dimension requires two independent canonical sources before a fixture can
  be frozen. No paid APIs were called in this change. Verification: TypeScript clean, 159/159 tests,
  production build passed.

## 2026-06-18

- **Default Gemini model bumped from `gemini-2.5-flash` to `gemini-3.1-flash-lite`** in both
  `lib/baseline-scorer.ts` and `scripts/collect-and-judge.ts`. Reason: 3.1-flash-lite has higher
  free-tier RPM/RPD limits, which matters now that the stance layer batches 40+ snippets/case (the
  prior 2.5-flash run hit 503 "high demand" four times in a row before the retry loop succeeded).
  `GEMINI_MODEL` env var still overrides.



- **Single-case interview MVP.** Homepage + `/cases` now feature only `demo_ai_tool`, with the primary CTA
  opening the complete case directly. Fixed the generated brief to use evidence-adjusted scores and rigor
  consistently (89→86; brandSafety 75→50; gate/action aligned). Added a fail-closed fixture guard so the
  offline AI-stance script cannot replace a good demo with zero/non-moving evidence. First live script run
  produced only irrelevant TikTok snippets, so the curated fixture was restored and remains the honest demo
  source. 144/144 tests + production build pass; desktop browser path verified, mobile visual QA pending.
- **Evidence-bias audit + fix design (analysis/decision — no code shipped).** Found a structural defect:
  `evidencePressure` returns 0 for `direction: "confirm"` (`evidence-adjustment.ts:82`) and every runtime
  provider (HN, all 5 TikHub platforms) emits only `confirm`, so **live evidence moves the score ≈ 0**;
  the one-way damage is at the gate/confidence layer (`comment_corpus`→primary satisfies the
  `audienceOrUseCase` gate slot `recommendation-rigor.ts:192`, lifts the 100-cap `:172`, skips the
  fragility flip `:219` — all direction-blind). Demo "81→76" comes from hand-written `down` fixture rows,
  not live. (Corrects an earlier note that confirm "raises" the score.) **Fix decided with Codex:** an AI
  *stance* layer — Gemini judges supports/contradicts/irrelevant per snippet with verbatim `quote`,
  deterministic rules map to up/down, gate rebound to ≥N `supports` rows; the LLM never sets
  score/tier/verdict. Split for an interview deadline (`current-state.md` Next steps): P0 = an offline
  script freezes one AI-judged fixture for the `/cases` demo (no engine change); P1 = the live stance
  layer + gate fix + SerpApi after the interview.
- **API-cost model verified.** `/evaluate` 评估 = one `/api/evidence/collect` per candidate → HN(free) +
  GDELT(free) + **TikHub 5 platform calls**; **SerpApi = 0** in the evaluate path (only the `/workspace`
  Google Trends button, 1/click). TikHub prepaid + auto-recharge-off = hard cap; a 200-empty still bills.
  No "爆" risk for normal demo runs.

## 2026-06-15

- **Evidence-first loop closed** — `/evaluate` 评估 is now async: it collects real evidence per
  candidate via `/api/evidence/collect`, attaches the tiered `EvidenceItem[]` to the candidate, and
  the deterministic `adjustScores` + gate run on it. Result shows an "采集到的真实证据" block (counts +
  tier breakdown + per-source). Collection failures degrade to baseline-only.
- **TikHub multi-platform provider** — new `lib/tikhub-provider.ts` covers the social platforms:
  小红书 / TikTok / Instagram / X(Twitter) / **Reddit**, one paid key (`TIKHUB_API_KEY`,
  pay-per-request). Search endpoints + keyword params were verified from the TikHub Python SDK source
  (all GET, Bearer auth). Response shapes are deeply nested + per-platform, so a defensive deep-text
  extractor pulls real snippets (title/desc/caption/content/…) → audience/use-case raw-language
  candidates (`comment_corpus`, capped to medium) → the same classifier. Wired into
  `collectFreeEvidence` (parallel, graceful); `bySource` is now a dynamic `Record`. Activates only
  when `TIKHUB_API_KEY` is set; **not yet live-tested (no key in this env)** — response field
  extraction may need tuning once run against the real API. **Reddit moved here from the free OAuth
  provider** (the `REDDIT_CLIENT_ID/SECRET` path was removed) so all social is one key. Source split:
  TikHub = social, SerpApi = Google Trends, HN/GDELT = free.

## 2026-06-13

- **LLM auto baseline scoring (removes the manual-scoring step)** — new
  `POST /api/evaluate/baseline` (`lib/baseline-scorer.ts`, **`@google/genai`**, **Gemini Flash**
  `gemini-2.5-flash` via `GEMINI_MODEL`, structured `responseSchema` → 7 anchor scores
  `{0,25,50,75,100}` + per-dimension rationale; `snapToAnchor` guards the anchors). `/evaluate`
  candidates gained a "✨ 用 AI 评分" button that fills the 7 scores so the analyst no longer has
  to enter them by hand; manual sliders remain as an override. Narrative: the model proposes a
  *baseline hypothesis* (never evidence, forbidden from fabricating metrics/URLs); the
  deterministic engine + source-tier classifier + evidence gate still discipline it. Runs on the
  Gemini AI Studio **free tier**. Missing `GEMINI_API_KEY` → graceful `503` and the UI falls back
  to manual scoring (verified); the real model call needs the key set (locally in `.env.local`, on
  Vercel). *(Originally built on Anthropic; swapped to Gemini for the free tier.)*
- **Cost-control gate** — new `lib/access-gate.ts`: registration code + per-code use quota (Upstash
  Redis KV) + per-IP rate limit, wired into `/api/evaluate/baseline`. `/evaluate` gained a 注册码
  input (localStorage, sent as `x-access-code`); the route consumes one use only on success and
  returns `remaining`. **Graceful:** gating is disabled (open) until you set `ACCESS_CODES` +
  `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`. `npm test` 130/130 (added access-gate +
  route tests); build passes.
- **Free evidence providers (first real runtime evidence)** — new `lib/free-evidence-providers.ts`
  (Reddit / Hacker News Algolia / GDELT) with pure `map*ToCandidates` + thin `fetch*`, and
  `POST /api/evidence/collect` that runs them in parallel, grades each candidate through the
  deterministic `classifySourceTier` (providers never assign tier), and returns tiered evidence +
  drops + per-source counts. Honesty guards: `verificationStatus` + a `desiredConfidence` cap keep
  aggregate web signals at their proper level (Reddit raw audience/use-case → primary/medium; HN
  comment_corpus capped to medium; GDELT unverified → proxy/low; negative GDELT tone → brandSafety
  down). **Live findings (verified by hitting the route):** HN works from datacenter (10 real items,
  graded primary/medium); GDELT works but is rate-limited ~1 req/5s (best-effort); **Reddit
  public JSON returns 403 from datacenter IPs**, so it needs OAuth on Vercel — provider uses
  `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET` (free "script" app) when set, else best-effort public
  JSON. Gated + per-IP rate-limited but does NOT consume a code use (evidence is free). `npm test`
  138/138 (added 8 mapper + classifier tests).
- **Customer-facing IA restructure** — the homepage now leads with two CTAs, `开始评估 →
  /evaluate` and `案例展示 → /cases`, and the topbar verbs match. Case cards gained a
  "基准分 → 证据修正后" score legend and link to the new one-page case details. Homepage +
  gallery share `getFeaturedCaseCards()` (`lib/demo-cases.ts`; featured fashion / ai_tool /
  snack).
- **`/evaluate` analyst flow** — new `components/EvaluateClient.tsx`: product-profile form +
  candidate trends with 7-dimension segmented `{0,25,50,75,100}` scoring → 评估 → ~700ms reveal
  → deterministic score + gated band / gate / stability + evidence gaps + downloadable GTM
  brief. 1 trend → `evaluateSingleWorkspaceTrend`, ≥2 → `evaluateWorkspaceShortlist`. With no
  evidence the gate fails and the result spells out what evidence to collect — the
  evidence-discipline differentiator made interactive. The engine still does not invent the 7
  anchor scores; the analyst supplies them.
- **`/cases` gallery + `/cases/[id]` one-page detail** — SSG-prerendered case pages that stack
  input summary + signature verdict + RigorSummary + ScoreBreakdown + EvidenceComparison +
  ReportViewer with no submit/spinner. Replaces the read-only 4-step demo tour for show-and-tell
  (old tour pending Phase 3 retirement). Dropped the dark `RecommendationCard` to keep the page
  light.
- **ReportViewer dropped-section fix** — section `key`/`id` was derived from the heading text;
  workspace briefs have Chinese-only `##` titles → empty ids → duplicate keys *silently dropped
  sections*. Keys are now index-based (list + table item keys too), so the `/evaluate` brief
  renders all four sections.
- **Chinese localization** — evidence-finding notes (`competitor-research-provider`,
  `seo-keyword-provider`) and `scoring.ts` override reasons are now Chinese;
  `tests/scoring.test.ts` assertions synced.
- **Phase 3 — IA cleanup** — deleted the retired demo-tour pages (`/product-profile`,
  `/trend-input`, `/fit-score`, `/report`) and the 7 components only they used (`WorkflowNav`,
  `CaseSwitcher`, `ProfileSwitcher`, `PageHeader`, `ProductProfileForm`, `TrendInputForm`,
  `RecommendationCard`); `/api/report/[id]` download stays. `/workspace` demoted from a primary
  CTA to a new site-footer "高级 / 引擎视图" link. Removed a 641-line dead `.home-*` /
  `.case-study-*` old-homepage CSS block (all classes verified unused). README routes table +
  demo links point at the new IA. Routes are now `/`, `/evaluate`, `/cases`, `/cases/[id]`,
  `/workspace` (+ APIs).
- **Verification** — `npm test` 120/120 (Phase 3 dropped the 4 retired-page smoke tests),
  `npm run build` clean; browser-verified the homepage, `/cases`, the full `/evaluate` flow,
  and the new footer on desktop; retired routes return 404.

---

## 2026-06-12

- **Chinese GTM brief output** — `/report`, `/api/report/[id]`, and
  `outputs/demo_*_report.md` now produce customer-facing Chinese Markdown for all five demo
  cases. The copy removes interviewer/AI-internal framing and keeps the brief focused on the
  recommendation, marketing angle, risk boundary, creator fit, evidence status, and next
  test. Route smoke tests now guard against English GTM-report headings. Current verification
  is `npm test` 121/121 and `npm run build` successful.
- **Workspace Google Trends fixture fallback** — the live "运行 Google Trends（实时）" button now
  falls back to the committed fixture when the server returns 503 (no `SERPAPI_API_KEY`),
  surfacing a "演示数据" notice instead of a setup error. A public deploy stays usable for every
  visitor at zero SerpApi quota (each live run = 2 SerpApi calls; free tier ~100/mo). Buttons
  relabeled 实时 / 演示数据. Set `SERPAPI_API_KEY` in Vercel later to serve real data.
- **Deployed to Vercel + doc sync** — live at https://trend-fit-seven.vercel.app (GitHub
  About URL already set to it). README demo links / deploy section / "current gaps" and
  `current-state.md` Known issues + Next steps updated from "not deployed yet" to the live URL;
  README curl examples now hit the prod host. Remaining: click-through verify prod
  `/workspace` `/report` `/fit-score` + fixture Trends button; rotate the shared SerpApi key.
- **Chinese portfolio homepage** — `/` is now a resume-ready Chinese product showcase with a
  gated decision panel, proof strip, evidence discipline, workspace preview, and visual case
  cards backed by the real demo/evidence data.
- **Chinese README + deployment guidance** — README is now Chinese-first and starts with demo
  links, product preview images, project positioning, fixed-domain/Vercel guidance, scoring,
  routes, APIs, verification, and current gaps.
- **Case-study visuals** — added four 900x563 homepage/README images for quiet luxury
  fashion, AI photo before/after, Dubai chocolate snack, and LEGO F1 shortlist.
- **Local demo recovery note** — documented the `127.0.0.1:3000` failure mode: if the dev
  server session is reclaimed, restart with `npm run dev -- -H 127.0.0.1 -p 3000`; sandboxed
  `curl` may not see the host loopback even when the Browser can.
- **Homepage smoke guard** — route smoke tests now assert the Chinese homepage story and entry
  points.

---

## 2026-06-11

- **Evidence trust tightening** — Google Trends related queries now require trend-token
  overlap and drop obvious SEO/spam before evidence mapping. OpenCLI Twitter/Google rows and
  fixture/web search hits are now `unverified` (`proxy` / `low`), while structured SerpApi
  Trends findings stay `verified`. Follow-up tuning: a related query that keeps a real trend
  token but piles on more than `MAX_UNRELATED_RELATED_TOKENS` (4) junk tokens (e.g. "dubai
  chocolate caramelbbw emerald ebook cashback code") is dropped too — closes the spam that
  slipped through pure token-overlap.
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
