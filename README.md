# Trend-Fit GTM Agent

**The missing middle layer between trend tools and influencer tools.**

Most trend tools tell you **what** is popular.  
Most influencer tools tell you **who** is popular.  
Neither answers the question real GTM teams actually struggle with:

> *Should this specific product follow this specific trend — and if so, from what angle, with what risk, and how should the brand talk about it?*

Trend-Fit GTM Agent evaluates product-trend fit across seven weighted dimensions, produces a scored decision, and generates a complete campaign brief: angle, risk assessment, brand voice, words to use and avoid, creator type, sample copy, and outreach DM.

---

## What problem this solves

A GTM team sees a viral trend. The obvious moves are:

- **Ignore it** → miss a real opportunity
- **Jump on it** → risk a forced, cringe, or brand-damaging execution

Neither is a strategy. The real work is the judgment in between: is this trend genuinely related to our product? For which segment? What's the honest entry angle? What could go wrong?

This is what the agent produces — not a list of trending topics, not a KOL directory, but a structured decision with a defensible score and an actionable brief.

---

## Demo results

Five fully worked demo cases, each with real scoring rationale (no fabricated metrics):

| Product | Trend | Score | Decision |
|---------|-------|-------|----------|
| Mid-range men's clothing | Quiet luxury / old money outfit | **90 / 100** | Strong Go |
| Home robotics brand | AI home gadgets / smart home setup | **74 / 100** | Go — trust-building angle |
| AI photo editing tool | AI profile photo / product photo before-after | **89 / 100** | Strong Go |
| Snack / confectionery brand | Dubai-style pistachio kunafa chocolate | **81 / 100** | Go |
| Convenience-store protein drink | Everyday protein / lifestyle weight management | **78 / 100** | Go |

Demo briefs → [`outputs/`](outputs/)  
Demo input data → [`data/`](data/)

**Evidence agent in action:** 13 structured evidence cases now live in `data/` and
`outputs/`, including demo cases, a competitor-layer variant, seven market-expansion
cases, and one live OpenCLI-backed DJI research proof. The core demo evidence set shows
how real sources revise or validate the baseline score:

- Fashion / quiet luxury → [`outputs/demo_fashion_evidence_case.md`](outputs/demo_fashion_evidence_case.md):
  real sources **revised Timing & Saturation from 75 → 50** and hardened the classism risk.
  Total moved 90 → 88; raw Strong Go, but gated Go because audience/use-case support is
  still proxy/listicle-based.
- AI photo tool / before-after → [`outputs/demo_ai_tool_evidence_case.md`](outputs/demo_ai_tool_evidence_case.md):
  evidence confirmed audience, use case, creative feasibility, and commercial intent, but
  revised Brand Safety from 75 → 50. Total moved 89 → 86; gate passes, but stability remains
  fragile because it sits close to the Strong Go threshold.
- Snack / Dubai-style pistachio kunafa chocolate → [`outputs/demo_snack_evidence_case.md`](outputs/demo_snack_evidence_case.md):
  project-local skills were used to classify evidence; saturation and copycat risk moved
  the read from 81 → 76. Gate passes with moderate stability, but price skepticism remains
  proxy-tier directional caution rather than measured purchase behavior.
- Protein drink / everyday protein → [`outputs/demo_protein_drink_evidence_case.md`](outputs/demo_protein_drink_evidence_case.md):
  the new evidence-collector workflow turned candidate sources into typed evidence. China
  health/fitness and sports-nutrition signals moved the read from 78 → 85, but the result
  is fragile because it sits exactly on the Strong Go threshold and health-claim risk
  remains real.
- AI photo tool competitor layer → [`outputs/demo_ai_tool_competitor_evidence_case.md`](outputs/demo_ai_tool_competitor_evidence_case.md):
  competitor-profiling / product-swipefile style extracts were normalized into evidence.
  Photoroom and Picsart confirm the product-photo use case, while Evoto backlash and
  competitor crowding revise Brand Safety and Timing downward. The read lands at 85 /
  Strong Go, gate pass, but remains fragile because Audience and Creative stay
  unsupported-high.

Additional evidence cases include SAVAS China, OBgE China, Anker Europe, Japan service
robots, POP MART Middle East, Thailand EV, LatAm gaming peripherals, and DJI drones in
the UAE / Saudi / Middle East.

