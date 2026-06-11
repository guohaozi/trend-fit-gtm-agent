# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-11

This file is a handoff snapshot for starting a fresh Codex / Claude conversation.

## Project Snapshot

- Project path: `/Users/guo/gtm/trend-fit-gtm-agent`
- Git branch: `main`
- Public GitHub repo: `https://github.com/guohaozi/trend-fit-gtm-agent`
- Remote: `origin https://github.com/guohaozi/trend-fit-gtm-agent.git`
- Current state: v1.2 rigor layer is implemented in docs, skills, TypeScript, tests, UI, seven new 15-case-list evidence-backed cases, one competitor-layer AI-tool evidence variant, P0-P4 evidence automation provider layers, P5a/b offline evidence-case orchestration, P5c CLI/file writer, live OpenCLI-backed and SerpApi Google Trends research providers, a fixture/dry-run provider panel in `/workspace`, classifier-owned workspace evidence editing, server-side workspace Google Trends execution, workspace fixture replay, and a GitHub Actions CI workflow.
- Verification status: `npm test` currently runs 104 passing Node tests; `npm run build` completes a successful Next.js production build. `.github/workflows/ci.yml` now runs `npm ci`, `npm test`, and `npm run build` on pushes to `main` and pull requests.
- Automation status: P0 product-marketing context, P1 evidence case generator, P2 customer-research provider, P3 SEO/timing provider, P4 competitor provider, P5a/b offline orchestration, P5c CLI/file writer, product+market+trend research runner, and the first deterministic trend-shortlist ranking layer are done. Live trend discovery has not been implemented yet.
- Latest UI layer: `/workspace` is now an editable workflow page backed by `lib/workspace-evaluator.ts`. It lets users edit product fields, risk/profile, three candidate trends, seven anchored score dimensions, and evidence input rows, then switch between single-trend scoring and shortlist ranking. Evidence rows can edit source URL, dimension, direction, magnitude, desired confidence, verification status, source signal, and notes; `sourceTier` and computed confidence are read-only outputs from `source-tier-classifier`. The workspace also surfaces evidence gaps, previews provider dry-run commands for the active/winning trend, exposes a portable fixture smoke command, can copy Markdown or provider commands, can run SerpApi Google Trends through the server-only `/api/workspace/google-trends` route, and can replay `examples/google-trends-workspace.fixture.json` without a key. OpenCLI, GooseWorks, marketplace, and social-platform live runs are not yet browser-triggered.
- Latest shortlist layer: `lib/trend-shortlist.ts` ranks manually supplied candidate trends by gated band, evidence-adjusted total, stability, and Timing & Saturation. The first demo is LEGO comparing World Cup fan culture, F1 race weekend, and graduation season gifting in `data/lego_trend_shortlist.json` and `outputs/lego_trend_shortlist.md`; F1 ranks first.
- Latest automation layer: `lib/evidence-case-research-runner.ts`, `lib/opencli-research-source.ts`, `lib/seo-keyword-provider.ts`, and `scripts/evidence-case-research.ts` add `npm run evidence:case:research`, which starts from product + market + trend, builds research queries, can use fixture / web / OpenCLI / SerpApi Google Trends providers, converts results into evidence inputs, then writes `data/*_evidence.json` and `outputs/*_evidence_case.md`. The OpenCLI provider maps Reddit and YouTube search rows into `customerResearchFindings`, and maps Twitter/X plus Google Search rows into conservative `additionalCandidates`. The SerpApi provider calls `engine=google_trends` for related queries and timeseries, then maps the result into SEO keyword findings for Timing & Saturation and Commercial Intent. Xiaohongshu, TikTok, GooseWorks, and marketplace-specific mappers are the next provider adapters.
- Latest live research proof: DJI drones entering UAE / Saudi / Middle East for video creation, security inspection, and tourism enablement can be generated with OpenCLI via `npm run evidence:case:research`. The current generated report is `outputs/dji_drones_uae_saudi_middle_east_video_creation_security_inspection_tourism_enablement_evidence_case.md`; latest run produced 16 accepted evidence items, `76 / Cautious test`, evidence gate `partial`, stability `fragile`.
- File-writing layer: `lib/evidence-case-file-writer.ts` and `scripts/evidence-case.ts` provide a real file-writing CLI. Run `npm run evidence:case -- --input examples/evidence-case-input.example.json` to merge provider findings, apply source-tier classification, generate `data/*_evidence.json`, and generate `outputs/*_evidence_case.md`.
- Latest provider layer: `lib/competitor-research-provider.ts` maps competitor-profiling / product-swipefile style extracts into `EvidenceCandidate[]`, then the existing collector and generator compute source-tiered evidence cases.
- Latest competitor case: `data/demo_ai_tool_competitor_evidence.json` and `outputs/demo_ai_tool_competitor_evidence_case.md`. It keeps the AI photo-tool read at `85 / Strong Go`, gate `pass`, but fragile because competitor crowding lowers Timing and Evoto backlash lowers Brand Safety while Audience and Creative remain unsupported-high.
- Latest new 15-case-list evidence cases: `data/thailand_ev.json`, `data/thailand_ev_evidence.json`, `outputs/thailand_ev_evidence_case.md`, plus `data/latam_gaming_peripherals.json`, `data/latam_gaming_peripherals_evidence.json`, and `outputs/latam_gaming_peripherals_evidence_case.md`. Both use the `ecommerce_conversion` profile; Thailand EV lands at `90 / Strong Go`, gate `pass`, stability `moderate`, decision type `organic push`; LatAm gaming peripherals lands at `93 / Strong Go`, gate `pass`, stability `moderate`, decision type `organic push`.
- First seven 15-case-list evidence cases are done: SAVAS China, OBgE China, Anker Europe, Japan service robots, POP MART Middle East, Thailand EV, and LatAm gaming peripherals. Recommended next step: compare the seven cases as a shortlist, or implement product-only trend discovery so the system can move from "product + market + trend" to "product -> 3-5 candidate trends -> ranked shortlist".
- Latest product case: convenience-store RTD protein drink x everyday protein / lifestyle weight management. Baseline `78 / Go`; evidence-adjusted `85 / Strong Go`; gate passes, but stability is fragile because it sits exactly on the Strong Go threshold and health-claim risk remains real.
- Latest round added the first `evidence-collector` implementation: reusable source-tier classification code, an evidence draft builder, tests, and a project skill that can borrow GooseWorks/manual research as candidate-source input without letting the research agent self-grade evidence upward.
- Latest classifier fix: `desktop-charger` URL paths no longer accidentally trigger the `top-` listicle pattern. This was found while building the Anker Europe case.
- Previous round implemented the source-tier classifier as an executable test guard and re-audited the fashion, AI-tool, and snack evidence cases against it.
- The project is published to GitHub. The exact latest pushed commit hash should be checked with `git log -1 --oneline` in the next conversation.
- Previous review round was a Claude **review + fix** pass on the evidence cases Codex produced: it verified the cited sources are real, found a source-tier inflation bug in the AI-tool case, fixed it, and added a deterministic source-tier classifier to prevent recurrence.
- Previous round added the AI photo-tool evidence case and the snack / Dubai-style chocolate evidence case.
- This handoff corresponds to the workspace evidence-editor, SerpApi Google Trends
  provider, and workspace Google Trends API follow-up. Check `git log -1 --oneline` and
  `git status --short --branch` for the exact pushed commit state in the next
  conversation.

