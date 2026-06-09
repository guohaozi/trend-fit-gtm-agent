# Current State — Trend-Fit GTM Agent

Last updated: 2026-06-10

This file is a handoff snapshot for starting a fresh Codex / Claude conversation.

## Project Snapshot

- Project path: `/Users/guo/gtm/trend-fit-gtm-agent`
- Git branch: `main`
- Public GitHub repo: `https://github.com/guohaozi/trend-fit-gtm-agent`
- Remote: `origin https://github.com/guohaozi/trend-fit-gtm-agent.git`
- Current state: v1.2 rigor layer is implemented in docs, skills, TypeScript, tests, UI, four main evidence-backed demo cases, and one competitor-layer AI-tool evidence variant.
- Latest provider layer: `lib/competitor-research-provider.ts` maps competitor-profiling / product-swipefile style extracts into `EvidenceCandidate[]`, then the existing collector and generator compute source-tiered evidence cases.
- Latest competitor case: `data/demo_ai_tool_competitor_evidence.json` and `outputs/demo_ai_tool_competitor_evidence_case.md`. It keeps the AI photo-tool read at `85 / Strong Go`, gate `pass`, but fragile because competitor crowding lowers Timing and Evoto backlash lowers Brand Safety while Audience and Creative remain unsupported-high.
- Latest product case: convenience-store RTD protein drink x everyday protein / lifestyle weight management. Baseline `78 / Go`; evidence-adjusted `85 / Strong Go`; gate passes, but stability is fragile because it sits exactly on the Strong Go threshold and health-claim risk remains real.
- Latest round added the first `evidence-collector` implementation: reusable source-tier classification code, an evidence draft builder, tests, and a project skill that can borrow GooseWorks/manual research as candidate-source input without letting the research agent self-grade evidence upward.
- Previous round implemented the source-tier classifier as an executable test guard and re-audited the fashion, AI-tool, and snack evidence cases against it.
- The project is now published to GitHub. Latest pushed code commit before this handoff-doc update: `92b3f21 Add source-tier guard and re-audit evidence cases`.
- Previous review round was a Claude **review + fix** pass on the evidence cases Codex produced: it verified the cited sources are real, found a source-tier inflation bug in the AI-tool case, fixed it, and added a deterministic source-tier classifier to prevent recurrence.
- Previous round added the AI photo-tool evidence case and the snack / Dubai-style chocolate evidence case.
- The exact latest commit hash should be checked with `git log -1 --oneline`.

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

The README has been polished for GitHub, but the next portfolio-facing improvement should
be screenshots / a short demo GIF and a compact case-study section.

## Strategic Priority Track

This was the recommended order from the project-history review:

1. **Make source-tiering enforceable in code.** Done in `tests/source-tier-classifier.test.ts`.
2. **Re-audit fashion and snack evidence cases against the classifier.** Done; AI-tool was also tightened.
3. **Build an `evidence-collector` skill/script.** Done at the first reusable layer:
   `skills/evidence-collector/SKILL.md`, `lib/source-tier-classifier.ts`,
   `lib/evidence-collector.ts`, and `tests/evidence-collector.test.ts`.
4. **Use the collector on a new evidence case.** Next practical step: take one fresh
   product/trend pair, gather candidate sources with GooseWorks or browser research,
   build an evidence draft, then promote accepted evidence into `data/*_evidence.json`.
   Done for `demo_protein_drink`.
5. **Add a trend-shortlist demo.** After one collector-produced case: one product + three
   candidate trends -> evidence-adjusted gated ranking.

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
| Trends / SEO / timing signals | `seo-keyword-research` | Requires `SERPAPI_KEY`; useful for Google Trends related queries and timing checks. |
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
- Earlier evidence cases did not use GooseWorks/OpenCLI as an integrated collection pipeline; the new evidence-collector skill can borrow GooseWorks, OpenCLI, manual, or browser research as candidate-source input, but still requires project-local verification and source-tier classification before scoring.
- Raw Google Trends / SEO timeseries was not used.
- Commercial Intent in the fashion evidence case is still proxy-based, not measured purchase behavior or live "where to buy" comments.
- Creative Feasibility in the fashion evidence case remains an assumption.
- Reddit evidence in AI and snack cases is useful raw user language, but each thread is narrow and should not be treated as market-wide measurement.
- `source_tier_classifier.md` now has an executable guard in `tests/source-tier-classifier.test.ts`; it is no longer only a soft prose constraint.
- Fashion, AI-tool, and snack evidence cases have been re-audited against the classifier. Remaining limitation: this is a deterministic pattern guard, not a live URL content verifier.
- The evidence-backed cases are not model-training labels. They are analyst-reviewed examples used to pressure-test and improve the scoring logic, evidence gate, and case-study story.
- Timing & Saturation should eventually use raw Google Trends / SEO timeseries instead of secondary trend-analysis pages.
- The app does not yet auto-discover trends; trends are still manual/demo inputs.
- The app does not yet run automatic multi-source evidence collection; the new collector is a library/skill workflow, not a UI crawler.
- If running `npm test` inside Codex sandbox fails with `tsx` pipe `EPERM`, rerun with elevated permissions.
- Do not run `npm run build` concurrently with `npm run dev`; stale `.next` chunks previously caused a runtime error.

## Recommended Next Steps

1. Start the next conversation from this file, `docs/changelog.md`, and the latest commit shown by `git log -1 --oneline`.
2. Add a lightweight provider flow for evidence collection:
   - detect GooseWorks via `npx gooseworks credits`;
   - detect OpenCLI via `PATH=/Users/guo/.npm-global/bin:$PATH opencli --help`;
   - gather candidate sources with GooseWorks/OpenCLI/specialized skills first;
   - normalize them into `EvidenceCandidate[]`;
   - pass candidates into `buildEvidenceDraft()`.
3. Add a small trend shortlist demo: 1 product + 3 candidate trends -> GooseWorks/OpenCLI/local-skill-assisted evidence -> evidence-adjusted gated ranking.
4. Add route smoke tests for `/`, `/fit-score`, and `/report`, including `demo_ai_tool` and `demo_snack`.
5. Add portfolio screenshots and a short case-study page/doc showing the four evidence-backed examples.
6. Later, integrate a real evidence toolchain:
   - GooseWorks for Reddit/X comments, competitor activity, and creator discovery
   - Google Trends / SEO timeseries for Timing & Saturation
   - Product/competitor research skill for deeper product-market context
7. Much later, build a real historical calibration set only from labelled campaign outcomes.

## Best One-Sentence Framing

This is not just a prompt bundle: it is a deterministic GTM scoring scaffold with tests, goal-based lenses, evidence gates, source-tier discipline, and four evidence-backed cases showing the path toward an evidence-aware trend-fit agent.
