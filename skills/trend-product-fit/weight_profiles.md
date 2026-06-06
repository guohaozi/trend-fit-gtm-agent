# Weight Profiles — goal-based scoring lenses

The 7 dimensions are universal; **how much each matters depends on the campaign goal.**
A brand-awareness play and an e-commerce conversion push should not weight Commercial
Intent the same way. A profile is just an alternate weight vector — same dimensions, same
anchors `{0,25,50,75,100}`, same bands, same overrides, same evidence gate. Only the
weights change, so the whole pipeline stays compatible.

## Honesty disclaimer (important)
These weights are **expert-set, not outcome-calibrated.** They encode reasonable GTM
priorities, not a regression on real campaign results. Do not present a profile's total
as a validated predictor. Calibrating these against real outcomes is a future step — see
the roadmap at the bottom. Until then, profiles are *defensible lenses*, not truth.

Every profile's weights sum to exactly **1.0**.

---

## Profiles

| Dimension | default | brand_awareness | ecommerce_conversion | b2b_pipeline | creator_seeding | risk_sensitive |
|-----------|:------:|:---:|:---:|:---:|:---:|:---:|
| audienceOverlap     | 0.20 | 0.20 | 0.20 | 0.25 | 0.20 | 0.15 |
| useCaseRelevance    | 0.20 | 0.15 | 0.15 | 0.20 | 0.15 | 0.15 |
| messageBridge       | 0.15 | 0.15 | 0.15 | 0.20 | 0.10 | 0.10 |
| creativeFeasibility | 0.15 | 0.20 | 0.10 | 0.05 | 0.25 | 0.10 |
| commercialIntent    | 0.10 | 0.05 | 0.20 | 0.15 | 0.05 | 0.10 |
| brandSafety         | 0.10 | 0.10 | 0.10 | 0.10 | 0.10 | 0.25 |
| timingSaturation    | 0.10 | 0.15 | 0.10 | 0.05 | 0.15 | 0.15 |
| **sum**             | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

```json
{
  "default":             { "audienceOverlap": 0.20, "useCaseRelevance": 0.20, "messageBridge": 0.15, "creativeFeasibility": 0.15, "commercialIntent": 0.10, "brandSafety": 0.10, "timingSaturation": 0.10 },
  "brand_awareness":     { "audienceOverlap": 0.20, "useCaseRelevance": 0.15, "messageBridge": 0.15, "creativeFeasibility": 0.20, "commercialIntent": 0.05, "brandSafety": 0.10, "timingSaturation": 0.15 },
  "ecommerce_conversion":{ "audienceOverlap": 0.20, "useCaseRelevance": 0.15, "messageBridge": 0.15, "creativeFeasibility": 0.10, "commercialIntent": 0.20, "brandSafety": 0.10, "timingSaturation": 0.10 },
  "b2b_pipeline":        { "audienceOverlap": 0.25, "useCaseRelevance": 0.20, "messageBridge": 0.20, "creativeFeasibility": 0.05, "commercialIntent": 0.15, "brandSafety": 0.10, "timingSaturation": 0.05 },
  "creator_seeding":     { "audienceOverlap": 0.20, "useCaseRelevance": 0.15, "messageBridge": 0.10, "creativeFeasibility": 0.25, "commercialIntent": 0.05, "brandSafety": 0.10, "timingSaturation": 0.15 },
  "risk_sensitive":      { "audienceOverlap": 0.15, "useCaseRelevance": 0.15, "messageBridge": 0.10, "creativeFeasibility": 0.10, "commercialIntent": 0.10, "brandSafety": 0.25, "timingSaturation": 0.15 }
}
```

---

## When to use each

| Profile | Use when the goal is… | What it rewards | Strong Go also requires |
|---------|------------------------|-----------------|--------------------------|
| **default** | Unsure / balanced GTM discussion | Even weighting; the frozen demo lens | (standard gate) |
| **brand_awareness** | Reach, top-of-funnel, mindshare | Audience + creativity + timing; commercial de-emphasized | (standard gate) |
| **ecommerce_conversion** | Direct sales / DTC / "link in bio" | Commercial Intent doubled; harder bar on purchase signal | **Commercial Intent evidence** (non-proxy) |
| **b2b_pipeline** | Pipeline / demand gen for B2B | Audience-overlap gate + message bridge; creative matters least | **Commercial Intent evidence** (non-proxy) |
| **creator_seeding** | Seeding creators / UGC engine | Creative feasibility + early timing | (standard gate) |
| **risk_sensitive** | Regulated / conservative / brand-safety-first | Brand Safety heavily weighted | (standard gate; pair with low riskTolerance override) |

Selection rule: map the product's `campaignGoal` to the closest profile. If it doesn't
map cleanly, use `default` and state that in `profileUsed`. The conversion profiles
(`ecommerce_conversion`, `b2b_pipeline`) tighten the Strong Go evidence gate to also
require **Commercial Intent** evidence — you cannot claim a conversion Strong Go on a
proxy/assumption purchase signal.

---

## Worked check — fashion demo across profiles (same scores, different lens)

Fashion baseline scores `100/100/100/100/75/50/75`:

| Profile | Total (raw → display) | Band |
|---------|:-----------:|------|
| default | 90.00 → 90 | Strong Go |
| brand_awareness | 90.00 → 90 | Strong Go |
| ecommerce_conversion | 87.50 → 88 | Strong Go |
| b2b_pipeline | 90.00 → 90 | Strong Go |
| creator_seeding | 90.00 → 90 | Strong Go |
| risk_sensitive | 81.25 → 81 | Go |

Note `risk_sensitive` drops it to **Go** — the same trend is a weaker bet for a
brand-safety-first company, because the classism risk (Brand Safety 50) now carries 2.5×
weight. That is the profile doing its job: different goals, different but explainable
verdicts. (These totals are verified in the repo; the conversion-profile Strong Go would
*also* require Commercial Intent evidence to survive the gate.)

---

## Calibration roadmap (why these aren't final — and why we won't fake it)

The weights are priors, not posteriors. To make them outcome-calibrated you would:
1. Assemble **20–50 real, labelled cases**: (product, trend, profile, scores) → observed
   outcome (did the campaign land, flop, or backfire?).
2. Fit/adjust weights so the framework's band ordering matches real outcomes.
3. Re-freeze the demo expectations against the calibrated weights.

We are **not** shipping a fake calibration set. Inventing outcome data to look
"data-driven" would violate this project's core evidence rule and is exactly the kind of
false precision the scoring philosophy warns against. Until real outcome data exists,
these profiles stay honestly labelled as expert priors.