## Latest Conversation Handoff

This is the compact handoff for the next Codex / Claude conversation.

### What was completed

- **Credibility cleanup:** README, product-marketing context, current-state, and
  changelog were updated to stop overstating demo readiness and to reflect the current
  evidence-case, test, build, and CI status.
- **CI:** `.github/workflows/ci.yml` now runs `npm ci`, `npm test`, and `npm run build`
  on pushes to `main` and pull requests.
- **Trend shortlist:** `lib/trend-shortlist.ts` adds deterministic 3-trend ranking.
  The LEGO demo compares World Cup fan culture, F1 race weekend, and graduation season
  gifting; F1 ranks first.
- **Workspace UI:** `/workspace` is now the first usable workflow screen. It supports
  editable product inputs, editable trend score inputs, single-trend scoring,
  3-trend shortlist ranking, evidence-gap guidance, and copy-to-clipboard Markdown
  export.
- **Provider preview panel:** `/workspace` now shows a dry-run OpenCLI command for the
  active single trend or current shortlist winner, plus a committed fixture smoke command
  using `examples/dji-middle-east-search-results.fixture.json`. The panel can copy both
  commands and explicitly states that source tier remains classifier-owned.
- **Evidence editor:** `/workspace` now exposes editable evidence rows. Users can edit
  source URL, dimension, direction, magnitude, desired confidence, verification status,
  source signal, and notes. `sourceTier`, computed confidence, and classifier reasons
  are read-only outputs, so the UI cannot manually upgrade evidence strength.
- **OpenCLI portability:** `lib/opencli-research-source.ts` no longer defaults to
  `/Users/guo/.npm-global/bin/opencli` or injects that path into `PATH`. Runtime
  resolution is now `--opencli-bin`, then `OPENCLI_BIN`, then `opencli` from `PATH`.
- **Workspace evaluator:** `lib/workspace-evaluator.ts` bridges frontend state into the
  existing scoring, recommendation-rigor, and shortlist modules.
- **SerpApi Google Trends provider:** `lib/seo-keyword-provider.ts` now includes
  `SerpApiGoogleTrendsSource`, which calls SerpApi `engine=google_trends` for related
  queries and timeseries, computes a conservative recent-vs-previous trend direction,
  redacts API keys from evidence source URLs, and feeds the existing SEO finding mapper.
- **CLI wiring:** `scripts/evidence-case-research.ts` now supports `--provider
  google-trends` / `--provider serpapi`, `--serpapi-key`, `--serpapi-geo`, and
  `--serpapi-date`. It also defaults to `SERPAPI_API_KEY` for local runs.
- **Workspace Google Trends API:** `/api/workspace/google-trends` runs the SerpApi
  provider on the server, never accepts an API key from browser input, redacts provider
  keys from source URLs, and returns classifier-ready workspace evidence rows.
- **Workspace provider action:** the `/workspace` provider panel now has a "运行 Google
  Trends" action. It calls the server API and appends returned rows into the active or
  winning trend's evidence editor; source tier remains read-only and recomputed.
- **Workspace fixture replay:** the same route supports `fixture: true` and replays
  `examples/google-trends-workspace.fixture.json`, so the provider-to-evidence flow can
  be demonstrated without `SERPAPI_API_KEY`.
