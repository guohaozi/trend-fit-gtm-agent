# Scoring Rubric — anchored 0 / 25 / 50 / 75 / 100

Score every dimension on these five anchors only. If a case sits between two anchors,
pick the lower one and explain the gap — disciplined scoring beats generous scoring.
Each score needs a one-line reason grounded in the Product Profile + Trend Input (or a
labelled `Assumption:`). Never anchor a score to a metric you did not measure.

Weights (fixed): Audience 20 · Use-case 20 · Bridge 15 · Creative 15 · Commercial 10 ·
Brand Safety 10 · Timing 10.

---

## 1. Audience Overlap (20%)
*Does the trend's audience overlap the product's target customer?*

| Score | Anchor |
|-------|--------|
| 0 | Different audience entirely (e.g. teen dance trend vs. enterprise buyer). |
| 25 | Small fringe overlap; the core audiences barely touch. |
| 50 | Partial overlap; the trend skews to an adjacent segment you could reach. |
| 75 | Strong overlap; most of the trend's audience plausibly fits the ICP. |
| 100 | The trend's audience *is* the target customer — same age, region, mindset. |

Judge on age, region/market, gender skew, interests, and buyer role. State which
dimensions match and which don't.

---

## 2. Use-case Relevance (20%)
*Can the product participate naturally, or does it have to be shoe-horned in?*

| Score | Anchor |
|-------|--------|
| 0 | No honest way to feature the product; pure hijack. |
| 25 | Product can appear only as a forced prop. |
| 50 | Product fits a sub-case of the trend with some stretch. |
| 75 | Product is a natural participant in the trend's core activity. |
| 100 | The product *is* a way to do the trend — it solves the exact thing the trend is about. |

The test: could a real user feature this product in a trend video without the comments
calling it an ad? If no, you're below 50.

---

## 3. Message Bridge (15%)
*Is there a clean bridge from the trend to a real selling point?*

| Score | Anchor |
|-------|--------|
| 0 | No connection between the trend's meaning and any selling point. |
| 25 | Bridge requires a logical leap most viewers won't make. |
| 50 | A workable bridge exists but needs careful framing. |
| 75 | One obvious, honest line connects trend → benefit. |
| 100 | The trend's core message and a top selling point are the same idea. |

Write the actual bridge sentence when scoring ≥ 50. If you can't write it, score ≤ 25.

---

## 4. Creative Feasibility (15%)
*Can we produce good content in the trend's native format with reasonable effort?*

| Score | Anchor |
|-------|--------|
| 0 | Format is impossible/illegal/off-brand to produce (e.g. needs a celebrity, a stunt you can't do). |
| 25 | Producible only with high budget, long lead time, or rare assets. |
| 50 | Producible but generic; hard to stand out. |
| 75 | Easy to produce distinctive content with existing assets/team. |
| 100 | Trivial to produce native, distinctive content fast and repeatably. |

Consider format (UGC video, before/after, voiceover, photo), assets on hand, and speed.

---

## 5. Commercial Intent (10%)
*Is the audience in a buying / trial / inquiry mindset on this trend?*

| Score | Anchor |
|-------|--------|
| 0 | Pure entertainment; zero purchase context. |
| 25 | Awareness only; conversion would be far downstream. |
| 50 | Some shopping/intent signal (people ask "where to buy?"). |
| 75 | Strong intent; the trend is adjacent to a buying decision. |
| 100 | Transactional trend (hauls, reviews, "link in bio", before/after of a paid result). |

---

## 6. Brand Safety (10%)
*Vulgar, political, controversial, legal, or values risk? (Higher = safer.)*

| Score | Anchor |
|-------|--------|
| 0 | Trend is built on content that would damage the brand (NSFW, hate, illegal, scam-adjacent). |
| 25 | Significant controversy/values risk; easy to offend a core segment. |
| 50 | Mixed; safe only with careful guardrails and copy review. |
| 75 | Largely safe; minor tone risks manageable with words-to-avoid. |
| 100 | Wholesome/neutral; no realistic reputational downside. |

Remember the **override**: Brand Safety ≤ 25 caps the recommendation at "Cautious
test"; with low risk tolerance and Brand Safety < 50 → No-go. Cross-reference
[`risk_taxonomy.md`](risk_taxonomy.md).

---

## 7. Timing & Saturation (10%)
*Early enough to matter, or already over-crowded?*

| Score | Anchor |
|-------|--------|
| 0 | Trend is dead or every competitor already did it; you'd be last and late. |
| 25 | Late stage; heavily saturated, declining attention. |
| 50 | Mature but still active; need a differentiated take to cut through. |
| 75 | Growing; room to enter with a clear angle. |
| 100 | Early/rising; first-mover advantage in your category still available. |

If you lack real recency data, say so and reason from the trend description; don't
invent a "peaked 3 weeks ago" timeline.

---

## Worked weighting example (single deterministic result)

Apparel × quiet luxury (the shipped `demo_fashion` case):
Audience 100·0.20=20.0 · Use-case 100·0.20=20.0 · Bridge 100·0.15=15.0 ·
Creative 100·0.15=15.0 · Commercial 75·0.10=7.5 · Brand Safety 50·0.10=5.0 ·
Timing 75·0.10=7.5 → **raw 90.00 → display 90 → Strong Go** (Brand Safety 50 is the
gating risk → lead the brief with classism guardrails).

**Rounding is deterministic: round half up** (`floor(raw + 0.5)`). The displayed total
is always one integer — never a range. Tune component scores to evidence; don't
reverse-engineer a target number, and never use an off-anchor value (e.g. 85) to hit a
desired total.

---

## Product-type adaptations

The dimensions are universal; what counts as "high" shifts by product type. Apply
these lenses when scoring.

### Apparel / consumer fashion
- **Audience & Creative** carry the day — fashion trends are visual and identity-driven.
- Use-case is usually high (clothes belong in outfit/aesthetic trends).
- Watch **Brand Safety**: aesthetic trends often carry class, body-image, or
  cultural-appropriation landmines. "Quiet luxury" → classism; "clean girl" →
  ethnic-erasure critiques. Score Brand Safety honestly.
- Commercial Intent is often moderate-high (outfit trends drive shopping).

### Robotics / hardware / smart home
- **Message Bridge & Brand Safety** are the swing dimensions. Hardware claims must be
  demonstrable; over-promising autonomy or "it replaces a person" is both a risk and a
  weak bridge.
- Creative Feasibility can be lower — hardware demos need real working units, longer
  shoots, and "does it actually work?" scrutiny in comments.
- Privacy/surveillance and reliability are the dominant risks → reflect in Brand Safety.
- Commercial Intent often high (considered purchase, people research before buying).

### AI tools / software / apps
- **Use-case Relevance & Creative Feasibility** dominate — before/after and "watch me
  do X in seconds" formats are native and cheap to produce.
- Message Bridge is usually strong if the trend is about a task the tool performs.
- Brand Safety risks: fakeness/deception (fake identity, unrealistic results),
  misinformation, "AI slop" backlash, and over-claiming. Score accordingly.
- Timing matters a lot — AI trends saturate fast.

### B2B SaaS
- **Audience Overlap is the gate.** Most consumer social trends score 0–25 here; the
  buyer (ops lead, eng manager, CFO) is not the trend's audience. Be willing to score
  low and recommend No-go.
- When a trend *is* B2B-relevant (a workflow meme, a "tools I use" format, a
  founder/builder narrative on X/LinkedIn), Audience and Commercial Intent can be high.
- Creative Feasibility is often lower (less native short-form muscle) but Message
  Bridge can be very high for genuinely relevant trends.
- Brand Safety risk is usually low; the bigger failure mode is *cringe* — a serious B2B
  brand doing a teen trend reads as try-hard. Treat cringe as a Use-case/Creative
  penalty.
