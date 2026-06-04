# Handoff to Codex — scoring contract & what's done

Claude has completed the skill layer (the project's core asset). This file is the
contract so the Next.js/TypeScript code you build computes scores that match the demo
reports exactly.

## What Claude delivered
- `skills/trend-product-fit/` — core skill: `SKILL.md`, `scoring_rubric.md`,
  `risk_taxonomy.md`, `brand_voice_rules.md`, `examples.md`
- `skills/competitor-evidence/SKILL.md`, `skills/campaign-generator/SKILL.md`,
  `skills/outreach-copy/SKILL.md`
- `data/demo_fashion.json`, `data/demo_robotics.json`, `data/demo_ai_tool.json`
  (Product Profile + Trend Input + deterministic per-dimension scores)
- `outputs/demo_fashion_report.md`, `demo_robotics_report.md`, `demo_ai_tool_report.md`
  (gold-standard GTM briefs the report page should resemble)

## What's yours (per the plan, §8/§15)
Next.js + TS + Tailwind app, pages (Product Profile / Trend Input / Fit Score /
Report), components, `lib/scoring.ts`, `lib/types.ts`, Markdown export, bug fixes.

## Scoring contract (must match `data/*.json`)

Each dimension is scored on the anchored scale **{0, 25, 50, 75, 100}**. Weights:

```ts
const WEIGHTS = {
  audienceOverlap:    0.20,
  useCaseRelevance:   0.20,
  messageBridge:      0.15,
  creativeFeasibility:0.15,
  commercialIntent:   0.10,
  brandSafety:        0.10,
  timingSaturation:   0.10,
};
// Each dimension score MUST be one of {0, 25, 50, 75, 100}. Reject/await off-anchor
// values (e.g. 85) — they are a contract violation, not a valid input.
const DISPLAY = (raw: number) => Math.floor(raw + 0.5); // round HALF UP, deterministic
// total = Σ score[d] * WEIGHTS[d]  → raw 0–100 ;  display = DISPLAY(total)
```

Verified against `data/*.json` (strict anchors only): **fashion raw 90.00 → 90 ·
robotics raw 73.75 → 74 · AI-tool raw 88.75 → 89.** `expectedTotal` in each JSON is the
display value — assert it in a test. Also assert every score ∈ {0,25,50,75,100}.

### Decision bands (computed on the **display** total) → this is `rawBand`
| Display score | Band |
|---------------|------|
| 85–100 | Strong Go |
| 70–84 | Go |
| 55–69 | Cautious test |
| 40–54 | Weak fit |
| 0–39 | No-go |

### Override rules → produce `finalBand` (apply AFTER computing `rawBand`)
1. `brandSafety <= 25` → cap `finalBand` at **Cautious test**.
2. `riskTolerance === "low" && brandSafety < 50` → force `finalBand` = **No-go**.
3. `audienceOverlap <= 25 && useCaseRelevance <= 25` → cap `finalBand` at **Weak fit**.

When no rule fires, `finalBand === rawBand` and `overrideReason = null`. All three demos
are no-override cases (`finalBand === rawBand`).

### Recommendation is structured, NOT a free-text string
Do **not** model the recommendation as `"Go with trust-building angle"`. Split it:

```ts
type Recommendation = {
  rawBand: Band;          // from the score table
  finalBand: Band;        // after overrides
  overrideReason: string | null;
  qualifier: string | null; // e.g. "trust-building angle" — display only, never logic
};
```

Logic/tests/colors/filters key off `finalBand` only. The UI may render
`` `${finalBand}${qualifier ? " — " + qualifier : ""}` `` (e.g. "Go — trust-building
angle"). The demo JSONs expose `expectedBand`, `expectedFinalBand`, `expectedQualifier`,
`overrideReason` for exactly this.

## Suggested `lib/types.ts` shape
Mirror the JSON: `Product`, `Trend`, `Scores` (the 7 keys above, each `0|25|50|75|100`),
and a derived `Report` (`totalRaw`, `total` (display), `Recommendation` as above, plus
the brief sections). The brief prose for the 3 demos already lives in `outputs/*.md` —
for v1 render those Markdown files directly on the report page rather than generating
prose in code.

## First step (per Codex review): freeze the contract, then test, then UI
1. `lib/scoring.ts` + tests covering: the 3 demos (total + finalBand + qualifier);
   anchor validation; the 3 override rules. **Do this before any page.**
2. Then the 4 pages (Product Profile / Trend Input / Fit Score / Report).

## Don't (v1 scope, per §14)
No crawlers (TikTok/X), no KOL-email scraping, no ad-platform APIs, no DB/auth/payments.
Manual trend input only.