- **Tests:** Added focused tests for shortlist ranking, workspace evaluation/export,
  provider-preview generation, portable OpenCLI dry-run output, and classifier-owned
  workspace evidence materialization, plus SerpApi Google Trends collection and CLI
  wiring, workspace API coverage, and provider-row append behavior.

### Key design decisions

- Build the frontend workflow before adding more live providers, because an editable UI
  exposes exactly which evidence slots and provider gaps matter.
- Keep provider execution server-owned. `/workspace` may trigger Google Trends through
  `/api/workspace/google-trends`, but API keys stay in server env (`SERPAPI_API_KEY`) and
  are not accepted from browser state. OpenCLI / GooseWorks should get the same server
  boundary before browser-triggered execution.
- Treat provider preview as a contract/demo layer first: dry-run commands and fixture
  smoke runs prove the pipeline shape before the browser is allowed to execute live
  local CLIs.
- Treat live providers as candidate-source collectors, not scoring authorities. Scores
  still pass through source-tier classification, evidence gates, profile weighting, and
  stability checks.
- `sourceTier` is not editable in the workspace. Users edit source URL, source signal,
  direction, note, verification status, desired confidence, and dimension; tier is
  recomputed by the classifier.
- Use client state instead of database/auth/background jobs in the first workflow pass,
  so the workflow is usable without creating infrastructure surface area.
- Keep demo/review pages (`/product-profile`, `/trend-input`) separate from the real
  workflow entry point (`/workspace`).

### Known issues / limitations

- `/workspace` can edit evidence rows, but edits are currently client-state only. There
  is no database, import/export for edited workspace state, or server persistence yet.
- The UI can execute SerpApi Google Trends through the server API when
  `SERPAPI_API_KEY` is configured, or replay a committed Google Trends fixture without a
  key. Browser-triggered OpenCLI, GooseWorks, marketplace, and social-platform
  collection are still not wired.
- LEGO shortlist evidence is curated fixture evidence, not a full live market-research
  run.
- Google Search is still not Google Trends. Hard Timing / SEO evidence should now use
  the SerpApi Google Trends CLI provider rather than broad Google Search rows.
- Xiaohongshu, TikTok, marketplace/review providers, real provider health checks, and
  browser-run collection are not wired into the UI.
- Browser screenshot verification was attempted earlier but blocked because the
  available Playwright package had no browser binary installed. HTTP verification now
  confirms `/workspace` returns the provider panel and Google Trends action; the API
  returns a server-only setup error when `SERPAPI_API_KEY` is missing.
- `gh auth status` showed the GitHub CLI token as invalid during this handoff; plain
  `git push` may still work through local Git credentials.

### Recommended next steps

1. Add provider health checks for the workspace provider panel.
2. Add save/import/export for workspace state so edited evidence rows can survive refresh
   without introducing auth or a database.
3. Add multi-query Google Trends planning so the workspace compares several keyword
   variants instead of one product + market + trend query.
4. Add Xiaohongshu / TikTok social-language mappers and marketplace/review providers.
5. Add route-level smoke coverage or browser screenshots for `/workspace` so future UI
   regressions are easier to catch.

## Portfolio / Interview Positioning

The repo is now safe to use as a public portfolio artifact. The strongest story is not
"many commits" for its own sake; it is the visible engineering arc:

1. MVP scoring scaffold.
2. Evidence-adjusted scoring workflow.
3. v1.2 rigor layer with evidence gates, profile weights, caps, and stability.
4. Evidence-backed cases.
5. AI-produced evidence reviewed, a source-tier inflation bug found, then fixed.
6. The bug class turned into an executable test guard and the existing evidence cases re-audited.

When describing it in an interview, frame it as:

> I used AI to build faster, but I also audited the AI's judgment. When I found it had
> over-graded vendor evidence, I converted the review lesson into a deterministic
> source-tier classifier and regression tests so the same class of error cannot silently
> pass again.

The README and product-marketing context have been refreshed to match the current
evidence-case count, test count, UI boundary, and CI status. The next portfolio-facing
improvement should be screenshots / a short demo GIF and a compact case-study section.

## Strategic Priority Track

This was the recommended order from the project-history review:

1. **P0: Product-marketing context.** Done in `.agents/product-marketing.md` and committed as `4fdc08f`.
2. **P1: Evidence case generator.** Done in `lib/evidence-case-generator.ts`; it can generate frozen `EvidenceAdjustmentCase` objects from baseline scores plus accepted evidence, or directly from `EvidenceDraft`.
3. **P2: Customer-research provider.** Done in `lib/customer-research-provider.ts` and `lib/opencli-customer-research.ts`; customer research and OpenCLI-style records normalize to `EvidenceCandidate[]`.
4. **P3: Timing / search / SEO provider.** Done in `lib/seo-keyword-provider.ts`; SEO and Google Trends-style findings normalize to Timing / Commercial Intent / Message evidence candidates.
5. **P4: Competitor provider.** Done in `lib/competitor-research-provider.ts`; competitor-profiling and product-swipefile extracts normalize to `EvidenceCandidate[]`.
6. **P5a/b: Evidence case orchestration.** Done in `lib/evidence-case-orchestrator.ts` with `tests/evidence-case-orchestrator.test.ts`. It merges P2/P3/P4 provider outputs plus optional verified manual/browser `additionalCandidates` into one candidate list, calls `buildEvidenceDraft()`, then calls `generateEvidenceAdjustmentCaseFromDraft()`.
7. **P5c: Evidence case CLI/file writer.** Done in `lib/evidence-case-file-writer.ts`, `scripts/evidence-case.ts`, and `tests/evidence-case-file-writer.test.ts`. It reads provider JSON input, writes `data/*_evidence.json`, and writes `outputs/*_evidence_case.md`.

