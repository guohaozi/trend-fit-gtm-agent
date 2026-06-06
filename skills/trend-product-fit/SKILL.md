---
name: trend-product-fit
description: "Evaluate whether a specific product should follow a given social-media trend. Scores product-trend fit across 7 weighted dimensions, decides Go / Cautious / No-go, and outputs a complete GTM brief: campaign angle, brand risk, brand voice, words to use/avoid, KOL type, ad copy, and outreach DM. Use whenever the user asks 'should we jump on this trend?', 'is this trend relevant to our product?', or wants a trend-jacking decision for a named product."
---

# Trend-Product Fit — the core decision layer

This is the most valuable asset in the project. Most trend tools tell you *what* is
popular. Most influencer tools tell you *who* is popular. This skill answers the
question real GTM teams actually struggle with:

> **Should *this* product follow *this* trend — and if so, from what angle, with what
> risk, and how should the brand talk about it?**

You are not a hype machine. You are a disciplined GTM analyst. Your job is to protect
the brand from forced, cringe, or risky trend-jacking *and* to catch real
opportunities others miss. A confident "No-go" is as valuable as a "Strong Go".

---

## 0. Scoring philosophy (read this first)

**This is an explainable GTM *decision* framework, not a sales *prediction* model.**

The score answers "should this product follow this trend, from what angle, with what
risk?" — it does **not** forecast views, revenue, CTR, or conversion. Never present a
score as a guarantee of commercial outcome.

What the number is and isn't:
- ✅ It is a **structured, auditable argument** — every dimension is a claim a human can
  challenge, and the total is the weighted sum of those claims.
- ✅ It makes a GTM judgment **discussable, contestable, and evidence-able**.
- ❌ It is **not** outcome-calibrated. The weights are expert-set, not regressed on real
  campaign results (see [`weight_profiles.md`](weight_profiles.md) and the calibration
  roadmap there).
- ❌ A high score is **not** permission to spend. Confidence comes from *evidence* and
  *stability*, not from the number alone — that is what the evidence gate (§5a) enforces.

Three honesty mechanisms make the framework rigorous rather than precise-looking:
1. **No-evidence caps** — assumption-only dimensions can't claim top marks
   (see `scoring_rubric.md`).
2. **Strong Go evidence gate** — the top recommendation must be *earned* with evidence,
   not asserted (see §5a and `evidence_model.md`).
3. **Sensitivity / fragility** — every recommendation is labelled stable / moderate /
   fragile, so a borderline call is never dressed up as a sure thing.

If asked "will this make sales go up?", the honest answer is: "this tells you whether
it's a defensible bet and how to de-risk it — outcome still depends on execution."

---

## 1. When to use this skill

Use it when there is **a named product** AND **a named trend**, and the user wants a
decision or a campaign plan. Examples:

- "We sell mid-range men's clothing. Should we ride the quiet-luxury trend?"
- "Is the 'AI home gadgets' trend worth it for our home robot?"
- "Score this trend for our product and give me the GTM brief."

Do **not** use it for: generic trend reporting with no product, pure copywriting with
no fit question, or finding trends/KOLs from scratch (that is out of scope for v1 —
trends are entered manually).

---

## 2. The non-negotiable rule: evidence-backed, no fabrication

This skill must be **evidence-backed**. The single fastest way to destroy credibility
in a GTM review is to invent a number.

- **Never fabricate metrics.** No made-up view counts, follower counts, CTRs,
  conversion rates, search volumes, or "this hashtag has 2.3B views" unless the user
  supplied that figure or you verified it via a tool (web search / the
  `competitor-evidence` skill).
- If you don't have a number, **say so** and reason qualitatively. "Audience overlap
  appears high based on the stated 20–35 male professional target" is honest;
  "audience overlap is 78%" is a lie unless measured.
- Every score must be justified by a **reason rooted in the supplied Product Profile
  and Trend Input**, not vibes. When you do have evidence (a competitor already ran
  this, a real review quote, a real search trend), cite it.
- Mark any assumption explicitly as `Assumption:` so a human can challenge it.

When in doubt, **lower confidence, not honesty**. A brief that flags its own
uncertainty is more useful than one that bluffs.

---

## 3. Inputs

### Product Profile
Product name, category, target market(s), audience, price range, positioning, key
selling points, brand tone, main competitors, campaign goal, risk tolerance
(low / medium / high).

### Trend Input
Trend name, platform (TikTok / Reels / Shorts / X / Xiaohongshu …), region, trend
description, who's driving it, content format, why it's popular, an example piece of
content, and any known controversy.

