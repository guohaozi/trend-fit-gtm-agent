# Product Marketing Context

*Last updated: 2026-06-09*

## Product Overview

**One-liner:** Trend-Fit GTM Agent is the missing middle layer between trend tools and influencer tools: it tells GTM teams whether a specific product should follow a specific trend, from what angle, with what risk.

**What it does:** The product evaluates product-trend fit across seven weighted dimensions, returns a deterministic score and recommendation, then generates a structured GTM brief. It also supports an evidence layer where sourced findings can revise baseline assumptions through typed evidence, source-tier classification, evidence gates, recommendation stability, and next validation actions.

**Product category:** GTM decision-support agent, trend-fit scoring tool, evidence-backed campaign planning workflow.

**Product type:** Next.js web app plus agent skill architecture and deterministic TypeScript scoring engine.

**Business model:** Portfolio/demo project today. No login, payment, database, or commercial pricing is implemented.

## Target Audience

**Target companies:** Lean GTM, growth, brand, content, and founder-led teams that see viral trends but need a disciplined way to decide whether to act on them.

**Decision-makers:** Founder, Head of Growth, GTM lead, brand strategist, content lead, performance marketing lead, creator marketing lead.

**Primary use case:** Decide whether a product should ride a specific trend, and turn that decision into a credible campaign brief without fabricating metrics or over-claiming weak evidence.

**Jobs to be done:**
- Evaluate whether a trend naturally fits the product, audience, and use case.
- Convert trend research into a scored decision with clear risk, evidence coverage, and action type.
- Generate a GTM brief that includes angle, voice, words to use and avoid, creator type, copy, and outreach.
- Compare several candidate trends and choose the one worth testing next.

**Use cases:**
- Score one product-trend pair before a content or creator campaign.
- Convert manual or tool-assisted research into a sourced evidence case study.
- Audit AI-generated evidence and prevent vendor copy, listicles, or unverified links from inflating recommendations.
- Build public portfolio case studies that show evidence discipline, not just prompt output.

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Founder / builder | Fast GTM judgment and credible demos | Trend decisions are usually vibes, not evidence | A tested workflow that turns trend instincts into defensible decisions |
| Growth / GTM lead | Campaign prioritization, speed, risk control | Viral trends create pressure to move before evidence is clear | A scored Go / No-go read with next validation action |
| Brand strategist | Fit, tone, safety, audience perception | Forced trend executions can feel cringe or off-brand | A structured angle and brand-safety read before creative work begins |
| Creator / content lead | Native content ideas and creator fit | Knowing what is trending is easier than knowing how the brand should participate | Content angles, creator types, sample copy, and outreach guidance |
| Reviewer / hiring manager | Engineering judgment and AI workflow maturity | AI-assisted projects can look like unverified demos | Clear tests, deterministic scoring, source-tier guardrails, and documented evidence audits |

## Problems & Pain Points

**Core problem:** Trend tools say what is popular and influencer tools say who is popular, but GTM teams still lack a disciplined answer to whether this exact product should follow this exact trend.

**Why alternatives fall short:**
- Trend dashboards surface popularity but do not evaluate product fit, brand safety, or campaign angle.
- Influencer/KOL tools identify creators but do not decide whether the trend itself is strategically appropriate.
- Generic AI copy tools can generate campaign ideas but often blur assumptions, weak sources, and real evidence.
- Manual strategist judgment is useful but hard to compare, audit, or repeat across trend candidates.

**What it costs them:** Wasted creative time, forced campaigns, missed timing windows, brand-risk exposure, and decisions that cannot be explained after the fact.

**Emotional tension:** The team feels pressure to act quickly, but jumping on the wrong trend can feel embarrassing, opportunistic, or brand-damaging.

## Competitive Landscape

**Direct:** Generic AI GTM/campaign brief generators - fall short because they generate prose but usually do not enforce anchored scoring, source-tier discipline, evidence gates, or regression tests.

**Secondary:** Trend discovery tools and social listening dashboards - fall short because they identify what is trending but do not answer whether a specific product should participate.

**Secondary:** Influencer/KOL discovery tools - fall short because they optimize for creator selection, not product-trend fit or campaign risk.

**Indirect:** Manual strategist spreadsheets and internal judgment calls - fall short because they are hard to audit, reproduce, test, or turn into an evidence-backed case study.

## Differentiation

**Key differentiators:**
- Deterministic seven-dimension scoring on fixed anchors: audience overlap, use-case relevance, message bridge, creative feasibility, commercial intent, brand safety, timing and saturation.
- Evidence adjustment happens through typed evidence items and anchor-step movement, not free-form prose.
- Strong Go recommendations must pass an evidence gate.
- Source-tier classification prevents vendor copy, listicles, single anecdotes, and unverified sources from quietly inflating the score.
- The project includes tests for scoring, evidence adjustment, recommendation rigor, report parsing, evidence collection, and source-tier guard behavior.
- Existing evidence case studies show the assumption-to-evidence delta rather than hiding uncertainty.

**How we do it differently:** The workflow separates research discovery from evidence grading. External research skills can find candidate sources, but project-owned code classifies source strength and computes score changes.

**Why that's better:** It preserves speed while reducing the biggest AI-research failure mode: the same agent that finds evidence optimistically grades that evidence upward.

**Why customers choose us:** They need a transparent decision scaffold, not just campaign copy. A confident No-go is treated as valuable output.

## Objections