Earlier foundational work:

1. **Make source-tiering enforceable in code.** Done in `tests/source-tier-classifier.test.ts`.
2. **Re-audit fashion and snack evidence cases against the classifier.** Done; AI-tool was also tightened.
3. **Build an `evidence-collector` skill/script.** Done at the first reusable layer:
   `skills/evidence-collector/SKILL.md`, `lib/source-tier-classifier.ts`,
   `lib/evidence-collector.ts`, and `tests/evidence-collector.test.ts`.
4. **Use the collector on a new evidence case.** Next practical step: take one fresh
   product/trend pair, gather candidate sources with GooseWorks or browser research,
   build an evidence draft, then promote accepted evidence into `data/*_evidence.json`.
   Done for `demo_protein_drink`.
5. **Add a trend-shortlist demo.** Done for LEGO: one product + three candidate trends
   -> evidence-adjusted gated ranking. Current boundary: candidates and baseline scores
   are still supplied manually; live discovery is not implemented.

## P5 Evidence Automation Handoff

The user asked whether the project is ready to "搞自动化 evidence case" and whether the
right design is to merge P2/P3/P4 before handing the result to P1. The answer is yes:
the provider layers were ready enough for that step, and the offline orchestrator is now
written.

## Live Evidence Research CLI Handoff

What is now runnable:

```bash
cd /Users/guo/gtm/trend-fit-gtm-agent

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

Expected outputs:

- `data/dji_drones_uae_saudi_middle_east_video_creation_security_inspection_tourism_enablement_evidence.json`
- `outputs/dji_drones_uae_saudi_middle_east_video_creation_security_inspection_tourism_enablement_evidence_case.md`

Latest DJI run:

- Candidate / accepted evidence count: `16 / 16`.
- Evidence-adjusted read: `76 / Cautious test`.
- Evidence gate: `partial`.
- Stability: `fragile`.
- Main reason gate remains partial: that run used OpenCLI / Google Search only. Re-run
  the same product + market + trend with `--provider google-trends` to add hard
  Timing & Saturation evidence before relying on the read.

SerpApi Google Trends run shape:

```bash
SERPAPI_API_KEY=your_key npm run evidence:case:research -- \
  --product "protein drink" \
  --market "US convenience retail" \
  --trend "grab-and-go protein" \
  --risk medium \
  --provider google-trends \
  --serpapi-geo US \
  --serpapi-date "today 12-m"
