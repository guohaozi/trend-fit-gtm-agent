# Evidence → Score Model — the Assumption → Evidence contract

This is the keystone that turns the project from a *strategy scaffold* into an *evidence
agent*. It defines, deterministically, how a piece of real evidence adjusts a dimension
score — so that "the trend peaked in 2023, so Timing should drop" stops being prose and
becomes a typed, testable, machine-rankable operation.

**Design invariant: evidence never produces an off-anchor score.** Every dimension stays
on `{0, 25, 50, 75, 100}`. Evidence can only move a dimension by whole anchor *steps*.
This keeps the entire pipeline compatible with the frozen scoring contract — the
evidence-adjusted scores feed the *same* `scoring.ts` weighted sum, rounding, bands, and
overrides. Nothing downstream changes.

---

## 1. Two-stage scoring

```
Stage 1 — ASSUMPTION baseline   (what we have today)
  analyst assigns each dimension an anchor {0,25,50,75,100} from the rubric
  → baseline total / band   (the strategy scaffold)

Stage 2 — EVIDENCE adjustment   (this model)
  attach evidence items → each dimension's anchor may shift by ±1 or ±2 steps
  → evidence-adjusted total / band   (the evidence agent)
```

Both are shown in the report. The delta between them is the whole point: it proves the
evidence layer actually does something.

---

## 2. The evidence item (schema)

```json
{
  "id": "ev-timing-1",
  "dimension": "timingSaturation",
  "direction": "down",          // "up" | "down" | "confirm"
  "magnitude": "moderate",      // "weak" | "moderate" | "strong"
  "confidence": "medium",       // "low" | "medium" | "high"
  "sourceTier": "secondary",    // "primary" | "secondary" | "proxy"
  "sourceUrl": "https://…",
  "note": "Trend peaked 2023; multiple 2025 analyses say hype is past peak."
}
```

- `dimension` — one of the 7 scoring keys.
- `direction` — does this evidence push the score **up**, **down**, or merely
  **confirm** the baseline? `confirm` never moves the score; it only hardens confidence.
- `magnitude` — how strongly the *finding* argues (independent of how trustworthy it is).
- `confidence` — how trustworthy the finding/source is.
- `sourceTier` — quality of the source. This is the honesty governor (see §3).
- `sourceUrl` / `note` — provenance + a one-line verbatim-or-paraphrase justification.

---

## 3. Deterministic aggregation rule

```
magW  = { weak:1, moderate:2, strong:3 }
confW = { low:1,  medium:2,   high:3 }

for each item:
    c = confW[confidence]
    if sourceTier == "proxy":  c = min(c, 2)          # proxy can't be "high"
    base = magW[magnitude] * c                          # 1..9
    if sourceTier == "proxy":  base = base * 0.5        # proxy contributes at half weight
    signed = (direction=="up") ?  base
           : (direction=="down")? -base
           :                       0                     # confirm
    add signed to net[dimension]

# anchor steps from net pressure
steps(net) = |net| < 4      ? 0
           : |net| < 9      ? 1
           :                  2
adjusted_anchor = ANCHORS[ clamp( idx(baseline) + sign(net)*steps(net), 0, 4 ) ]
```

`ANCHORS = [0,25,50,75,100]`, `idx` is the position in that array.

**Why proxy is penalized twice (cap + half-weight):** listicle / affiliate / SEO-content
sources are real signals but weak ones. They must not be able to swing a score hard.
This is the structural encoding of the rule "don't overclaim evidence" — a pile of
"affordable dupe" listicles can nudge a score, but only a primary source (raw Google
Trends, a named-expert quote, a real review corpus) can move it two steps.

### Dimension confidence label (display only, not used in math)
```
no items          → "assumption"
items, steps != 0 → "evidence-revised ("  + maxEffectiveConfidence + ")"
items, steps == 0 → "evidence-confirmed (" + maxEffectiveConfidence + ")"
```

---

## 3a. Source-tier rubric (what counts as what)

`sourceTier` is the honesty governor. Classify every source honestly:

| Tier | What qualifies | Can affect | Max movement | Lifts a no-evidence cap? |
|------|----------------|-----------|--------------|--------------------------|
| **primary** | Raw platform data (Google Trends export, native analytics), a real review/comment corpus, named-expert quotes in reputable press, directly-observed competitor campaigns | any dimension | 2 steps | **Yes** |
| **secondary** | Reputable journalism/industry analysis summarizing data or trends; established reports | any dimension | 2 steps (usually 1) | **Yes** |
| **proxy** | Listicles, affiliate/SEO content, marketing blogs, single anecdotes, vendor copy | directional context only | **1 step** (half-weight + confidence capped at medium) | **No** |

Rules that follow from this:
- **Proxy can never confirm a no-evidence cap dimension at 100.** A pile of "affordable
  dupe" listicles is a real saturation/awareness signal but is *not* measured purchase
  behavior or measured audience overlap. Proxy supplies direction, never proof.
- **"Non-proxy evidence"** (primary or secondary) is what the no-evidence caps
  (`scoring_rubric.md`) and the Strong Go gate (§5a) require. Proxy items do not satisfy
  either.
- When unsure between secondary and proxy, choose **proxy**. Under-claiming source
  strength is the safe error.

---

## 4. Worked instance — fashion / quiet luxury

Matches [`data/demo_fashion_evidence.json`](../../data/demo_fashion_evidence.json) and the
readable [`outputs/demo_fashion_evidence_case.md`](../../outputs/demo_fashion_evidence_case.md).

