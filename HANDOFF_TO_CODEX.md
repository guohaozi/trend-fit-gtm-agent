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

## v1.1 — Evidence → Score layer (NEW, the "middle version")

Spec: [`skills/trend-product-fit/evidence_model.md`](skills/trend-product-fit/evidence_model.md).
Reference instance + expected output: [`data/demo_fashion_evidence.json`](data/demo_fashion_evidence.json).
Readable case: [`outputs/demo_fashion_evidence_case.md`](outputs/demo_fashion_evidence_case.md).

**Invariant:** evidence only shifts a dimension by whole anchor steps, so adjusted scores
are still `0|25|50|75|100` and feed the *existing* `calculateTrendFit()` unchanged. No change
to scoring.ts's core math, bands, or overrides — you add a pre-step that produces adjusted
`Scores`, then call the same function.

```ts
type EvidenceItem = {
  id: string;
  dimension: keyof Scores;
  direction: "up" | "down" | "confirm";
  magnitude: "weak" | "moderate" | "strong";     // 1 | 2 | 3
  confidence: "low" | "medium" | "high";          // 1 | 2 | 3
  sourceTier: "primary" | "secondary" | "proxy";
  sourceUrl: string;
  note: string;
};

const MAG  = { weak: 1, moderate: 2, strong: 3 };
const CONF = { low: 1, medium: 2, high: 3 };
const ANCHORS = [0, 25, 50, 75, 100] as const;

// per item: c = CONF[confidence]; if proxy → c = min(c,2)
//           base = MAG[magnitude]*c; if proxy → base *= 0.5
//           signed = up:+base | down:-base | confirm:0
// per dim:  net = Σ signed ; steps = |net|<4?0 : |net|<9?1 : 2
//           adjustedAnchor = ANCHORS[ clamp(idx(baseline) + sign(net)*steps, 0, 4) ]
function adjustScores(baseline: Scores, evidence: EvidenceItem[]): {
  adjusted: Scores;
  confidenceByDimension: Record<keyof Scores, string>; // "assumption" | "evidence-confirmed (x)" | "evidence-revised (x)"
};
```

Then: `calculateTrendFit(adjustScores(baseline, evidence).adjusted, riskTolerance)`.

**Tests to add** (assert against `demo_fashion_evidence.json`):
- adjusted scores === `expectedAdjustedScores` (timingSaturation 75→50, rest unchanged)
- adjusted total === `expectedAdjustedTotal` (88), band === `expectedAdjustedBand`
- per-dimension confidence labels === `expectedDimensionConfidence`
- proxy items: a proxy-only down-pile must NOT move a score 2 steps (half-weight + cap)

The report page should show **baseline vs evidence-adjusted** side by side, the
per-dimension confidence label, and the source list — that contrast is the product's
whole pitch.

## v1.1 — Trend Shortlist (ranking N trends)
Skill: [`skills/trend-shortlist/SKILL.md`](skills/trend-shortlist/SKILL.md). The "middle
version" workflow: 1 product + 3-5 manual trends → score + evidence-adjust each → rank →
return winner's full brief. Ranking order: finalBand priority → adjusted total → mean
confidence → timingSaturation. Build this AFTER the evidence layer + a multi-trend input
page. Still no auto-crawl.

## v1.2 — Rigor layer: weight profiles + evidence gate + caps + fragility (NEW)

Per the scoring-improvement brief. **All additive — `calculateTrendFit` core math, the
frozen `data/*.json` raw fields, and existing tests are untouched.** These are layers on
top that produce new fields. Specs:
[`weight_profiles.md`](skills/trend-product-fit/weight_profiles.md),
[`scoring_rubric.md`](skills/trend-product-fit/scoring_rubric.md) (no-evidence caps),
[`evidence_model.md`](skills/trend-product-fit/evidence_model.md) §3a/§5a–§5d.

```ts
type WeightProfile = "default" | "brand_awareness" | "ecommerce_conversion"
                   | "b2b_pipeline" | "creator_seeding" | "risk_sensitive";
// PROFILES[p] is a Record<ScoreKey, number> summing to 1.0; default === existing WEIGHTS.
// calculateTrendFit(scores, risk, PROFILES[profile]) — pass weights in; same math.

type EvidenceGate = "pass" | "partial" | "fail";
type Stability = "stable" | "moderate" | "fragile";
type DecisionType = "No-go" | "observe" | "small test" | "creator seeding"
                  | "organic push" | "paid push";

type GatedRecommendation = {
  profileUsed: WeightProfile;
  evidenceGate: EvidenceGate;
  gateMissing: string[];          // required dims lacking evidence
  gatedBand: Band;                // finalBand, downgraded one step if Strong Go && gate != pass
  dimensionCaps: ScoreKey[];      // dims scored >75 without non-proxy evidence
  recommendationStability: Stability;
  decisionType: DecisionType;
  nextValidationAction: string;
};
```

**Rules (all deterministic, in evidence_model.md):**
- *No-evidence caps:* Audience/Creative/Commercial/Timing >75 require non-proxy evidence;
  else list in `dimensionCaps` (advisory; don't mutate the raw total).
- *Strong Go gate:* require non-proxy evidence on Timing, BrandSafety, (Audience OR
  Use-case) [+ non-proxy Commercial for `ecommerce_conversion`/`b2b_pipeline`]. Miss →
  downgrade a Strong Go to Go (`gatedBand`), set gate `partial`/`fail`.
- *Fragility:* fragile if gate fail OR margin-to-band-edge ≤3 OR any `dimensionCaps` OR a
  −1 anchor step on an assumption/proxy dim flips the band.
- *decisionType:* table in evidence_model §5d (fragile ⇒ never "paid push").

**Tests to add (assert against the demo JSONs' new `expected*` fields):**
- `demo_fashion`/`demo_ai_tool` (assumption-only): gate `fail` → `gatedBand` "Go",
  `dimensionCaps` non-empty, stability `fragile`, decisionType "small test".
- `demo_robotics`: gate `fail`, `gatedBand` "Go", caps `[]`, fragile, "small test".
- `demo_fashion_evidence`: The VOU/listicle items are proxy, so gate `partial`,
  `gatedBand` "Go", caps `["audienceOverlap", "creativeFeasibility"]`, fragile,
  decisionType "small test".
- weight profiles: each sums to 1.0; fashion scores give risk_sensitive → 81 (Go),
  ecommerce_conversion → 88, others 90.
- UI: show rawBand vs gatedBand, the gate badge, stability, and `nextValidationAction`.

**NOT doing (explicit, honest):** the 20–50 case calibration set. No real campaign-outcome
data exists; fabricating it would violate the evidence rule and the scoring philosophy.
Weights stay labelled expert-priors until real outcomes exist. This is a deliberate
boundary, not an omission.

## Don't (v1 scope, per §14)
No crawlers (TikTok/X), no KOL-email scraping, no ad-platform APIs, no DB/auth/payments.
Manual trend input only. (Auto trend *discovery* is the layer AFTER the shortlist works.)