**Trend shortlist demo:** LEGO now has the first ranked shortlist workflow:
World Cup fan culture vs. F1 race weekend vs. graduation season gifting. F1 ranks first
after gated evidence discipline. See [`outputs/lego_trend_shortlist.md`](outputs/lego_trend_shortlist.md).

This is the line between a strategy scaffold and an evidence agent — see below.

The current rigor layer also includes a Strong Go evidence gate, goal-based weight
profiles, no-evidence caps, recommendation stability labels, and a deterministic
source-tier classifier so vendor copy, listicles, and unverified sources cannot quietly
inflate the recommendation.

---

## How the scoring works

Seven dimensions, each scored on **{0, 25, 50, 75, 100}** anchors only:

| Dimension | Weight | Core question |
|-----------|--------|---------------|
| Audience Overlap | 20% | Does the trend's audience match the target customer? |
| Use-case Relevance | 20% | Can the product participate naturally, not forced? |
| Message Bridge | 15% | Is there a clean line from trend to selling point? |
| Creative Feasibility | 15% | Can we produce good native content for it? |
| Commercial Intent | 10% | Is the audience in a buying mindset? |
| Brand Safety | 10% | Any vulgar, political, or values risk? |
| Timing & Saturation | 10% | Early enough to matter, or already crowded? |

**Total = weighted sum, rounded to one integer** (`floor(raw + 0.5)`).

### Decision bands

| Score | Recommendation |
|-------|----------------|
| 85–100 | Strong Go |
| 70–84 | Go |
| 55–69 | Cautious test |
| 40–54 | Weak fit |
| 0–39 | No-go |

### Override rules (applied after scoring)

Three hard rules override the band regardless of total score:

1. **Brand Safety ≤ 25** → capped at Cautious test
2. **Low risk tolerance + Brand Safety < 50** → forced No-go
3. **Audience Overlap ≤ 25 and Use-case Relevance ≤ 25** → capped at Weak fit

A confident "No-go" is as valuable as a "Strong Go."

---

## Architecture: six skills

```
trend-product-fit/          ← core scoring + GTM brief generation
evidence-collector/         ← verified candidates → typed evidence items
competitor-evidence/        ← evidence layer (upgrades Assumption → Evidence)
trend-shortlist/            ← rank several candidate trends for one product
campaign-generator/         ← angles, content ideas, sample copy
outreach-copy/              ← creator DMs and email outreach
```

Each skill is an independent `SKILL.md` with a defined trigger boundary and quality gate. The core skill calls the others; they can also be invoked standalone.

Full skill specs → [`skills/`](skills/)

---

## Getting started

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Pages

| Route | What it does |
|-------|-------------|
| `/workspace` | Editable product + trend workflow for single-trend scoring, 3-trend shortlist ranking, classifier-owned evidence editing, evidence gaps, provider command preview, and Markdown export |
| `/product-profile` | Review the selected demo product name, category, audience, positioning, brand tone, risk tolerance |
| `/trend-input` | Review the selected demo trend name, platform, region, description, format, controversy |
| `/fit-score` | See the seven-dimension score breakdown and the recommendation |
| `/report` | Full GTM brief: angle, risk, voice, words, KOL type, copy, outreach DM |

For demo mode, load any of the five baseline cases from [`data/`](data/) directly from the homepage.

### Tests

```bash
npm test
```

Current local verification: 100 Node tests pass via `npm test`; `npm run build` produces
a successful Next.js production build. CI now runs both commands on GitHub Actions.

Covers: scoring math, evidence adjustment, recommendation rigor, source-tier
classification, provider adapters, evidence-case orchestration / file writing, OpenCLI
research mapping, SerpApi Google Trends mapping, anchor validation, and report Markdown
parsing.

---

## Project scope (v1)

**This version does:**
- Deterministic scoring from manual product + trend input
- Editable `/workspace` flow for single-trend scoring, 3-trend shortlist ranking,
  classifier-owned evidence editing, evidence-gap guidance, provider dry-run / fixture
  commands, and Markdown export
- Full GTM brief output with 12 structured sections
- Five fully worked baseline demo cases with defensible reasoning
- 13 structured evidence cases that show how real sources revise or validate the
  baseline score
- Evidence gates, source-tier discipline, recommendation stability, and goal-based weight
  profiles
- Evidence-case CLI automation, provider normalization, and the first live
  OpenCLI-backed and SerpApi Google Trends research paths
- A first trend-shortlist ranking contract and LEGO shortlist demo
- Skill architecture for extending with real data sources and shortlist workflows

