# Evidence Case — AI photo tool x AI product-photo / headshot before-after (competitor layer)

This case adds a **competitor research layer** on top of the AI photo-tool demo.

It uses the same scoring and rigor engine as the other evidence cases, but the source
shape is different: inputs come from `competitor-profiling` / `product-swipefile` style
extracts rather than customer-language or keyword research.

## Why this case exists

The original AI-tool evidence case already proved the trend can earn Strong Go when
timing, brand safety, and audience/use-case evidence are present.

This competitor-layer case asks a narrower question:

> Are direct and adjacent competitors already using this trend, and does that change the
> timing or risk read?

## Workflow

1. Competitor profile / product-swipefile style extracts identify competitor activity.
2. `lib/competitor-research-provider.ts` converts those extracts into
   `EvidenceCandidate[]`.
3. `lib/evidence-collector.ts` applies source-tier rules.
4. `lib/evidence-case-generator.ts` computes the adjusted scores and rigor fields.

The provider does **not** assign final source strength by feel. Competitor-owned pages can
be proxy when used as positioning claims, while directly observed competitor campaigns can
serve as primary evidence for what competitors are actually doing.

## Competitor Findings

### Photoroom

- **Audience direction:** Photoroom positions AI product photography for ecommerce and
  online sellers. This supports audience direction, but remains proxy because it is
  competitor-owned copy.
- **Use-case evidence:** Photoroom directly markets AI product photography from product
  images, confirming that the before/after product-photo use case is native.
- **Message bridge:** Photoroom's AI background workflow bridges from a plain image to
  studio-like product visuals.

### Picsart

- **Use-case evidence:** PetaPixel covered Picsart's Smart Background feature for product
  photography, giving reputable secondary confirmation of the category use case.
- **Timing / saturation:** The same coverage frames AI product-photo background editing as
  part of a broader AI photo-editing race, reducing the timing score.

### Evoto

- **Brand-safety evidence:** Digital Camera World covered backlash and an apology around
  Evoto's AI Headshot Generator. This lowers the brand-safety read for AI portrait /
  headshot positioning.

## Score Movement

| Dimension | Baseline | After competitor evidence | Confidence | Why |
|-----------|----------|---------------------------|------------|-----|
| Audience Overlap | 100 | 100 | evidence-confirmed (medium) | Competitor copy supports audience direction, but it is proxy-tier. |
| Use-case Relevance | 100 | 100 | evidence-confirmed (high) | Photoroom and Picsart both show the AI product-photo use case. |
| Message Bridge | 100 | 100 | evidence-confirmed (high) | Photoroom validates the plain-photo to polished-asset message bridge. |
| Creative Feasibility | 100 | 100 | assumption | This case does not add production-test evidence. |
| Commercial Intent | 75 | 75 | assumption | This case does not include review/comment purchase-intent evidence. |
| Brand Safety | 75 | 50 | evidence-revised (medium) | Evoto backlash shows trust risk around AI headshots. |
| Timing & Saturation | 75 | 25 | evidence-revised (high) | Competitor activity shows the space is already crowded. |

## Recommendation After Evidence Gate

- Baseline total: **89 / Strong Go**
- Competitor-adjusted total: **85 / Strong Go**
- Evidence gate: **pass**
- Gated band: **Strong Go**
- Stability: **fragile**
- Decision type: **organic push**
- Dimension caps: **audienceOverlap**, **creativeFeasibility**

## Interpretation

Competitor evidence does not kill the trend. It changes the go-to-market posture.

The use case is real and competitors are already proving the content format. But that same
activity makes the trend more crowded, and Evoto shows that AI headshot positioning can
trigger trust backlash. The recommendation stays Strong Go, but fragile: use an organic
push with a differentiated trust angle, not a broad paid push.

The next validation action is to collect non-proxy audience evidence and production-test
creative feasibility, because those remain unsupported-high dimensions.
