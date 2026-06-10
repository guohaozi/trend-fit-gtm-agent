# Evidence Case: Chinese EVs x Thailand urban family and commuter adoption

## Executive Read

Profile used: **ecommerce_conversion**.  
Baseline read: **83 / Go**.  
Evidence-adjusted read: **90 / Strong Go**.  
Gated recommendation: **Strong Go**, with **moderate** stability.  
Decision type: **organic push**.

This is one of the strongest commercial cases in the current set. Thailand already has
policy support, visible Chinese EV adoption, local production momentum, and a buyer pain
that is easy to explain: monthly running cost. The main risk is not demand. The main risk
is trust: resale value, charging access, price-war volatility, dealer service, and
post-purchase buyer confidence.

## Collector Notes

This case used the P5 evidence-case orchestrator:

1. Candidate sources were gathered through manual browser research fallback.
2. Research candidates were passed into `additionalCandidates`.
3. `orchestrateEvidenceCase()` called the existing project pipeline:
   `buildEvidenceDraft()` -> `generateEvidenceAdjustmentCaseFromDraft()`.
4. The case uses the `ecommerce_conversion` profile because the GTM motion is closer to
   dealer/test-drive conversion and purchase intent than broad awareness.

Important boundary:

- No direct Thai dealer CRM, test-drive booking, financing, or owner-review data was used.
- Policy and sales evidence is strong, but the campaign still needs localized charging,
  resale, warranty, and aftersales proof.

## Evidence Items

### Audience Overlap

- **Business Insider / Chinese EV brands in Thailand** — secondary, high confidence.
  Reports fast EV growth in Thailand and strong Chinese-brand share, confirming that the
  target buyers are already considering Chinese EVs.

Source: https://www.businessinsider.com/byd-saic-chinese-ev-makers-plot-world-takeover-2024-6

### Use-case Relevance

- **AP / Thailand EV incentives and 2030 production goal** — secondary, high confidence.
  Confirms Thailand is actively encouraging EV adoption and production, which supports
  urban family and commuter use cases.

Source: https://apnews.com/article/7dd2fafaea96e5eec19fadb06ee84b86

### Message Bridge

- **Business Insider / Chinese EV cost advantage** — secondary, high confidence.
  Supports a cost-of-ownership and price-performance message against Japanese ICE and
  hybrid alternatives.

Source: https://www.businessinsider.com/byd-saic-chinese-ev-makers-plot-world-takeover-2024-6

### Commercial Intent

- **Business Insider / Chinese EV sales share** — secondary, high confidence.
  Moves Commercial Intent from **75 -> 100** because the signal is actual vehicle sales,
  not just consumer curiosity.

Source: https://www.businessinsider.com/byd-saic-chinese-ev-makers-plot-world-takeover-2024-6

### Timing & Saturation

- **BYD Thailand local-production summary** — secondary, high confidence.
  The Rayong plant opening and local capacity support timing, while also confirming a
  crowded market where Chinese EV brands are no longer novel.

Source: https://en.wikipedia.org/wiki/BYD_Auto

### Creative Feasibility

- **AP / Bangkok Motor Show and dealer expansion** — secondary, high confidence.
  Makes the campaign mechanics concrete: test drives, family commute calculators,
  charging explainers, and showroom conversion content. Creative Feasibility moves
  from **50 -> 75**.

Source: https://apnews.com/article/7dd2fafaea96e5eec19fadb06ee84b86

### Brand Safety

- **AP / competitive Thailand EV market** — secondary, high confidence.
  Confirms Brand Safety at **50**. Buyer trust must be handled explicitly because price
  wars, resale value, charging access, aftersales, and dealer confidence are material.

Source: https://apnews.com/article/7dd2fafaea96e5eec19fadb06ee84b86

## Before / After

| Dimension | Baseline | Evidence-adjusted | Confidence | Why |
|-----------|----------|-------------------|------------|-----|
| Audience Overlap | 100 | 100 | evidence-confirmed (high) | Chinese EV buyers already exist in Thailand. |
| Use-case Relevance | 100 | 100 | evidence-confirmed (high) | Urban commuting and family vehicles fit EV adoption. |
| Message Bridge | 100 | 100 | evidence-confirmed (high) | Cost saving and price-performance are strong bridges. |
| Creative Feasibility | 50 | 75 | evidence-revised (high) | Test drives and comparison calculators are concrete. |
| Commercial Intent | 75 | 100 | evidence-revised (high) | Actual sales share supports purchase intent. |
| Brand Safety | 50 | 50 | evidence-confirmed (high) | Trust and aftersales risks remain material. |
| Timing & Saturation | 75 | 75 | evidence-confirmed (high) | Timing is strong, but the field is already crowded. |

## Rigor Layer

- Evidence gate: **pass**
- Gated band: **Strong Go**
- Dimension caps: none
- Stability: **moderate**
- Decision type: **organic push**

Why not "stable":

- Brand Safety remains **50**.
- EV decisions are high-ticket and financing-sensitive.
- Local dealer trust, service coverage, charging convenience, and resale proof still need
  direct validation.

## Recommendation

Proceed with a dealer/test-drive conversion motion:

- Lead with monthly ownership cost, not abstract sustainability.
- Build Thai-language cost calculators against Toyota / Honda ICE and hybrid models.
- Use owner proof, local service coverage, warranty clarity, and charging maps in every
  funnel step.
- Segment campaigns by family commuter, first car, and ride-hailing / fleet use.
- Avoid pure price-cut messaging; it can worsen resale and buyer-confidence concerns.

Strongest campaign line:

**Less fuel anxiety. More family budget back.**

## Next Evidence To Collect

1. Thai owner reviews and complaint themes by brand: BYD, MG, Neta, Tesla, and Toyota.
2. Dealer test-drive conversion rates and lead-to-booking cost.
3. Charging access by Bangkok / Chiang Mai commute patterns.
4. Financing, insurance, and resale-value comparisons.
5. Post-purchase satisfaction after major price cuts or new model launches.