| Dimension | Baseline | Evidence items (signed) | net | steps | Adjusted | Label |
|-----------|----------|-------------------------|-----|-------|----------|-------|
| timingSaturation | 75 | Accio decline −4, Influencers −2, listicle-saturation (proxy) −2 | −8 | −1 | **50** | evidence-revised (medium) |
| brandSafety | 50 | Refinery29 named-expert confirm 0, Essence confirm 0 | 0 | 0 | 50 | evidence-confirmed (high) |
| useCaseRelevance | 100 | The VOU named mid-brands (proxy) confirm 0 | 0 | 0 | 100 | evidence-confirmed (medium) |
| commercialIntent | 75 | listicle commerce (proxy) confirm 0 | 0 | 0 | 75 | evidence-confirmed (medium) |
| audienceOverlap | 100 | The VOU mid-brand reach (proxy) confirm 0 | 0 | 0 | 100 | evidence-confirmed (medium) |
| messageBridge | 100 | The VOU "intention not price" (proxy) confirm 0 | 0 | 0 | 100 | evidence-confirmed (medium) |
| creativeFeasibility | 100 | none | 0 | 0 | 100 | assumption |

Adjusted total `= 100·.2+100·.2+100·.15+100·.15+75·.1+50·.1+50·.1 = 87.5 → 88` → **Strong
Go** (down from baseline 90; band held, saturation now honest).

---

## 5. How it composes with overrides
Evidence adjustment happens **before** the override rules in `SKILL.md`. If evidence
drives `brandSafety` down to ≤ 25, the existing override (cap at Cautious test) fires on
the adjusted score automatically — no special casing. Evidence and overrides are
independent layers that stack cleanly because both operate on anchors.

---

## 5a. Strong Go evidence gate

A Strong Go must be **earned with evidence**, not asserted. The gate runs *after*
overrides, on `finalBand`.

```
hasNonProxyEvidence(dim)= any item on dim with sourceTier in {primary, secondary}

required(profile) = [ timingSaturation, brandSafety, (audienceOverlap OR useCaseRelevance) ]
                    + (profile ∈ {ecommerce_conversion, b2b_pipeline}
                         ? [ commercialIntent (non-proxy) ] : [])
# Every required slot must be satisfied by non-proxy evidence. Proxy is useful context,
# but it cannot earn the top recommendation tier.

metCount = number of required slots satisfied   # the (Audience OR Use-case) slot counts once

evidenceGate =
   all required satisfied        ? "pass"
 : metCount >= 1                  ? "partial"
 :                                 "fail"

gatedBand =
   (finalBand == "Strong Go" && evidenceGate != "pass")  ? downgradeOneBand(finalBand)  // → "Go"
 :                                                          finalBand
```

The gate only guards the **top tier** — it never *upgrades*, and for Go/Cautious/Weak/
No-go it reports coverage but does not change the band. An assumption-only 90 therefore
reports `finalBand: Strong Go` but `gatedBand: Go` with `evidenceGate: fail` — *"a Go
pending evidence."* That contrast is the product's whole point.

`gateMissing` = the list of required dimensions lacking evidence (drives the "downgraded
because…" line and the `nextValidationAction`).

## 5b. No-evidence caps (link)
Defined in `scoring_rubric.md`: Audience / Creative / Commercial / Timing cannot exceed
**75** without non-proxy evidence. Report violations as `dimensionCaps` — they are
unsupported-high claims, and they feed fragility (§5c). Caps are a scoring-time rule for
new cases; for already-scored inputs, surface them as advisory flags.

## 5c. Sensitivity & fragility

Every recommendation is labelled so a borderline call is never dressed up as certainty.

```
thresholds = [85, 70, 55, 40]                  # band lower-bounds
margin     = min(|displayTotal - t|) over thresholds
flipDown(dim) = getBand changes when dim drops one anchor step (recompute display)

fragile  if  evidenceGate == "fail"
          OR margin <= 3
          OR dimensionCaps not empty
          OR any flipDown(dim) where dim has NO non-proxy evidence   # assumption/proxy leg
moderate if  not fragile AND ( margin <= 8 OR any flipDown(dim) on an evidenced dim )
stable   otherwise
```

A **fragile** recommendation never gets a big-budget `decisionType` — cap it at a small
test (see below). `stable` requires both evidence coverage *and* comfortable margin; the
current demos are all fragile-or-near precisely because they are assumption-heavy — which
is the honest signal, not a bug.

## 5d. decisionType (what to actually do)

```
No-go        → "No-go"
Weak fit     → "observe"
Cautious test→ "small test"
Go           → fragile ? "small test"
              : hasNonProxyEvidence(commercialIntent) && stability=="stable" ? "organic push"
              : "creator seeding"
Strong Go    → fragile ? "organic push"          // never go paid on a fragile top call
              : (hasNonProxyEvidence(commercialIntent) && stability=="stable") ? "paid push"
              : "organic push"
```

`nextValidationAction` = the single most decision-changing thing to verify next — usually
the first `gateMissing` dimension, or the `dimensionCaps` leg the recommendation leans on.

---

## 6. What this unblocks
A typed evidence→score function is the prerequisite for ranking multiple trends by
*evidence-adjusted* fit. See [`trend-shortlist`](../trend-shortlist/SKILL.md), which uses
this model to score N candidate trends and recommend the best one. Codex's
implementation contract for this model lives in `HANDOFF_TO_CODEX.md`.