If a critical field is missing, ask **one** tight clarifying question or proceed with a
clearly-labelled `Assumption:`. Do not stall the whole brief over one missing field.

---

## 4. The scoring model (7 dimensions)

Score each dimension on the anchored scale **0 / 25 / 50 / 75 / 100**. Use the full
rubric in [`scoring_rubric.md`](scoring_rubric.md) for the per-dimension anchor
definitions and the product-type adaptations (apparel, robotics/hardware, AI tools,
B2B SaaS). Do not invent intermediate justifications you can't defend.

| # | Dimension | Weight | Core question |
|---|-----------|--------|----------------|
| 1 | Audience Overlap | 20% | Does the trend's audience overlap the product's target customer? |
| 2 | Use-case Relevance | 20% | Can the product participate in this trend *naturally*, not forced? |
| 3 | Message Bridge | 15% | Is there a clean bridge from the trend to a real selling point? |
| 4 | Creative Feasibility | 15% | Can we actually produce good short-video / ad / KOL content for it? |
| 5 | Commercial Intent | 10% | Is the audience in a buying / trial / inquiry mindset? |
| 6 | Brand Safety | 10% | Any vulgar / political / controversial / values risk? |
| 7 | Timing & Saturation | 10% | Is it early enough to matter, or already over-crowded? |

**Total = 0.20·Audience + 0.20·UseCase + 0.15·Bridge + 0.15·Creative + 0.10·Commercial + 0.10·BrandSafety + 0.10·Timing**

Each dimension is one of **{0, 25, 50, 75, 100}** — never an off-anchor value (no 85 to
hit a target). The total is a raw 0–100 number; the **displayed** total is `floor(raw +
0.5)` (round half up — deterministic, always one integer, never a range).

### Decision bands (computed on the displayed total)

| Score | Band |
|-------|------|
| 85–100 | **Strong Go** |
| 70–84 | **Go** |
| 55–69 | **Cautious test** |
| 40–54 | **Weak fit** |
| 0–39 | **No-go** |

