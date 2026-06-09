# Evidence Case: FitMilk Daily Protein x Everyday protein for lifestyle weight management

## Executive Read

Baseline read: **78 / Go**.  
Evidence-adjusted read: **85 / Strong Go**.  
Gated recommendation: **Strong Go**, but **fragile**.

This is the strongest new evidence case because it has a clear market wedge:

- Japan has normalized convenience-store RTD protein through SAVAS-style products.
- China has a growing health, fitness, and sports-nutrition audience.
- The RTD protein drink format still needs category education in China.
- Brand safety is real: weight-loss, meal-replacement, and protein-health claims must stay
  conservative.

## Collector Notes

This case used the new evidence-collector workflow:

1. Candidate sources were gathered through web research fallback because GooseWorks CLI was
   unavailable in this environment.
2. Sources were classified with `lib/source-tier-classifier.ts`.
3. Accepted candidates were shaped into typed evidence items.
4. Vendor-owned Meiji sources were kept as proxy, not upgraded, even though SAVAS is the
   key Japan reference.

Collector improvement found:

`Glanbia` is a nutrition-ingredient supplier publishing category research that cites
GlobalData and Innova. This exposed a collector gap, so the classifier now has a
`supplier_category_report` signal: verified supplier-owned category research can be
`secondary`, but max confidence is capped at `medium`.

## Evidence Items

### Audience Overlap

- **Frontiers / China national fitness context** — secondary, high confidence.
  Supports the idea that exercise and health routines are broader than professional gym
  users, revising Audience Overlap from **75 -> 100**.

Source: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1578817/full

### Use-case Relevance

- **Meiji SAVAS protein page** — proxy, medium confidence.
  Confirms the Japan RTD protein product reference, but remains proxy because it is vendor
  copy about its own product.

Source: https://www.meiji.com/global/food/protein/

### Message Bridge

- **Meiji protein image story** — proxy, medium confidence.
  Useful support for the message bridge from heavy supplement to easier daily drink, but
  still brand-owned storytelling.

Source: https://www.meiji.com/global/wellness-stories/changing-protein-images.html

### Commercial Intent

- **Glanbia China sports-nutrition outlook** — secondary, medium confidence, with supplier
  bias cap.
  Indicates Protein RTD is small but fast-growing in China, revising Commercial Intent
  from **75 -> 100**.

Source: https://www.glanbianutritionals.com/en-au/node/2346

### Timing & Saturation

- **Glanbia China sports-nutrition outlook** — secondary, medium confidence.
  Confirms the timing read: sports nutrition is broadening into active lifestyle while RTD
  protein remains an emerging format.

Source: https://www.glanbianutritionals.com/en-au/node/2346

### Brand Safety

- **Harvard Health protein supplement risk overview** — secondary, high confidence.
  Confirms Brand Safety at **50**, not because protein drinks are inherently unsafe, but
  because health and weight-management claims require disciplined language.

Source: https://www.health.harvard.edu/staying-healthy/the-hidden-dangers-of-protein-powders

## Before / After

| Dimension | Baseline | Evidence-adjusted | Confidence | Why |
|-----------|----------|-------------------|------------|-----|
| Audience Overlap | 75 | 100 | evidence-revised (high) | China health/fitness participation context supports a broader audience. |
| Use-case Relevance | 100 | 100 | evidence-confirmed (medium) | Japan SAVAS supports the RTD use case, but source is vendor-owned. |
| Message Bridge | 75 | 75 | evidence-confirmed (medium) | Brand-owned story supports daily-drink framing but cannot prove demand. |
| Creative Feasibility | 75 | 75 | assumption | No strong non-proxy creative performance source yet. |
| Commercial Intent | 75 | 100 | evidence-revised (medium) | China RTD protein category signal supports purchase intent, but supplier-owned research is confidence-capped. |
| Brand Safety | 50 | 50 | evidence-confirmed (high) | Protein/weight-management claims need guardrails. |
| Timing & Saturation | 75 | 75 | evidence-confirmed (medium) | The format looks early enough for China, but this timing evidence is supplier-owned. |

## Rigor Layer

- Evidence gate: **pass**
- Gated band: **Strong Go**
- Dimension caps: none
- Stability: **fragile**
- Decision type: **organic push**

Why fragile:

- The adjusted score is exactly **85**, the lower edge of Strong Go.
- Brand Safety remains **50**.
- Creative Feasibility is still assumption-based.
- One key commercial/timing source is supplier-owned category research, now encoded as
  secondary with a medium-confidence cap.

## Recommendation

Proceed with an organic launch test:

- Position as "daily protein convenience", not diet magic.
- Lead with 15g protein, chilled convenience, and familiar flavors.
- Use convenience-store discovery and office/light-fitness routine content.
- Avoid meal replacement, rapid fat loss, or medicalized metabolism claims.

The strongest campaign line:

**Not a gym supplement. A daily protein drink.**
