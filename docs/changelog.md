# Changelog

This changelog records project-level changes and the reasoning behind them. It is intended for handoff between Codex / Claude conversations, not just release notes.

## 2026-06-10 — Workspace Provider Preview and Portable OpenCLI Default

Status:

- Pushed the previous workspace / shortlist commit (`e1f82d5`) to `origin/main`.
- Added the first fixture/dry-run provider panel to `/workspace`.
- Removed the user-specific OpenCLI default path from runtime command generation.

What landed:

- Added `buildWorkspaceProviderPreview()` in `lib/workspace-evaluator.ts`.
- Extended `components/WorkspaceClient.tsx` with a Provider preview panel in the result
  pane for both single-trend and shortlist modes.
- Added provider preview styles to `app/globals.css`.
- Changed `lib/opencli-research-source.ts` so default OpenCLI resolution is portable:
  explicit `--opencli-bin`, then `OPENCLI_BIN`, then `opencli` from `PATH`.
- Added tests for provider-preview command generation and portable OpenCLI dry-run
  output.
- Updated README, product-marketing context, and current-state test counts to 95.

Current behavior:

- `/workspace` now shows:
  - a dry-run OpenCLI command for the active single trend or current shortlist winner;
  - a portable fixture smoke command using
    `examples/dji-middle-east-search-results.fixture.json`;
  - targeted evidence slots and planned provider source classes;
  - notes that provider output is only candidate evidence and `sourceTier` remains
    classifier-owned.
- The panel can copy both provider commands.
- The browser still does not execute live OpenCLI / GooseWorks / Google Trends calls.

Key design decisions:

- Make the provider panel a reproducible contract/demo layer before adding live browser
  execution.
- Keep live providers as candidate-source collectors, never scoring authorities.
- Do not expose editable `sourceTier` in the workspace; future evidence editing should
  allow source URL, source signals, direction, verification status, and notes, while the
  classifier computes tier.
- Remove hardcoded `/Users/guo/.npm-global/bin/opencli` from runtime defaults so
  portfolio reviewers and CI are not tied to one machine.

Verification:

- `npm test` passes with 95 tests.
- `npm run build` passes.
- HTTP verification against local `/workspace` returned 200 and confirmed provider panel
  content, dry-run command, and fixture command in SSR output.
- Browser screenshot verification was attempted but blocked because the bundled
  Playwright package had no installed browser binary in this environment.

Known issues:

- Provider panel is still preview/copy-only. It does not run fixture or live provider
  collection from the browser.
- Provider health checks are not implemented yet.
- Google Trends / SEO execution is still a missing live provider; the current SEO layer
  is still a mapper for supplied findings.

Recommended next step:

- Add a server/API boundary for fixture provider runs and provider health checks, then
  build the evidence editor with read-only classifier-owned `sourceTier`.

## 2026-06-10 — Editable Workspace UI

Status:

- Added the first usable frontend workflow so the project is no longer demo-page only.
- The workspace can run single-trend scoring and 3-trend shortlist ranking from editable
  browser state.
- Added Markdown export and provider-oriented evidence-gap guidance to the workspace
  result panel.
- This was intentionally done before adding more live providers: the editable workflow
  makes missing provider needs visible from real user input instead of guessing adapter
  requirements in the abstract.

What landed:

- Added `app/workspace/page.tsx`.
- Added `components/WorkspaceClient.tsx`.
- Added `lib/workspace-evaluator.ts`.
- Added `tests/workspace-evaluator.test.ts`.
- Updated the top navigation to include "开始评估".
- Extended `app/globals.css` with responsive workspace form, score matrix, and result
  panel styles.
- Added copy-to-clipboard Markdown export for both single-trend and shortlist modes.
- Added evidence-gap cards that translate missing gate slots and dimension caps into
  provider-oriented next steps.

Key design decisions:

- `/workspace` is the real workflow entry point; `/product-profile` and `/trend-input`
  remain demo/review screens for now.
- The first workflow pass uses client state, deterministic scoring, fixture/curated
  evidence, and Markdown export. It does not introduce a database, auth, background jobs,
  or browser-triggered live CLI execution.
- Live providers should fill evidence gaps, not override scoring. Provider output must
  still pass through source-tier classification, evidence gates, profile weighting, and
  stability checks.
- Evidence-gap copy is provider-oriented on purpose: it names the missing hard evidence
  class, such as Google Trends / SEO timing, raw social language, marketplace/review
  proof, brand-safety checks, or commercial intent.

Current behavior:

- Users can edit product fields, risk tolerance, weight profile, three candidate trends,
  and seven anchored score dimensions.
- The right-side result panel switches between single-trend rigor output and shortlist
  ranking.
- The result panel can copy a Markdown memo/report for the current mode.
- Evidence gaps identify what is missing, such as raw social language, brand-safety
  checks, commercial intent, or Google Trends / SEO timing evidence.