```

OpenCLI operational notes:

- OpenCLI binary: `/Users/guo/.npm-global/bin/opencli`.
- If OpenCLI reports `BROWSER_CONNECT`, run:

```bash
PATH=/Users/guo/.npm-global/bin:$PATH opencli daemon restart
PATH=/Users/guo/.npm-global/bin:$PATH opencli doctor
```

- In the last session, `opencli doctor` became healthy only when run outside the sandbox:
  daemon running, Browser Bridge extension connected.
- Reddit can sometimes return HTML / adapter parse errors. The CLI now uses
  `continueOnCommandError: true` for OpenCLI provider runs so one platform failure does
  not kill the entire case.

Evidence hygiene added this round:

- OpenCLI rows are filtered before becoming findings/candidates.
- Reddit / YouTube / Twitter rows must hit product/category terms and also market or
  trend terms.
- Google Search rows can still pass on broader product or market+trend relevance because
  they are treated conservatively as proxy / secondary candidates by the classifier.
- Long social rows only use leading text for relevance checks, so a long unrelated post
  cannot pass just because it mentions "drones" deep in the body.

Known limitations:

- Google Search is not Google Trends. It should not be treated as hard Timing evidence;
  use `--provider google-trends` / SerpApi for that slot.
- Current Google rows still include some broad web/search results and listicles. The
  source-tier classifier caps them, but they should now be supplemented or replaced with
  SerpApi Google Trends output.
- Twitter/X and YouTube rows are useful for raw language and weak use-case evidence, but
  they should not decide final scores without the classifier and gate layer.
- Xiaohongshu and TikTok adapters exist in OpenCLI but are not mapped yet.
- Trend discovery / shortlist is still not implemented. The current CLI assumes the user
  already supplies product + market + trend.

Recommended next implementation:

1. Add provider health checks for the workspace provider panel.
2. Add multi-query Google Trends planning instead of one product + market + trend query.
3. Add Xiaohongshu / TikTok row mappers as raw social candidate providers.
4. Add a shortlist runner: product + market -> 3-5 candidate trends -> run
   `evidence:case:research` for each -> rank by gated evidence score and missing slots.

What landed:

- Added `lib/evidence-case-orchestrator.ts`.
- Added `tests/evidence-case-orchestrator.test.ts`.
- Exported an `orchestrateEvidenceCase()` function that accepts:
  - baseline metadata: `id`, `caseId`, `researchDate`, `baselineScores`,
    `riskTolerance`, optional `profileUsed`, optional `tooling`;
  - optional `customerResearchFindings`;
  - optional `seoKeywordFindings`;
  - optional `competitorResearchFindings`.
- It converts each provider finding list through the existing mapper:
  - `customerResearchFindingsToCandidates()`;
  - `seoKeywordFindingsToCandidates()`;
  - `competitorResearchFindingsToCandidates()`.
- It concatenates candidates in deterministic order: customer -> SEO/timing -> competitor.
- It also accepts optional `additionalCandidates` for verified manual/browser research,
  appended after provider-derived candidates.
- It calls `buildEvidenceDraft()` once on the merged candidates.
- It calls `generateEvidenceAdjustmentCaseFromDraft()` on the draft.
- It returns `{ candidates, draft, evidenceCase }`.

Test coverage:

- Uses fixture-only provider findings, not network calls.
- Asserts the merged candidate IDs preserve provider order.
- Asserts the generated draft applies source tiers conservatively.
- Asserts the generated `EvidenceAdjustmentCase` has the expected adjusted scores, gate,
  and missing-gate list.

Design boundary:

- P5 remains offline and deterministic. It does not browse, call OpenCLI, or
  write files yet.
- Network/platform calls belong in provider adapters. The orchestrator should only join
  normalized findings and hand them through the collector/generator pipeline.
- P5c file writing is now done in `lib/evidence-case-file-writer.ts` and
  `scripts/evidence-case.ts`; future work should focus on live provider execution and
  trend-shortlist orchestration, not another offline writer.

## P4 Competitor Provider Handoff

What landed:

- `lib/competitor-research-provider.ts`
- `tests/competitor-research-provider.test.ts`
- `data/demo_ai_tool_competitor_evidence.json`
- `outputs/demo_ai_tool_competitor_evidence_case.md`

Design boundary:

- `competitor-profiling` and `product-swipefile` are research/front-end skills, not
  scoring authorities.
- They should emit structured competitor findings such as `same_audience`,
  `competitor_used_trend`, `competitor_content_angle`, `competitor_backlash`,
  `where_to_buy_comments`, and `saturated_competitor_activity`.
- Those findings normalize to `EvidenceCandidate[]`, then pass through
  `buildEvidenceDraft()` and `generateEvidenceAdjustmentCaseFromDraft()`.
- Competitor-owned positioning copy remains proxy when used for audience claims; directly
  observed competitor campaigns can be primary for what competitors are actually doing.

Verification:

- `node --import tsx --test tests/*.test.ts` -> 53 tests pass.
- `npm run build` -> production build succeeds.

## Tooling / Skill Discovery Handoff

This round investigated how to replace or supplement GooseWorks for candidate-source
collection.

### GooseWorks status

- User verified GooseWorks in their own terminal:
  - `npx gooseworks login` -> already logged in as `gh1225835497@gmail.com`.
  - `npx gooseworks credits` -> `200` credits available.
- In the Codex shell, `gooseworks` is not directly on `PATH`, and `npx gooseworks ...`
  failed from the sandbox with npm registry DNS/network errors. Treat this as a shell /
  environment visibility issue, not proof that GooseWorks is unavailable to the user.
- For future sessions, prefer trying user-terminal-compatible commands first:
  - `npx gooseworks search "reddit scraping"`
  - `npx gooseworks fetch <slug>`
  - `npx gooseworks call ...`
- GooseWorks should remain a **candidate-source provider**, not a scoring authority.
  Its raw findings must still become `EvidenceCandidate[]`, then pass through
  `buildEvidenceDraft()` and the source-tier classifier.

### OpenCLI status

- OpenCLI is installed globally at `/Users/guo/.npm-global/bin/opencli`.
- It is not always visible in the Codex shell's default `PATH`.
- Use this prefix when needed:

```bash
PATH=/Users/guo/.npm-global/bin:$PATH opencli --help
```

- Product-swipefile's helper recognizes OpenCLI when that PATH is set:

```bash
PATH=/Users/guo/.npm-global/bin:$PATH \
  python3 /Users/guo/gtm/.claude/skills/product-swipefile/scripts/research_helper.py opencli-check
```

- Verified OpenCLI site adapters include Reddit, Twitter/X, TikTok, Douyin, Xiaohongshu,
  Bilibili, YouTube, Zhihu, Weibo, Product Hunt, Hacker News, and many web/search sites.
  This makes it the best local substitute for GooseWorks social/platform discovery.

### Why remote `find-skills` did not work here

- The `find-skills` skill itself worked as a discovery workflow and led to local skill
  inspection.
- The remote registry step did not complete:
  - `npx skills find "reddit google trends web research"` first failed with
    `getaddrinfo ENOTFOUND registry.npmjs.org`.
  - Re-running with elevated permissions was rejected because `npx skills find` downloads
    and executes a public npm package, which the sandbox reviewer treated as supply-chain
    risk.
- If the user wants remote skill discovery, safest workflow is:
  1. User runs `npx skills find "<query>"` in their own terminal.
  2. User pastes results into the new conversation.
  3. Codex evaluates which skills are useful and how they map to `EvidenceCandidate`.

### Local skills that can replace pieces of GooseWorks

No local skill fully replaces GooseWorks' broad data/API catalog, but these cover the
important pieces for Trend-Fit evidence collection:

| Need | Local skill/tool | Notes |
|------|------------------|-------|
| Product and competitor research | `product-swipefile` | Strongest replacement for deep product/competitor inventory. Uses OpenCLI when available. |
| Raw platform/user language | `opencli` | Best local platform-search layer for Reddit/X/TikTok/Douyin/Xiaohongshu/Bilibili/YouTube/etc. |
| Reddit pain and buyer language | `reddit-icp-monitor` | Useful for Audience/Use-case raw language and commercial-intent comments. |
| Trends / SEO / timing signals | `seo-keyword-research` / `--provider google-trends` | Local CLI uses `SERPAPI_API_KEY`; useful for Google Trends related queries and timing checks. |
| Market pain / ICP mapping | `map-your-market` | Useful if scripts are available; otherwise use its rubric manually. |
| Channel/community discovery | `where-your-customer-lives` | Useful for reachability and community evidence. |
| Competitor media / PR evidence | `competitor-pr-finder` | Requires `TAVILY_API_KEY`; useful for secondary evidence and competitor activity. |
| X/Twitter GTM scrape | `twitter-GTM-find` | More startup-job oriented; requires Apify/Gemini or native X plugin setup. |

Recommended provider stack for the next implementation:

```text
GooseWorks, if available and logged in
  -> OpenCLI, for platform search and raw social/community evidence
  -> product-swipefile / reddit-icp-monitor / seo-keyword-research as specialized providers
  -> browser/manual fallback
  -> EvidenceCandidate[]
  -> buildEvidenceDraft()
  -> source-tier-classifier
```

## This Round (RTD protein drink evidence case)

What landed:

- Added `data/demo_protein_drink.json` and
  `data/demo_protein_drink_evidence.json`.
- Added `outputs/demo_protein_drink_report.md` and
  `outputs/demo_protein_drink_evidence_case.md`.
- Wired `demo_protein_drink` into the app loader, report mapping, evidence comparison, and
  Chinese category labels.
- Extended tests so the case is covered by frozen scoring, evidence adjustment,
  recommendation rigor, and source-tier guard behavior.

Case result:

- Baseline: `78 / Go`.
- Evidence adjusted: `85 / Strong Go`.
- Evidence gate: `pass`.
- Stability: `fragile`.
- Decision type: `organic push`.

Important interpretation:

- This is not a "go spend heavily" conclusion. The case is just over the Strong Go line,
  and Brand Safety remains `50` because lifestyle weight management and protein claims can
  easily drift into overclaiming.
- Recommended GTM angle: "daily protein convenience", not meal replacement or fat-loss
  magic.

Collector issue found and fixed:

- Glanbia's China sports-nutrition article is useful category research, but it is published
  by a nutrition-ingredient supplier. The classifier now has a
  `supplier_category_report` source signal: verified supplier-owned category research can
  be `secondary`, but max confidence is capped at `medium`.

## This Round (Codex evidence-collector first step)

What landed:

- Added `lib/source-tier-classifier.ts`, a reusable implementation of the verify-first
  source-tier rules that had previously lived partly in prose and partly inside
  `tests/source-tier-classifier.test.ts`.
- Added `lib/evidence-collector.ts`, which turns `EvidenceCandidate` records into a typed
  evidence draft by:
  - dropping contradicted claims;
  - capping unverified sources to `proxy` / `low` with an `UNVERIFIED:` note;
  - forcing vendor docs, vendor copy, listicles, press releases, and anecdotes to proxy;
  - allowing one Reddit/social thread as `primary` only for raw Audience or Use-case
    language at max `medium` confidence;
  - clamping requested confidence to the classifier's tier ceiling.
- Added `tests/evidence-collector.test.ts` and expanded
  `tests/source-tier-classifier.test.ts` to cover the reusable classifier API.
- Added `skills/evidence-collector/SKILL.md`, which explicitly allows candidate-source
  discovery via `.claude/skills/gooseworks` or manual browser research while keeping
  project-local tiering conservative and deterministic.
- Updated `skills/competitor-evidence/SKILL.md` so competitor research now feeds
  evidence-collector instead of hand-grading `sourceTier` in prose.

Design boundary:

- This is not yet a network crawler or automatic verifier. It is the reusable conversion
  layer from candidate sources to score-ready evidence. A source can only become
  `primary` or `secondary` when the collector is given `verificationStatus: "verified"`.
  Sandboxed/offline runs must mark sources as `unverified`, which downgrades them to
  `proxy` / `low`.

Verification:

- Targeted verification should include:
  `npx tsx --test tests/source-tier-classifier.test.ts tests/evidence-collector.test.ts`.
- Full verification should include `npm test` and `npm run build`.

## This Round (Codex source-tier guard + evidence-case re-audit)

What landed:

- Added `tests/source-tier-classifier.test.ts`, an executable guard that scans every `data/*_evidence.json` and fails if:
  - vendor help/docs, known vendor marketing pages, or listicle/affiliate-style URL patterns are tagged non-proxy;
  - proxy evidence uses `confidence: high`;
  - a single Reddit thread is treated as `primary` outside Audience / Use-case raw user-language evidence.
- Re-audited evidence cases against `source_tier_classifier.md`:
  - Fashion: proxy/listicle evidence confidence labels dropped to `medium`.
  - AI-tool: the Reddit automation thread for `messageBridge` changed `primary → proxy`; vendor proxy confidence labels are now `medium`.
  - Snack: the Reddit commercial-intent thread changed `primary → proxy`.
- Snack expected result changed because one Reddit thread is not strong enough to revise Commercial Intent down an anchor: evidence-adjusted read is now `76 / Go`, gate `pass`, stability `moderate`, decision type `creator seeding`.

Verification:

- Targeted verification passed: `npx tsx --test tests/source-tier-classifier.test.ts tests/evidence-adjustment.test.ts tests/recommendation-rigor.test.ts` → 16 tests, 3 suites.
- Full verification passed: `npm test` → 29 tests, 5 suites; `npm run build` → production build succeeds.
- GitHub push verified: `main` on `origin` contains `92b3f21`.

## Previous Round (Claude review + fix of Codex evidence cases)

What was checked and found:

- **Sources are real (anti-fabrication rule held).** Spot-verified The Drum, Shake Shack, and PetaPixel citations via web search — including the exact "44% of US adults" survey figure. Codex did not fabricate URLs or numbers.
- **Anchor-step math and all 26 tests are correct.**
- **Bug found — source-tier inflation.** Codex tagged three vendor-owned pages (`shopify.com/magic`, `help.shopify.com/...`, `help.picsart.io/...`) as `primary`, but the project's own §3a rubric classifies vendor copy/docs as `proxy`. Consequence: AI-tool `creativeFeasibility = 100` was held up solely by a vendor marketing page, so it should have been flagged in `dimensionCaps` — but `dimensionCaps` was empty. The unit test could not catch this because `sourceTier` is human-judgment input, not computed: a mis-graded tier passes green.

What was fixed:

- Re-tiered the three vendor sources `primary → proxy` in `data/demo_ai_tool_evidence.json`.
- `expectedDimensionCaps` now correctly contains `["creativeFeasibility"]`; two confidence labels dropped `high → medium` (proxy caps confidence at medium).
- `outputs/demo_ai_tool_evidence_case.md` now discloses the `creativeFeasibility` cap and labels the vendor sources as proxy.
- The AI-tool Strong Go is still **genuinely earned**: the gate-required evidence (Timing = Accio, Brand Safety = TechRadar/Digital Camera World, Audience = PetaPixel/Reddit) was never vendor copy. The fix only removed inflated support, not real support.
- All 26 tests still pass (the engine now computes `dimensionCaps: ["creativeFeasibility"]`, matching the updated expected field — proof the fix is real, not cosmetic).

Root-cause / process improvement:

- Diagnosed the method weakness: the same agent that *gathers* evidence also *grades its strength*, and drifts optimistic. `sourceTier` is the only field with no downstream math check, so a biased grade silently poisons the chain.
- Added `skills/trend-product-fit/source_tier_classifier.md` — a deterministic, checklist-driven classifier that removes the discretion:
  - **Verify-first gate:** fetch the URL and confirm the claim before tiering above proxy; can't fetch → cap at proxy + mark UNVERIFIED; claim not present → drop the item (fabrication guard).
  - **Forced-proxy list:** vendor copy, vendor docs, listicles/affiliate/SEO, press releases, single social threads → always `proxy`, no manual upgrade.
  - **Tie-breaker → lower tier.**
- Wired it in as a hard pre-step from `evidence_model.md §3a` and `competitor-evidence/SKILL.md` (tier must not be assigned by feel).

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
- `lib/source-tier-classifier.ts` — reusable verify-first source-tier classifier
- `lib/evidence-collector.ts` — candidate-source -> typed evidence draft builder
- `lib/demo-cases.ts` — demo JSON loader plus profile-aware scoring and evidence results
- `tests/scoring.test.ts` — frozen scoring contract tests
- `tests/evidence-adjustment.test.ts` — evidence adjustment tests
- `tests/recommendation-rigor.test.ts` — v1.2 rigor-layer tests
- `tests/source-tier-classifier.test.ts` — executable source-tier guard for evidence JSON
- `tests/evidence-collector.test.ts` — evidence draft builder tests
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

- `npm test` passes: 29 tests, 5 suites.
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
- Evidence-backed snack under `default`: raw `76`, Go, gate `pass`, stability `moderate`, decision type `creator seeding`

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
- `creativeFeasibility = 100` is now flagged in `dimensionCaps` (CORRECTED this round): its only evidence was a vendor marketing page (proxy), which cannot lift a no-evidence cap. Score stays 100 (caps are advisory for already-scored baselines) but it is honestly flagged as unsupported-high.
- Stability remains `fragile` (now via both margin ≤ 3 and a non-empty `dimensionCaps`), so the recommended action is `organic push`, not paid push

Key result — snack / Dubai-style chocolate:

- Original deterministic demo: raw `81`, Go, assumption-heavy
- Evidence-backed read: raw `76`, Go, evidence gate `pass`
- Timing & Saturation revised from `50` to `25` because the trend is late-stage and crowded
- Commercial Intent remains `75`: one Reddit thread questions hype-driven pricing, but the source-tier classifier treats that as proxy-tier directional caution, not measured purchase behavior strong enough to revise the anchor down.
- Brand Safety revised from `75` to `50` because generic Dubai-chocolate copying can dilute brand identity and create origin/authenticity risk
- Stability is now `moderate`, so the recommended action is `creator seeding`

Evidence source quality:

- Refinery29 = `primary`, strongest evidence for named expert critique
- Essence = `secondary`, cultural/racial critique context
- Accio / Influencers Time = `secondary`, directional timing/saturation evidence
- The VOU / Chic Style Collective = `proxy`, affordable-dupe/listicle/commercial-direction evidence only
- Shopify / Picsart pages = `proxy` (CORRECTED this round). These are vendor marketing/help pages — directional support only, not measured demand. They were wrongly tagged `primary` and are now `proxy` per `source_tier_classifier.md`.
- Reddit threads = `primary` only for raw user-language evidence on Audience / Use-case, and medium-confidence max. Single Reddit threads used for Message Bridge or Commercial Intent are `proxy`.
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
  - `source_tier_classifier.md` (deterministic, checklist-driven source-tier assignment with a verify-first gate and a forced-proxy list; mandatory before any `sourceTier` is written; backed by `tests/source-tier-classifier.test.ts`)

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

Remote / publish state:

- `origin` is configured as `https://github.com/guohaozi/trend-fit-gtm-agent.git`.
- GitHub repo visibility is public.
- `main` and `origin/main` were aligned after pushing `92b3f21`.

If this state is ever found uncommitted, use:

```bash
git status
npm test
npm run build
git add <current-round-files>
git commit -m "<accurate current-round summary>"
git push
```

## Known Issues / Caveats

- No real historical calibration set exists yet.
- Do not invent a 20-50 case calibration set without real campaign outcomes.
- The current weights are expert priors, not empirically calibrated posteriors.
- Tool status update:
  - User terminal verified GooseWorks login: `npx gooseworks login` reports already logged in as `gh1225835497@gmail.com`; `npx gooseworks credits` reports 200 credits.
  - OpenCLI is installed at `/Users/guo/.npm-global/bin/opencli` and works when that bin directory is on `PATH`.
  - Current Codex shell may not include `/Users/guo/.npm-global/bin` by default, so run with `PATH=/Users/guo/.npm-global/bin:$PATH` or add that export to `~/.zshrc`.
- Earlier evidence cases did not use GooseWorks/OpenCLI/SerpApi as an integrated collection pipeline; the evidence-collector workflow can now borrow GooseWorks, OpenCLI, SerpApi Google Trends, manual, or browser research as candidate-source input, but still requires project-local verification and source-tier classification before scoring.
- Raw Google Trends / SEO timeseries is now available through the CLI via SerpApi, but older evidence cases have not all been regenerated with that provider.
- Commercial Intent in the fashion evidence case is still proxy-based, not measured purchase behavior or live "where to buy" comments.
- Creative Feasibility in the fashion evidence case remains an assumption.
- Reddit evidence in AI and snack cases is useful raw user language, but each thread is narrow and should not be treated as market-wide measurement.
- `source_tier_classifier.md` now has an executable guard in `tests/source-tier-classifier.test.ts`; it is no longer only a soft prose constraint.
- Fashion, AI-tool, and snack evidence cases have been re-audited against the classifier. Remaining limitation: this is a deterministic pattern guard, not a live URL content verifier.
- The evidence-backed cases are not model-training labels. They are analyst-reviewed examples used to pressure-test and improve the scoring logic, evidence gate, and case-study story.
- Timing & Saturation should prefer the SerpApi Google Trends CLI provider over secondary trend-analysis pages when a live key is available.
- The app does not yet auto-discover trends; trends are still manual/demo inputs. The
  new shortlist module ranks supplied candidates but does not discover candidates.
- The app does not yet run automatic multi-source evidence collection; the new collector is a library/skill workflow, not a UI crawler.
- `/workspace` is editable. The older `/product-profile` and `/trend-input` pages remain demo review screens.
- If running `npm test` inside Codex sandbox fails with `tsx` pipe `EPERM`, rerun with elevated permissions.
- Do not run `npm run build` concurrently with `npm run dev`; stale `.next` chunks previously caused a runtime error.

## Recommended Next Steps

1. Start the next conversation from this file, `docs/changelog.md`, and the latest commit shown by `git log -1 --oneline`.
2. Add a lightweight provider flow for evidence collection:
   - detect GooseWorks via `npx gooseworks credits`;
   - detect OpenCLI via `PATH=/Users/guo/.npm-global/bin:$PATH opencli --help`;
   - detect SerpApi via `SERPAPI_API_KEY`;
   - gather candidate sources with GooseWorks/OpenCLI/SerpApi/specialized skills first;
   - normalize them into `EvidenceCandidate[]`;
   - pass candidates into `buildEvidenceDraft()`.
3. Add route smoke tests for `/`, `/fit-score`, and `/report`, including `demo_ai_tool` and `demo_snack`.
4. Add more provider-backed evidence collection controls to `/workspace`, starting with fixture replay and health checks before live OpenCLI / GooseWorks execution.
5. Add portfolio screenshots and a short case-study page/doc showing the evidence-backed examples, the LEGO shortlist, and the editable workspace.
6. Later, integrate a real evidence toolchain:
   - GooseWorks for Reddit/X comments, competitor activity, and creator discovery
   - SerpApi Google Trends / SEO timeseries for Timing & Saturation
   - Product/competitor research skill for deeper product-market context
7. Much later, build a real historical calibration set only from labelled campaign outcomes.

## Best One-Sentence Framing

This is not just a prompt bundle: it is a deterministic GTM scoring scaffold with tests, goal-based lenses, evidence gates, source-tier discipline, and structured evidence cases showing the path toward an evidence-aware trend-fit agent.