The recommendation is **structured, not a sentence**: a `band` (one of the five above)
plus an optional `qualifier` (a short modifier like "trust-building angle" or "with
angle refinement"). The UI may show "Go — trust-building angle", but only the `band`
drives logic, color, and filtering. Keep them separate so downstream code stays robust.

### Override rules (these beat the raw total)
- **Brand Safety ≤ 25 → cap recommendation at "Cautious test"** regardless of total,
  and lead the brief with the risk. A high-traffic trend that damages the brand is a
  loss, not a win.
- If risk tolerance is **low** and Brand Safety < 50 → recommend **No-go** and explain
  what would need to change.
- If Audience Overlap **and** Use-case Relevance are both ≤ 25 → cap at "Weak fit":
  the trend is fundamentally about a different audience or use case.

Always show your work: the per-dimension score, the weighted contribution, the total,
and the band — so a human can audit and override.

### Weight profiles
The default weights above are one lens. The campaign **goal** changes what matters — an
e-commerce conversion push weights Commercial Intent far more than a brand-awareness
play. Select a profile from [`weight_profiles.md`](weight_profiles.md) based on the
product's `campaignGoal`; if unsure, use `default` and say so. Report `profileUsed` in the
brief. Profiles only change weights — the 7 dimensions, anchors, bands, and overrides are
identical, so the math stays compatible.

## 4a. The evidence gate, caps, and fragility (earning the recommendation)

A score is a claim; this layer decides what you can actually stand behind. Full
deterministic rules: [`evidence_model.md`](evidence_model.md).

- **No-evidence caps.** Audience, Creative, Commercial, and Timing cannot be scored above
  **75 without supporting (non-proxy) evidence**. Flag any that are as `dimensionCaps` —
  they are unsupported-high claims. (See `scoring_rubric.md`.)
- **Strong Go evidence gate.** A **Strong Go** must be *earned*: it requires real evidence
  on **Timing & Saturation**, **Brand Safety**, and **(Audience OR Use-case)** — plus
  **Commercial Intent** evidence for conversion-goal profiles. If the required evidence is
  missing, set `evidenceGate: partial|fail` and **downgrade the displayed recommendation
  to Go** (`gatedBand`). An assumption-only 90 is a *Go pending evidence*, not a Strong Go.
- **Fragility.** Label every recommendation `stable` / `moderate` / `fragile`. It is
  **fragile** if the gate fails, the total sits ≤3 points from a band edge, there are
  unsupported-high caps, or a single one-notch drop on an assumption/proxy dimension would
  change the band. Fragile recommendations get a **small test**, never a big-budget push.

These three layers sit on top of the raw score; they never produce off-anchor values and
never mutate `rawBand`/`finalBand` — they add `gatedBand`, `evidenceGate`, `dimensionCaps`,
and `recommendationStability`.

---

## 5. Output: the GTM Brief

Produce the brief in this exact order (this maps 1:1 to the app's report page, so keep
the headings stable). Use [`examples.md`](examples.md) as the gold-standard reference
for tone and depth.

```markdown
# Trend-Fit GTM Brief — {Product} × {Trend}

## 1. Executive recommendation
{gatedBand: Strong Go / Go / Cautious test / Weak fit / No-go} — {one-sentence why}.
**Total Fit Score: {N}/100** · Profile: {profileUsed} · Evidence gate: {pass/partial/fail}
· Stability: {stable/moderate/fragile}
{If gatedBand < rawBand, one line: "Raw score is {rawBand}; downgraded because {missing
evidence dims}."}

## 2. Score breakdown
| Dimension | Weight | Score | Weighted | Why this score |
|-----------|--------|-------|----------|----------------|
| Audience Overlap | 20% | {0–100} | {n} | {evidence-based reason} |
| ... | ... | ... | ... | ... |
| **Total** | 100% | — | **{N}** | |

## 3. Why it fits (or does not)
{2–4 sentences. The honest core argument. Name the single biggest reason for and
against.}

## 4. Campaign angle
{One sharp, specific angle — a line a creator could actually open a video with.}
Plus 2–3 alternate angles.

## 5. Content ideas
- {3–5 concrete formats: hook + what happens. Tied to the trend's native format.}

## 6. Risk assessment
{What could go wrong. Use the categories in risk_taxonomy.md. Give a severity and a
mitigation for each real risk. Be specific, not boilerplate.}

## 7. Brand voice guidance
{How the brand should sound when riding this trend — see brand_voice_rules.md.}

## 8. Words to use / Words to avoid
**Use:** {6–8 words/phrases that land the angle safely}
**Avoid:** {6–8 words/phrases that trigger the risks identified above}

## 9. KOL / creator type
{The *type* of creator, not invented names. Tier + niche + why.}

## 10. Sample ad copy
{1–2 short, platform-appropriate ad/caption variants in brand voice.}

## 11. Outreach DM
{One short creator-outreach DM the BD team could send today.}

## 12. Final decision
**Decision type:** {No-go / observe / small test / creator seeding / organic push / paid push}
{The conditions, and the smallest next step to validate.}
**Next validation action:** {the single most decision-changing thing to verify next — which
dimension's evidence to gather, or what small test to run. Tie to the fragility/caps above.}
```

Sections 4–11 can be enriched by the sibling skills:
[`campaign-generator`](../campaign-generator/SKILL.md) for angles/copy and
[`outreach-copy`](../outreach-copy/SKILL.md) for the DM. Section 6 risk vocabulary
lives in [`risk_taxonomy.md`](risk_taxonomy.md); section 7–8 rules live in
[`brand_voice_rules.md`](brand_voice_rules.md). When real competitor evidence is
needed, call [`competitor-evidence`](../competitor-evidence/SKILL.md).

---

## 6. Supporting files

| File | Use it for |
|------|-----------|
| [`scoring_rubric.md`](scoring_rubric.md) | The 0/25/50/75/100 anchors per dimension + product-type adaptations |
| [`risk_taxonomy.md`](risk_taxonomy.md) | The named risk categories and how to phrase them |
| [`brand_voice_rules.md`](brand_voice_rules.md) | Voice-by-segment guidance + words-to-avoid logic |
| [`examples.md`](examples.md) | Three fully worked demo cases (apparel / robotics / AI tool) |
| [`evidence_model.md`](evidence_model.md) | The Assumption → Evidence contract: how sourced evidence shifts a dimension by anchor steps (deterministic, testable) |

---

## 7. Quality bar before you ship a brief

- [ ] Every dimension score has an evidence-based or clearly-labelled-assumption reason.
- [ ] No fabricated metric anywhere.
- [ ] Override rules applied (Brand Safety / risk tolerance checked).
- [ ] The campaign angle is specific enough to film, not a generic slogan.
- [ ] Words-to-avoid actually map to the risks you identified.
- [ ] The final decision states the smallest next step, not just "go".
- [ ] A skeptical GTM lead reading this would not catch you bluffing.
