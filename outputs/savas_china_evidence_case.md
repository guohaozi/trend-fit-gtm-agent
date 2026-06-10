# Evidence Case: Meiji SAVAS Milk Protein x high-protein convenience routines in China

## Executive Read

Baseline read: **78 / Go**.  
Evidence-adjusted read: **83 / Go**.  
Gated recommendation: **Go**, but **fragile**.  
Decision type: **small test**.

This is a useful first evidence case because it refuses the easy answer. SAVAS has a
strong Japan RTD protein format and the China health/fitness audience is real, but the
public evidence gathered here does **not** yet prove a China-specific ready-to-drink
protein beverage breakout. The right next move is a controlled category-education test,
not a broad paid push.

## Collector Notes

This case used the P5 evidence-case orchestrator:

1. Candidate sources were gathered through manual browser research fallback.
2. Research candidates were passed into `additionalCandidates`.
3. `orchestrateEvidenceCase()` called the existing project pipeline:
   `buildEvidenceDraft()` -> `generateEvidenceAdjustmentCaseFromDraft()`.
4. The project source-tier classifier downgraded Meiji-owned pages to proxy even though
   they are strategically useful.

Important boundary:

- No GooseWorks, OpenCLI, Xiaohongshu, Douyin, ecommerce, or Google Trends provider call
  was used in this run.
- Therefore Commercial Intent and Timing are **confirmed**, not upgraded.
- Creative Feasibility remains an assumption until creator/content performance evidence
  is collected.

## Evidence Items

### Audience Overlap

- **Frontiers / China adult fitness-monitoring context** — secondary, high confidence.
  Supports a wider health/fitness audience than only serious gym users, revising Audience
  Overlap from **75 -> 100**.

Source: https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2025.1578817/full

### Use-case Relevance

- **Meiji SAVAS protein page** — proxy, medium confidence.
  Confirms the ready-to-drink protein use case and the snack/post-workout format, but it
  remains proxy because it is vendor-owned.

Source: https://www.meiji.com/global/food/protein/

### Message Bridge

- **Meiji protein image story** — proxy, medium confidence.
  Supports the message bridge from athlete-only supplement to convenient daily protein,
  but this is brand-owned storytelling rather than market proof.

Source: https://www.meiji.com/global/wellness-stories/changing-protein-images.html

### Commercial Intent

- **Food & Wine / protein drinks trend coverage** — secondary, high confidence.
  Supports a broader protein-forward drink trend, but the evidence is not China-specific.
  Commercial Intent stays **75**, not 100.

Source: https://www.foodandwine.com/protein-coffee-trend-america-2026-11967536

### Timing & Saturation

- **The Guardian / global whey-protein demand coverage** — secondary, high confidence.
  Shows global protein demand is active enough to create supply pressure, but it does not
  prove China RTD timing. Timing stays **75**.

Source: https://www.theguardian.com/business/2026/jun/09/fears-whey-protein-shortage-weight-loss-drugs-global-demand

### Brand Safety

- **Harvard Health / protein supplement caution** — secondary, high confidence.
  Confirms Brand Safety at **50**: the category is workable, but protein and weight
  management claims need disciplined language.

Source: https://www.health.harvard.edu/diet-and-nutrition/the-hidden-dangers-of-protein-powders

## Before / After

| Dimension | Baseline | Evidence-adjusted | Confidence | Why |
|-----------|----------|-------------------|------------|-----|
| Audience Overlap | 75 | 100 | evidence-revised (high) | China fitness/health context supports a broader audience. |
| Use-case Relevance | 100 | 100 | evidence-confirmed (medium) | SAVAS RTD format fits the trend, but source is vendor-owned. |
| Message Bridge | 75 | 75 | evidence-confirmed (medium) | Daily-protein framing works, but demand evidence is still weak. |
| Creative Feasibility | 75 | 75 | assumption | No creator/content evidence yet. |
| Commercial Intent | 75 | 75 | evidence-confirmed (high) | Global protein drink trend exists, but China-specific buying evidence is missing. |
| Brand Safety | 50 | 50 | evidence-confirmed (high) | Health and weight-management claims require restraint. |
| Timing & Saturation | 75 | 75 | evidence-confirmed (high) | Global demand is active, but China RTD saturation is not proven. |

## Rigor Layer

- Evidence gate: **pass**
- Gated band: **Go**
- Dimension caps: none
- Stability: **fragile**
- Decision type: **small test**

Why fragile:

- Adjusted score is **83**, only two points below Strong Go.
- Brand Safety remains **50**.
- Creative Feasibility is still assumption-based.
- Commercial and Timing evidence are not China-specific enough to justify a broad push.

## Recommendation

Run a controlled China market test before scaling:

- Position around **daily protein convenience**, not weight-loss magic.
- Use office breakfast, post-light-workout, and convenience-store routine content.
- Avoid meal-replacement, rapid fat-loss, metabolism, or medicalized claims.
- Prioritize channels where protein-drink intent can be measured: ecommerce search,
  Xiaohongshu/Douyin comments, convenience-store sell-through, and creator test posts.

Strongest campaign line:

**Protein without the shaker.**

## Next Evidence To Collect

1. Xiaohongshu/Douyin comments for "蛋白饮", "高蛋白早餐", "减脂便利店".
2. Ecommerce search and review language for SAVAS, Keep, ffit8, Boohee, and high-protein
   yogurt/drinks.
3. Convenience-store product availability and pricing screenshots.
4. Creator examples with measurable engagement around protein breakfast or post-workout
   drink routines.
5. Competitor content saturation: how many brands already own the same "daily protein"
   angle in China.