| Objection | Response |
|-----------|----------|
| This is still based on assumptions. | Baseline scoring is explicitly labelled as assumption-based; the evidence layer shows where real sources revise or confirm it. |
| The scores may look arbitrary. | Scores are constrained to documented anchors, fixed weights, tested rounding, override rules, and evidence gates. |
| Social trend data is hard to verify. | Candidate-source providers are not trusted as scoring authorities; every claim must pass verification and source-tier classification. |
| It does not auto-crawl TikTok/X/Instagram yet. | That is intentionally out of v1 scope. The current product focuses on the scoring contract and evidence workflow before broad crawling. |
| Why not use a normal campaign generator? | Campaign generators produce ideas; Trend-Fit GTM Agent decides whether the campaign should exist and what risk it carries. |

**Anti-persona:** Teams that only want quick viral copy without evidence discipline, source citations, or risk review. Also not a fit for teams expecting a full social-listening data warehouse in v1.

## Switching Dynamics

**Push:** Trend decisions are currently made through scattered screenshots, gut feel, and urgent creative pressure.

**Pull:** A repeatable system can turn a product-trend pair into a scored, sourced, explainable recommendation and GTM brief.

**Habit:** Teams are used to treating trend participation as a subjective creative decision or relying on whatever the loudest platform metric suggests.

**Anxiety:** Users may worry the score is fake precision, that evidence is incomplete, or that the tool will overrule human brand judgment. The product answers this by exposing assumptions, gates, stability, and next validation actions.

## Customer Language

**How they describe the problem:**
- "Should this specific product follow this specific trend?"
- "Is this a real opportunity or are we forcing it?"
- "What angle can we take without sounding cringe?"
- "What could go wrong if we jump on this?"
- "Do we have evidence, or are we just reacting to hype?"

**How they describe us:**
- "The missing middle layer between trend tools and influencer tools."
- "A structured decision with a defensible score and actionable brief."
- "An evidence-aware trend-fit agent."

**Words to use:** trend-fit, evidence-backed, source-tier discipline, assumption-to-evidence, GTM brief, gated recommendation, brand safety, timing and saturation, creator seeding, organic push, small test, next validation action.

**Words to avoid:** guaranteed viral, perfect score, automated truth, fully calibrated, proven ROI, fake training data, fabricated metrics, scrape everything.

**Glossary:**

| Term | Meaning |
|------|---------|
| Baseline score | Analyst or user-provided anchored score before evidence adjustment |
| Evidence item | Typed source-backed finding that can confirm or revise a scoring dimension |
| Evidence candidate | Raw candidate source found by research before project-owned classification |
| Source tier | Primary, secondary, or proxy classification used to govern evidence strength |
| Evidence gate | Rule that prevents unevidenced Strong Go recommendations |
| Gated band | Final recommendation after overrides and Strong Go evidence gate |
| Stability | Fragile, moderate, or stable label based on evidence coverage and threshold sensitivity |
| Decision type | Practical action such as small test, creator seeding, organic push, paid push, observe, or No-go |

## Brand Voice

**Tone:** Direct, evidence-aware, calm, pragmatic, slightly opinionated.

**Style:** Clear strategic language with engineering precision. Explain assumptions and uncertainty plainly. Prefer concrete tradeoffs over hype.

**Personality:** Rigorous, useful, honest, fast-moving, anti-hallucination.

## Proof Points

**Metrics:**
- Five baseline demo cases.
- Four evidence-backed demo cases.
- Seven scoring dimensions.
- Fixed score anchors: 0, 25, 50, 75, 100.
- Current local verification: 38 tests pass via `node --import tsx --test tests/*.test.ts`; production build passes via `npm run build`.

**Customers:** No external customer logos. This is currently a portfolio/demo project.

**Testimonials:**
> No customer testimonials yet.

**Value themes:**

| Theme | Proof |
|-------|-------|
| Evidence discipline | AI-tool source-tier inflation was found, fixed, and converted into deterministic source-tier tests |
| Repeatable scoring | Frozen scoring tests cover baseline demo totals, recommendation bands, and override behavior |
| Evidence case-study path | Fashion, AI tool, snack, and protein drink cases show how evidence revises baseline scores |
| Extensible research workflow | `evidence-collector` converts candidate sources into typed evidence while preserving conservative tiering |

## Goals

**Business goal:** Turn Trend-Fit GTM Agent into a credible portfolio-grade evidence workflow and eventually a usable GTM decision-support agent.

**Conversion action:** For portfolio use, get reviewers to understand the engineering arc and inspect the repo. For product use, get GTM users to run one product-trend evaluation or shortlist comparison.

**Current metrics:** No usage analytics or commercial metrics. Current proof is code, tests, demos, docs, and evidence case studies.

## Research Provider Notes

External skills in `/Users/guo/gtm/.agents/skills` should act as research providers, not scoring authorities.

- `customer-research` should find raw user language, VOC, review pain, forum comments, and audience/use-case signals.
- `competitor-profiling` and `product-swipefile` should find competitor positioning, campaign behavior, pricing, channels, and user-review language.
- `seo-keyword-research`, GooseWorks, and OpenCLI should find timing, search, social, and platform discussion signals.
- Provider output should be normalized into `EvidenceCandidate[]`.
- Only project-owned `buildEvidenceDraft()` and `source-tier-classifier` should decide accepted evidence, source tier, confidence caps, and dropped candidates.
- No external skill should directly mutate scores, assign non-proxy source tiers by feel, or write final `data/*_evidence.json` without the project-owned checks.