**This version intentionally does not:**
- Auto-crawl TikTok, X, or Instagram for trends
- Automatically scrape KOL emails or follower counts
- Connect to ad platform APIs
- Require login, payment, or a database

The scoring layer and GTM brief are the core value. The data input is manual for v1 — which also means every claim in the output is either grounded in what you provided or explicitly labelled as `Assumption:`. No fabricated metrics.

The path to a full evidence agent is documented in [`skills/competitor-evidence/SKILL.md`](skills/competitor-evidence/SKILL.md),
[`skills/trend-product-fit/evidence_model.md`](skills/trend-product-fit/evidence_model.md),
and [`skills/trend-product-fit/source_tier_classifier.md`](skills/trend-product-fit/source_tier_classifier.md):
the CLI now has SerpApi Google Trends support for Timing & Saturation and Commercial
Intent, while GooseWorks / social-platform collectors remain the next step for raw
user-language Audience evidence.

---

## Project structure

```
trend-fit-gtm-agent/
├── app/                          # Next.js pages
│   ├── page.tsx
│   ├── product-profile/page.tsx
│   ├── trend-input/page.tsx
│   ├── fit-score/page.tsx
│   ├── report/page.tsx
│   └── api/report/[id]/route.ts
├── components/                   # UI components
├── lib/
│   ├── types.ts                  # Product, Trend, Scores, Recommendation types
│   ├── scoring.ts                # calculateTrendFit(), validateScores(), overrides
│   ├── recommendation-rigor.ts    # evidence gate, profiles, caps, stability
│   ├── evidence-adjustment.ts     # typed evidence -> anchor-step score adjustment
│   ├── source-tier-classifier.ts   # verify-first source-tier classifier
│   ├── evidence-collector.ts       # candidate sources -> typed evidence draft
│   ├── demo-cases.ts             # demo and evidence case loading
│   ├── report-sections.ts        # GTM brief section generators
│   └── report-markdown.ts        # Markdown export
├── tests/                        # Scoring, rigor, provider, CLI, and parsing tests
│   ├── scoring.test.ts
│   ├── evidence-adjustment.test.ts
│   ├── recommendation-rigor.test.ts
│   ├── source-tier-classifier.test.ts
│   ├── evidence-collector.test.ts
│   ├── evidence-case-orchestrator.test.ts
│   ├── evidence-case-research-runner.test.ts
│   ├── opencli-research-source.test.ts
│   └── report-markdown.test.ts
├── data/                         # Demo input JSON and structured evidence cases
│   ├── demo_fashion.json
│   ├── demo_fashion_evidence.json
│   ├── demo_ai_tool.json
│   ├── demo_ai_tool_competitor_evidence.json
│   ├── latam_gaming_peripherals_evidence.json
│   └── dji_drones_..._evidence.json
├── outputs/                      # Pre-generated GTM brief and evidence reports
│   ├── demo_fashion_report.md
│   ├── demo_fashion_evidence_case.md
│   ├── demo_ai_tool_competitor_evidence_case.md
│   ├── latam_gaming_peripherals_evidence_case.md
│   └── dji_drones_..._evidence_case.md
├── docs/
│   ├── current-state.md          # handoff state for fresh agent sessions
│   ├── changelog.md              # project-level iteration log
│   └── evidence-case-research-cli.md
├── .github/workflows/
│   └── ci.yml                    # npm ci + npm test + npm run build
└── skills/                       # Skill definitions (Claude-readable strategy layer)
    ├── trend-product-fit/
    │   ├── SKILL.md              ← the core asset: scoring rubric, voice rules, examples
    │   ├── scoring_rubric.md
    │   ├── risk_taxonomy.md
    │   ├── brand_voice_rules.md
    │   ├── evidence_model.md
    │   ├── weight_profiles.md
    │   ├── source_tier_classifier.md
    │   └── examples.md
    ├── evidence-collector/SKILL.md
    ├── competitor-evidence/SKILL.md
    ├── trend-shortlist/SKILL.md
    ├── campaign-generator/SKILL.md
    └── outreach-copy/SKILL.md
```

---

## Why this matters for GTM work

The hardest part of brand trend-jacking is not knowing what is trending. It is deciding whether it is *actually relevant* — without confusing audience size for audience match, without mistaking creative ease for strategic fit, and without missing the brand risks that only show up once you've already posted.

This project attempts to make that judgment legible, scorable, and auditable — so a GTM team can show their reasoning, not just their conclusion.

---

## Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS
