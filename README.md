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

Four fully worked demo cases, each with real scoring rationale (no fabricated metrics):

| Product | Trend | Score | Decision |
|---------|-------|-------|----------|
| Mid-range men's clothing | Quiet luxury / old money outfit | **90 / 100** | Strong Go |
| Home robotics brand | AI home gadgets / smart home setup | **74 / 100** | Go — trust-building angle |
| AI photo editing tool | AI profile photo / product photo before-after | **89 / 100** | Strong Go |
| Snack / confectionery brand | Dubai-style pistachio kunafa chocolate | **81 / 100** | Go |

Demo briefs → [`outputs/`](outputs/)  
Demo input data → [`data/`](data/)

**Evidence agent in action:** three demo cases now include real evidence layers:

- Fashion / quiet luxury → [`outputs/demo_fashion_evidence_case.md`](outputs/demo_fashion_evidence_case.md):
  real sources **revised Timing & Saturation from 75 → 50** and hardened the classism risk.
  Total moved 90 → 88; raw Strong Go, but gated Go because audience/use-case support is
  still proxy/listicle-based.
- AI photo tool / before-after → [`outputs/demo_ai_tool_evidence_case.md`](outputs/demo_ai_tool_evidence_case.md):
  evidence confirmed audience, use case, creative feasibility, and commercial intent, but
  revised Brand Safety from 75 → 50. Total moved 89 → 86; gate passes, but stability remains
  fragile because it sits close to the Strong Go threshold.
- Snack / Dubai-style pistachio kunafa chocolate → [`outputs/demo_snack_evidence_case.md`](outputs/demo_snack_evidence_case.md):
  project-local skills were used to classify evidence; saturation, price skepticism, and
  copycat risk moved the read from 81 → 74. Gate passes, but the decision remains a
  fragile Go / small test rather than a broad launch.

This is the line between a strategy scaffold and an evidence agent — see below.

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

## Architecture: four skills

```
trend-product-fit/          ← core scoring + GTM brief generation
competitor-evidence/        ← evidence layer (upgrades Assumption → Evidence)
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
| `/product-profile` | Enter product name, category, audience, positioning, brand tone, risk tolerance |
| `/trend-input` | Enter trend name, platform, region, description, format, controversy |
| `/fit-score` | See the seven-dimension score breakdown and the recommendation |
| `/report` | Full GTM brief: angle, risk, voice, words, KOL type, copy, outreach DM |

For demo mode, load any of the three cases from [`data/`](data/) directly from the homepage.

### Tests

```bash
npm test
```

Covers: scoring math for all three demo cases, anchor validation, all three override rules.

---

## Project scope (v1)

**This version does:**
- Deterministic scoring from manual product + trend input
- Full GTM brief output with 12 structured sections
- Three fully worked demo cases with defensible, evidence-grounded reasoning
- Skill architecture for extending with real data sources

**This version intentionally does not:**
- Auto-crawl TikTok, X, or Instagram for trends
- Automatically scrape KOL emails or follower counts
- Connect to ad platform APIs
- Require login, payment, or a database

The scoring layer and GTM brief are the core value. The data input is manual for v1 — which also means every claim in the output is either grounded in what you provided or explicitly labelled as `Assumption:`. No fabricated metrics.

The path to a full evidence agent is documented in [`skills/competitor-evidence/SKILL.md`](skills/competitor-evidence/SKILL.md): once gooseworks (Reddit/X scraping) and the seo-keyword-research skill (Google Trends) are connected, the two weakest assumed dimensions — Timing & Saturation and Commercial Intent — become data-backed.

---

## Project structure

```
trend-fit-gtm-agent/
├── app/                          # Next.js pages
│   ├── product-profile/page.tsx
│   ├── trend-input/page.tsx
│   ├── fit-score/page.tsx
│   └── report/page.tsx
├── components/                   # UI components
├── lib/
│   ├── types.ts                  # Product, Trend, Scores, Recommendation types
│   ├── scoring.ts                # calculateTrendFit(), validateScores(), overrides
│   ├── demo-cases.ts             # Three loaded demo cases
│   ├── report-sections.ts        # GTM brief section generators
│   └── report-markdown.ts        # Markdown export
├── tests/
│   ├── scoring.test.ts
│   └── report-markdown.test.ts
├── data/                         # Demo input JSON (product + trend + scores)
│   ├── demo_fashion.json
│   ├── demo_robotics.json
│   └── demo_ai_tool.json
├── outputs/                      # Pre-generated GTM brief reports (Markdown)
│   ├── demo_fashion_report.md
│   ├── demo_robotics_report.md
│   └── demo_ai_tool_report.md
└── skills/                       # Skill definitions (Claude-readable strategy layer)
    ├── trend-product-fit/
    │   ├── SKILL.md              ← the core asset: scoring rubric, voice rules, examples
    │   ├── scoring_rubric.md
    │   ├── risk_taxonomy.md
    │   ├── brand_voice_rules.md
    │   └── examples.md
    ├── competitor-evidence/SKILL.md
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