- The default state loads the LEGO World Cup / F1 / graduation-season shortlist.

Current boundary:

- The UI does not yet execute OpenCLI, GooseWorks, Google Trends, or other live providers.
- Evidence editing is not exposed yet; the default LEGO rows include curated evidence
  from `data/lego_trend_shortlist.json`.
- Provider-backed collection should be added as a controlled second step, ideally with
  dry-run / fixture mode before live local CLI execution.

Known issues:

- Evidence items are not editable in the browser yet; only the score inputs and trend
  descriptions are editable.
- The shortlist can rank three manually supplied candidate trends, but it does not
  discover trends from product + market by itself.
- The current UI verification was manual through a local browser session; add route-level
  smoke tests or screenshots before broadening the UI surface.

Recommended next step:

- Add evidence-item editing and a fixture-backed provider panel to `/workspace`, then
  wire the panel to real Google Trends / SEO timing and raw social-language providers.

## 2026-06-10 — Trend Shortlist Ranking Contract and LEGO Demo

Status:

- Added the first reusable trend-shortlist ranking layer.
- Added a LEGO shortlist demo comparing World Cup fan culture, F1 race weekend, and
  graduation season gifting.

What landed:

- Added `lib/trend-shortlist.ts` with deterministic ranking by gated band, adjusted
  total, stability, and Timing & Saturation.
- Added `tests/trend-shortlist.test.ts` covering the ranking contract and LEGO demo.
- Added `data/lego_trend_shortlist.json`.
- Added `outputs/lego_trend_shortlist.md`.

Key interpretation:

- F1 race weekend ranks first for LEGO because the product-trend bridge is direct, the
  creative format is already native to LEGO, and the audience overlap is stronger than a
  generic cultural event activation.
- World Cup fan culture is high-timing and broad-audience, but it needs a sharper
  licensed or fan-ritual angle before it should beat F1.
- Graduation season gifting is safe and commercially useful, but less distinctive.

Current boundary:

- This is not yet a live trend discovery runner. The first version ranks manually entered
  candidates with supplied baseline scores and optional evidence.
- The LEGO demo uses curated evidence items and should be treated as a shortlist
  workflow demo, not a complete market-research case.

Recommended next step:

- Reuse the shortlist ranking contract from `/workspace` after provider execution exists:
  product + market -> candidate trends -> provider evidence -> gated shortlist ranking.

## 2026-06-10 — Credibility Cleanup and CI

Status:

- Refreshed public-facing project claims so the README, product-marketing context, and
  handoff docs match the current repository state.
- Added a minimal GitHub Actions CI workflow for repeatable verification.

What landed:

- Added `.github/workflows/ci.yml` with `npm ci`, `npm test`, and `npm run build`.
- Updated README evidence claims from the old four-case wording to 13 structured
  evidence cases.
- Updated README and product-marketing proof points to the current passing local
  tests and successful production build.
- Clarified that `/product-profile` and `/trend-input` are currently demo review screens,
  not editable production forms.
- Updated the README project tree so it reflects provider / orchestration tests,
  evidence automation docs, and CI without pretending to list every case file.

Why this matters:

- The repo is now less likely to overstate product readiness or understate the current
  evidence/test coverage.
- CI makes the public portfolio artifact more credible because tests and build are not
  only local claims.

Known issue:

- `gh auth status` reported an invalid GitHub CLI token during the handoff session. Git
  push may still work via local Git credentials, but future GitHub CLI workflows should
  refresh auth with `gh auth login -h github.com`.

## 2026-06-10 — OpenCLI Live Evidence Research Hardening

Status:

- The OpenCLI-backed `evidence:case:research` path has been tested against a real DJI
  Middle East product/trend case.
- The pipeline can now generate an evidence JSON and markdown case from product + market
  + trend using OpenCLI platform adapters.
- The live DJI case currently lands at `76 / Cautious test`, gate `partial`, stability
  `fragile`.

What landed:

- Added failure tolerance to `lib/opencli-research-source.ts`.
- Updated `scripts/evidence-case-research.ts` so OpenCLI provider runs use
  `continueOnCommandError: true`.
- Added relevance filtering before OpenCLI rows become evidence.
- Added tests covering:
  - continuing when one OpenCLI command/platform fails;
  - filtering unrelated OpenCLI rows;
  - avoiding long unrelated social posts that only mention a keyword deep in the body.
- Generated and committed the live DJI report:
  - `data/dji_drones_uae_saudi_middle_east_video_creation_security_inspection_tourism_enablement_evidence.json`
  - `outputs/dji_drones_uae_saudi_middle_east_video_creation_security_inspection_tourism_enablement_evidence_case.md`

Key design decisions:

- OpenCLI adapters are candidate-source providers, not scoring authorities.
- A single platform failure should not kill the whole research case. The report should
  still be generated from surviving providers, while tooling notes record skipped
  commands.
- Reddit / YouTube / Twitter rows must hit product/category terms and also market or
  trend terms before they are mapped into evidence.
- Google Search rows are allowed to be broader because they are still capped by the
  source-tier classifier as proxy / secondary evidence.
- Relevance checks use leading social text rather than full long bodies, so unrelated
  mega-threads cannot pass because of a stray keyword far down the post.

Operational notes:

- If OpenCLI reports `BROWSER_CONNECT`, fix the local bridge first:

```bash
PATH=/Users/guo/.npm-global/bin:$PATH opencli daemon restart
PATH=/Users/guo/.npm-global/bin:$PATH opencli doctor
```

- In this session, daemon/extension health was confirmed outside the sandbox:
  daemon running on port `19825`, Browser Bridge extension connected.
- Full DJI command:

```bash
npm run evidence:case:research -- \
  --product "DJI drones" \
  --market "UAE Saudi Middle East" \
  --trend "video creation security inspection tourism enablement" \
  --risk high \
  --profile b2b_pipeline \
  --provider opencli \
  --platforms reddit,youtube,twitter,google \
  --opencli-bin /Users/guo/.npm-global/bin/opencli \
  --limit 3
```

Known limitations:

- Google Search is not Google Trends. Timing & Saturation remains weak until a real
  Google Trends / SEO provider is executed.
- The current case still has no accepted evidence for Message Bridge, Creative
  Feasibility, and Timing & Saturation.
- OpenCLI Xiaohongshu and TikTok adapters are installed but not yet mapped into
  provider findings.
- Trend discovery / shortlist is still future work; current runner requires
  product + market + trend as input.

Recommended next step:

- Add a real Google Trends / SEO execution provider so the runner can fill Timing,
  Search Demand, and Commercial Intent with hard evidence rather than broad Google
  Search snippets.
- Then add Xiaohongshu / TikTok mappers and a trend-shortlist runner.

## 2026-06-10 — OpenCLI Research Provider

Status:

- Added an OpenCLI-backed provider for `evidence:case:research`.
- This is the first provider that executes a platform CLI and feeds raw platform rows
  into `customerResearchFindings` instead of treating everything as generic web-search
  snippets.
- Extended the same provider to support Twitter/X and Google Search rows as conservative
  evidence candidates.

What landed:

- Added `lib/opencli-research-source.ts`.
- Added `tests/opencli-research-source.test.ts`.
- Extended `lib/evidence-case-research-runner.ts` to accept provider sources that return
  structured findings, not only search results.
- Extended `scripts/evidence-case-research.ts` with:
  - `--provider opencli`
  - `--opencli-bin`
  - `--dry-run-provider-commands`

Current support:

- Reddit and YouTube searches are executed through OpenCLI and mapped through the existing
  OpenCLI customer-research adapter.
- Twitter/X search is executed through OpenCLI and mapped into raw social
  `additionalCandidates`.
- Google Search is executed through OpenCLI and mapped into conservative search-result
  `additionalCandidates`.
- Dry-run command output is available before live execution.

Current boundary:

- OpenCLI has Xiaohongshu adapters installed, but this provider does not yet map its row
  format into evidence findings.
- Google Trends / SEO, GooseWorks, TikTok, marketplace reviews, and competitor provider
  execution are still separate next adapters.

## 2026-06-10 — Product + Trend Research Runner

Status:

- Added `evidence:case:research`, a first live-research-oriented CLI that starts from
  product, market, and trend text instead of a preassembled provider JSON file.
- The runner builds research queries, collects search results through a pluggable
  `ResearchSource`, maps those results into conservative evidence candidates, and then
  reuses the existing evidence-case writer.

What landed:

- Added `lib/evidence-case-research-runner.ts`.
- Added `scripts/evidence-case-research.ts`.
- Added `tests/evidence-case-research-runner.test.ts`.
- Added `docs/evidence-case-research-cli.md`.
- Added `examples/dji-middle-east-search-results.fixture.json`.
- Added `npm run evidence:case:research`.

How it works:

- Input: `--product`, `--market`, `--trend`, `--risk`, `--profile`, optional competitors
  and platforms.
- Query builder creates lanes for audience, use case, commercial intent, timing,
  brand safety, and competitor/message bridge.
- Search results are converted into `additionalCandidates`; source-tiering still happens
  inside the existing classifier.
- Outputs are the same standard evidence JSON and markdown case memo.

Current boundary:

- The built-in live provider uses web search with site filters for Reddit, X/Twitter,
  Xiaohongshu, and YouTube discovery. It does not yet authenticate into those platforms
  or call Google Trends directly.
- The `ResearchSource` interface is intentionally small so GooseWorks, OpenCLI,
  Google Trends, X, Xiaohongshu, TikTok, and marketplace providers can be added without
  changing scoring or file-writing logic.

## 2026-06-10 — P5c Evidence Case CLI / File Writer

Status:

- Implemented the second-phase file-writing layer that turns provider output JSON into
  real evidence case artifacts.
- This is the first runnable bridge from "provider findings exist" to generated
  `data/*_evidence.json` and `outputs/*_evidence_case.md` files.

What landed:

- Added `lib/evidence-case-file-writer.ts`.
- Added `scripts/evidence-case.ts`.
- Added `examples/evidence-case-input.example.json`.
- Added `tests/evidence-case-file-writer.test.ts`.
- Added `npm run evidence:case`.

How it works:

- Input JSON contains baseline scores, risk tolerance, profile, and any mix of:
  `customerResearchFindings`, `seoKeywordFindings`, `competitorResearchFindings`, and
  `additionalCandidates`.
- The writer calls `orchestrateEvidenceCase()`, so source-tier classification,
  confidence caps, evidence adjustment, recommendation rigor, and gate logic stay inside
  the existing project pipeline.
- The CLI writes a structured evidence JSON file and a readable markdown evidence memo.

Example:

- `npm run evidence:case -- --input examples/evidence-case-input.example.json`

Why this matters:

- The project can now accept provider/skill outputs as data and produce auditable case
  files without manually assembling JSON and markdown each time.
- Provider skills still only supply candidate sources; final evidence tiering and scoring
  remain controlled by the project's classifier and orchestrator.

## 2026-06-10 — Thailand EV + LatAm Gaming Peripherals Evidence Cases

Status:

- Added the sixth and seventh evidence cases from the user's 15-case GTM / BD candidate
  list.
- Both cases use the `ecommerce_conversion` profile because the important question is
  whether there is enough commercial proof to justify conversion-oriented GTM tests.

What landed:

- Added `data/thailand_ev.json`.
- Added `data/thailand_ev_evidence.json`.
- Added `outputs/thailand_ev_evidence_case.md`.
- Added `data/latam_gaming_peripherals.json`.
- Added `data/latam_gaming_peripherals_evidence.json`.
- Added `outputs/latam_gaming_peripherals_evidence_case.md`.
- Extended scoring, evidence-adjustment, and recommendation-rigor tests for both
  ecommerce-profile case computations.

Case results:

- Thailand EV baseline under `ecommerce_conversion`: `83 / Go`.
- Thailand EV evidence-adjusted under `ecommerce_conversion`: `90 / Strong Go`.
- Thailand EV evidence gate: `pass`; stability: `moderate`; decision type:
  `organic push`.
- LatAm gaming peripherals baseline under `ecommerce_conversion`: `84 / Go`.
- LatAm gaming peripherals evidence-adjusted under `ecommerce_conversion`: `93 / Strong Go`.
- LatAm gaming peripherals evidence gate: `pass`; stability: `moderate`; decision type:
  `organic push`.

Key interpretation:

- Thailand EV is the harder commercial case: evidence supports real Thai EV adoption,
  Chinese-brand sales, policy momentum, and local production. The limiting factor is
  buyer trust around resale value, charging, price volatility, dealer quality, and
  aftersales.
- LatAm gaming peripherals is a strong community/ecommerce case: Brazil and Mexico
  gaming audiences, esports visibility, budget-performance messaging, and localized
  Redragon commercialization support a conversion test. The limiting factor is local
  warranty, delivery, software, and durability trust.

Next evidence to collect:

- Thailand EV: Thai owner reviews, dealer test-drive conversion, charging access by
  city, financing/resale comparisons, and price-cut complaint themes.
- LatAm gaming peripherals: marketplace keyword/review exports, creator comments,
  SKU-level price ladders, return/warranty complaints, and bundle-level conversion tests.

## 2026-06-10 — POP MART Middle East Evidence Case

Status:

- Added the fifth evidence case from the user's 15-case GTM / BD candidate list.
- This case uses the `brand_awareness` weight profile because the first move should be
  creator seeding and mall-retail validation, not pure ecommerce conversion.

What landed:

- Added `data/popmart_middle_east.json`.
- Added `data/popmart_middle_east_evidence.json`.
- Added `outputs/popmart_middle_east_evidence_case.md`.
- Extended scoring, evidence-adjustment, and recommendation-rigor tests for the
  brand-awareness-profile case computation.

Case result:

- Baseline under `brand_awareness`: `74 / Go`.
- Evidence-adjusted under `brand_awareness`: `75 / Go`.
- Evidence gate: `pass`.
- Stability: `moderate`.
- Decision type: `creator seeding`.

Key interpretation:

- The case is directionally good for controlled Gulf creator seeding: mall retail,
  anime / Asian pop-culture acceptance, global Labubu demand, and strong accessory
  content mechanics all support a test.
- It is not a paid-scale Strong Go yet. GCC-specific purchase data is still missing,
  Timing & Saturation remains `50`, and Brand Safety remains `50` due to counterfeit,
  safety, backlash, and cultural interpretation risks.

Next evidence to collect:

- GCC Google Trends / TikTok / Instagram velocity for POP MART, Labubu, Molly, and blind
  box terms.
- UAE / Saudi mall distributor availability and sell-through.
- Creator seeding split tests by styling, gifting, unboxing, and character type.
- Shelf checks against Miniso, Sanrio, anime retailers, and mall gift stores.

## 2026-06-10 — Japan Service Robot Evidence Case

Status:

- Added the fourth evidence case from the user's 15-case GTM / BD candidate list.
- This is the first new case intentionally using the `b2b_pipeline` weight profile.

What landed:

- Added `data/service_robot_japan.json`.
- Added `data/service_robot_japan_evidence.json`.
- Added `outputs/service_robot_japan_evidence_case.md`.
- Extended scoring, evidence-adjustment, and recommendation-rigor tests for B2B-profile
  case computation.

Case result:

- Baseline under `b2b_pipeline`: `88 / Strong Go`.
- Evidence-adjusted under `b2b_pipeline`: `93 / Strong Go`.
- Evidence gate: `pass`.
- Stability: `moderate`.
- Decision type: `organic push`.

Key interpretation:

- This is a strong B2B / BD pipeline case. Japanese restaurant labor shortage pressure,
  observable restaurant automation, and service-robot field-study evidence support pilots.
- The recommendation must stay operational and scoped: task relief, peak-hour workload
  reduction, and workflow assistance. Do not sell robots as human replacement,
  especially in eldercare.

Next evidence to collect:

- Named Pudu / Keenon / Bear Robotics Japan deployments.
- Operator interviews or trade-show lead notes.
- Local cost model: lease, maintenance, staff hourly cost, payback period.
- Integration/safety failure modes in narrow aisles, eldercare settings, and emergency
  handling.

## 2026-06-10 — Anker Europe Evidence Case + Source-Tier URL Pattern Fix

Status:

- Added the third evidence case from the user's 15-case GTM / BD candidate list.
- Fixed a source-tier classifier false positive found while building the case.

What landed:

- Added `data/anker_europe.json`.
- Added `data/anker_europe_evidence.json`.
- Added `outputs/anker_europe_evidence_case.md`.
- Extended scoring, evidence-adjustment, recommendation-rigor, and source-tier guard
  coverage.
- Updated `lib/source-tier-classifier.ts` so normal words like `desktop` do not trigger
  the `top-` listicle URL pattern.

Case result:

- Baseline: `85 / Strong Go`.
- Evidence-adjusted: `85 / Strong Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Decision type: `organic push`.

Key interpretation:

- This is the strongest of the first three new cases. EU USB-C standardization,
  laptop/multi-device charging, and Anker's compact GaN story support Strong Go.
- It remains fragile because Timing & Saturation is only `50`: UGREEN, Baseus, Belkin,
  Apple, Satechi, and low-cost GaN alternatives create real crowding and price pressure.
- The recommended push is specific organic workflow positioning, not generic paid
  "fast charging" messaging.

Classifier fix:

- Existing listicle detection used broad substring checks for `top-`, which incorrectly
  matched URLs containing words like `desktop-charger`.
- The classifier now tokenizes path segments and only treats `best-*` / `top-*` segment
  prefixes and explicit `affordable` / `dupe` tokens as listicle-style signals.

## 2026-06-10 — OBgE China Evidence Case

Status:

- Added the second evidence case from the user's 15-case GTM / BD candidate list.

What landed:

- Added `data/obge_china.json`.
- Added `data/obge_china_evidence.json`.
- Added `outputs/obge_china_evidence_case.md`.
- Extended scoring, evidence-adjustment, recommendation-rigor, and source-tier guard
  coverage so the case is recomputed.

Case result:

- Baseline: `75 / Go`.
- Evidence-adjusted: `83 / Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Decision type: `small test`.

Key interpretation:

- China male grooming evidence is strong enough to raise Audience and Commercial Intent,
  but it is still broader than men's BB cream specifically. The case should be positioned
  as natural image management / quick confidence, not a loud "men wearing makeup" push.
- Brand Safety remains `50` because masculinity stigma, shade mismatch, and over-gendered
  messaging can still create backlash.

Next evidence to collect:

- Xiaohongshu/Douyin comments for `男士素颜霜`, `男生BB霜`, `男士遮瑕`, `面试形象`.
- Tmall/JD review language for men's BB/tone-up products.
- Creator before/after posts with engagement and negative-comment themes.

## 2026-06-10 — SAVAS China Evidence Case

Status:

- Added the first new evidence case from the user's 15-case GTM / BD candidate list.

What landed:

- Added `data/savas_china.json`.
- Added `data/savas_china_evidence.json`.
- Added `outputs/savas_china_evidence_case.md`.
- Extended scoring, evidence-adjustment, recommendation-rigor, source-tier, and
  orchestrator coverage so the case is recomputed rather than trusted as static output.

Case result:

- Baseline: `78 / Go`.
- Evidence-adjusted: `83 / Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Decision type: `small test`.

Key interpretation:

- This is intentionally not a Strong Go. Public evidence supports SAVAS-style daily
  protein convenience and the broader China health/fitness audience, but this run did
  not use GooseWorks/OpenCLI/ecommerce/social providers, so China-specific RTD commercial
  intent and content feasibility remain under-supported.

Next evidence to collect:

- Xiaohongshu/Douyin comments for `蛋白饮`, `高蛋白早餐`, `减脂便利店`.
- Ecommerce search/review language for SAVAS, Keep, ffit8, Boohee, and high-protein
  yogurt/drinks.
- Convenience-store availability/pricing screenshots.
- Creator examples with measurable engagement around protein breakfast or post-workout
  drink routines.

## 2026-06-10 — P5a/b Offline Evidence Case Orchestrator

Status:

- Implemented the first P5 evidence automation layer: deterministic offline orchestration
  across the existing P2/P3/P4 provider outputs.

What landed:

- Added `lib/evidence-case-orchestrator.ts`.
- Added `tests/evidence-case-orchestrator.test.ts`.
- `orchestrateEvidenceCase()` now accepts baseline metadata plus optional customer
  research, SEO/timing, competitor research findings, and `additionalCandidates` for
  verified manual/browser research that does not naturally belong to a provider adapter.
- The orchestrator normalizes provider findings in deterministic order:
  customer -> SEO/timing -> competitor -> additional candidates.
- It calls the existing project-owned evidence pipeline:
  `buildEvidenceDraft()` -> `generateEvidenceAdjustmentCaseFromDraft()`.
- It returns `{ candidates, draft, evidenceCase }`, so future CLI/UI layers can inspect
  raw candidates, accepted/dropped evidence, and the final generated evidence case.

Key design decision:

- This layer is deliberately offline and deterministic. It does not browse, call OpenCLI,
  invoke GooseWorks, or write files. Research providers own data collection; the
  orchestrator owns merging normalized findings into the source-tiered scoring pipeline.

Known issues / not done:

- P5c CLI/file writer is not implemented yet.
- Trend discovery / trend-shortlist orchestration is not implemented yet.
- The app UI still uses frozen demo inputs rather than running this orchestrator from a
  user-entered product.

Verification:

- `npx tsc --noEmit` passed.
- `npm run build` passed.
- `node --import tsx --test tests/*.test.ts` passed: 54 tests.
- `npm test` still cannot run in the current sandbox because the `tsx --test` CLI fails
  to create its IPC pipe with `listen EPERM`; the Node test runner with `--import tsx`
  works and was used for verification.

## 2026-06-10 — Handoff Docs For P0-P4 Evidence Automation

Status:

- Updated handoff docs so a fresh conversation can continue from the current evidence
  automation state without re-reading the whole thread.

What landed:

- `docs/current-state.md` now explicitly records that P0-P4 are complete:
  - P0 product-marketing context;
  - P1 evidence case generator;
  - P2 customer-research / OpenCLI provider;
  - P3 SEO keyword / timing provider;
  - P4 competitor-profiling / product-swipefile provider.
- It also records that P5 orchestration has not been implemented yet.
- Added the recommended P5 design: merge provider findings from P2/P3/P4 into
  `EvidenceCandidate[]`, call `buildEvidenceDraft()`, then call
  `generateEvidenceAdjustmentCaseFromDraft()`.

Key design decision:

- The next automation step should be an offline, deterministic library layer first. It
  should not browse, call OpenCLI, or write files. Provider adapters own data collection;
  the orchestrator owns merging normalized findings into the existing collector and P1
  generator pipeline.

Known issues / not done:

- No `lib/evidence-case-orchestrator.ts` exists yet.
- No `tests/evidence-case-orchestrator.test.ts` exists yet.
- No CLI/script exists yet to read provider JSON and write `data/*_evidence.json` plus
  `outputs/*_evidence_case.md`.

Next recommended move:

- Implement P5a/b first: add the orchestrator library API and fixture-based test. After
  that passes, add a CLI/file-writer layer as a separate P5c step.

Verification:

- Documentation-only update. No app/test behavior changed.

## 2026-06-10 — Competitor Provider And AI-Tool Competitor Evidence Variant

Status:

- Added the P4 competitor research layer after P0-P3 provider work.

What landed:

- Added `lib/competitor-research-provider.ts`, which converts competitor-profiling /
  product-swipefile style findings into `EvidenceCandidate[]`.
- Added `tests/competitor-research-provider.test.ts`, covering direct findings, structured
  profile extracts, and full draft -> generated evidence case flow.
- Added `data/demo_ai_tool_competitor_evidence.json` and
  `outputs/demo_ai_tool_competitor_evidence_case.md`.
- Extended evidence-adjustment and recommendation-rigor tests so the competitor-layer case
  is recomputed rather than trusted as static JSON.

Key design decision:

- Competitor research remains a provider layer. It does not hand-grade final evidence,
  source tiers, or scores.
- Competitor-owned copy can support audience direction only as proxy. Directly observed
  competitor campaigns can be primary evidence for competitor activity and trend usage.

Case result:

- AI photo-tool baseline: `89 / Strong Go`.
- Competitor-adjusted: `85 / Strong Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Main movement: competitor activity reduces Timing & Saturation, while Evoto backlash
  reduces Brand Safety.

Verification:

- `node --import tsx --test tests/*.test.ts` passed: 53 tests.
- `npm run build` passed.

## 2026-06-09 — Tooling Handoff: GooseWorks, OpenCLI, And Local Skill Substitutes

Status:

- Captured the evidence-collection tooling state for a fresh conversation.

What was verified:

- User terminal verified GooseWorks:
  - `npx gooseworks login` reports already logged in as `gh1225835497@gmail.com`.
  - `npx gooseworks credits` reports `200` credits available.
- OpenCLI is installed at `/Users/guo/.npm-global/bin/opencli`.
- OpenCLI works when `/Users/guo/.npm-global/bin` is added to `PATH`.
- Product-swipefile's `opencli-check` reports OpenCLI available when run with:

```bash
PATH=/Users/guo/.npm-global/bin:$PATH \
  python3 /Users/guo/gtm/.claude/skills/product-swipefile/scripts/research_helper.py opencli-check
```

What did not work:

- Remote `find-skills` registry search did not complete inside Codex:
  - `npx skills find "reddit google trends web research"` failed with
    `getaddrinfo ENOTFOUND registry.npmjs.org`.
  - An escalated retry was rejected because `npx skills find` would download and execute
    public npm code, which the sandbox reviewer flagged as supply-chain risk.
- Local skill discovery did work. Use user-terminal `npx skills find ...` plus pasted
  results if remote skill discovery is needed in the next conversation.

Local substitutes identified:

- `product-swipefile` for product/competitor inventory.
- `opencli` for raw platform/community search across Reddit, X/Twitter, TikTok, Douyin,
  Xiaohongshu, Bilibili, YouTube, Zhihu, Weibo, Product Hunt, Hacker News, and more.
- `reddit-icp-monitor` for raw Reddit user language and buyer pain.
- `seo-keyword-research` for Google Trends/related-query timing signals if `SERPAPI_KEY`
  is configured.
- `map-your-market`, `where-your-customer-lives`, and `competitor-pr-finder` as optional
  specialized providers, depending on script/API-key availability.

Design decision:

- GooseWorks and OpenCLI should be treated as candidate-source providers only. Their
  output should normalize to `EvidenceCandidate[]`, then pass through
  `buildEvidenceDraft()` and `source-tier-classifier` before any score adjustment.

Next recommended move:

- Implement a lightweight provider flow that detects GooseWorks/OpenCLI availability,
  gathers candidate sources, and converts them into `EvidenceCandidate[]`.

## 2026-06-09 — Protein Drink Evidence Case With Collector

Status:

- Added the first new evidence case produced through the new evidence-collector workflow:
  convenience-store RTD protein drink x everyday protein / lifestyle weight management.

What landed:

- Added `data/demo_protein_drink.json` as the fifth baseline demo.
- Added `data/demo_protein_drink_evidence.json` as the fourth evidence-backed case.
- Added `outputs/demo_protein_drink_report.md` and
  `outputs/demo_protein_drink_evidence_case.md`.
- Wired the case into `lib/demo-cases.ts`, `lib/display-labels.ts`, README, and tests.
- Extended scoring, evidence adjustment, and recommendation-rigor tests to cover the new
  baseline and evidence-backed result.

Key result:

- Baseline: `78 / Go`.
- Evidence-adjusted: `85 / Strong Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Decision type: `organic push`, not paid push.

Why it matters:

- The case captures the user's actual market insight: Japan has normalized SAVAS-style
  ready-to-drink protein in convenience retail, while China has rising fitness / healthy
  lifestyle interest but weaker mainstream convenience-store RTD protein drink behavior.
- The evidence case shows a useful Strong Go that is still constrained by health-claim
  risk and threshold fragility.

Collector finding and fix:

- Glanbia's China sports-nutrition article is useful category evidence and cites third-party
  market signals, but Glanbia is also a nutrition-ingredient supplier. This exposed a
  classifier gap, so this round added a `supplier_category_report` signal: verified
  supplier-owned category research can be `secondary`, but max confidence is capped at
  `medium`.

## 2026-06-09 — Evidence Collector First Step

Status:

- Implemented the first reusable evidence-collector layer so evidence collection is no
  longer only a manual research/documentation process.

What landed:

- Added `lib/source-tier-classifier.ts`, a reusable TypeScript implementation of the
  verify-first classifier:
  - unverified sources are capped at `proxy` / `low`;
  - contradicted sources are dropped;
  - vendor docs/copy, listicles, press releases, and anecdotes are forced proxy;
  - one Reddit/social thread can be `primary` only for raw Audience or Use-case language,
    with max `medium` confidence;
  - requested confidence is clamped to the source tier ceiling.
- Added `lib/evidence-collector.ts`, which converts `EvidenceCandidate` records into an
  auditable evidence draft with accepted `EvidenceItem[]`, dropped candidates, and
  per-candidate classifications.
- Added `tests/evidence-collector.test.ts` and expanded
  `tests/source-tier-classifier.test.ts` so the classifier is no longer duplicated only
  inside a guard test.
- Added `skills/evidence-collector/SKILL.md`, a project-local skill that can borrow
  `.claude/skills/gooseworks` for candidate-source discovery while keeping source-tiering
  inside the project-owned classifier.
- Updated `skills/competitor-evidence/SKILL.md` to make competitor research feed the
  evidence collector rather than hand-grade `sourceTier`.
- Updated README skill architecture to include `evidence-collector`.

Key design decision:

- Keep this as a candidate-to-evidence conversion layer, not a crawler. GooseWorks,
  browser research, or user URLs can supply candidates, but only verified claims can earn
  non-proxy tiers. This preserves the project's anti-overclaiming boundary.

Next recommended move:

- Use the collector on one fresh evidence case, then build the trend-shortlist demo on top
  of collector-produced evidence.

## 2026-06-09 — Public GitHub Portfolio Handoff

Status:

- Published the project as a public GitHub portfolio repo and updated handoff docs for a fresh conversation.

What landed:

- GitHub repo is public: `https://github.com/guohaozi/trend-fit-gtm-agent`.
- Local remote is configured: `origin https://github.com/guohaozi/trend-fit-gtm-agent.git`.
- README was polished in commit `4f04b76` so the GitHub homepage reflects the current product state: four baseline demos, three evidence-backed cases, five skills, evidence gates, source-tier discipline, and current project structure.
- Source-tier guard / evidence re-audit work was committed and pushed in `92b3f21`.
- `docs/current-state.md` now records the portfolio positioning, GitHub state, and strategic priority track for the next conversation.

Key design / narrative decision:

- Do not present the repo as "many commits" or fake calibration. Present it as an AI-assisted engineering project where the AI's evidence judgment was audited, a source-tier bug was found, and the bug class was converted into deterministic tests.

Next recommended move:

- Build the `evidence-collector` skill/script before adding more case studies. The source-tier guard is now in place; the bottleneck is still manual evidence collection.

## 2026-06-09 — Enforce Source-Tier Guard + Re-audit Evidence Cases

Status:

- Implemented the previously recommended CI/test-style guard for source-tier discipline and re-audited the existing evidence cases against the deterministic classifier.

What landed:

- Added `tests/source-tier-classifier.test.ts`, which scans every `data/*_evidence.json` and fails when:
  - forced-proxy URL patterns (vendor help/docs, known vendor marketing pages, listicle/affiliate-style slugs) are tagged non-proxy;
  - proxy evidence is assigned `confidence: high`;
  - a single Reddit thread is treated as `primary` outside the allowed raw user-language dimensions (`audienceOverlap` / `useCaseRelevance`) or with high confidence.
- Re-audited fashion, AI-tool, and snack evidence data:
  - Fashion proxy/listicle confidence labels dropped `high → medium`.
  - AI-tool Reddit automation thread for `messageBridge` changed `primary → proxy`; vendor proxy confidence labels dropped to `medium`.
  - Snack Reddit commercial-intent thread changed `primary → proxy`.
- Updated evidence-case Markdown and README to reflect the stricter tiering.

Key result:

- The source-tier classifier is no longer only a prose constraint; it now has an executable regression test.
- Snack evidence read changed after the stricter audit: raw `76` / `Go`, evidence gate `pass`, stability `moderate`, decision type `creator seeding`. The prior `74` / `small test` over-weighted a single Reddit thread as commercial-intent evidence.
- AI-tool Strong Go still holds: raw `86`, gate `pass`, `creativeFeasibility` remains capped/fragile because its support is vendor copy.
- Fashion remains raw `88`, gated `Go` because audience/use-case evidence is still proxy/listicle-based.

Verification:

- `npx tsx --test tests/source-tier-classifier.test.ts tests/evidence-adjustment.test.ts tests/recommendation-rigor.test.ts` passed: 16 tests, 3 suites.
- `npm test` passed: 29 tests, 5 suites.
- `npm run build` passed.

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
