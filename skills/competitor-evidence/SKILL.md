---
name: competitor-evidence
description: "Gather evidence-backed competitor intelligence to harden a Trend-Fit scoring decision. Pulls a competitor's positioning, channels, KOL/creator partners, ad angles, real user-review language, and price — with sources — so the fit score rests on facts, not guesses. Use when a trend-fit brief needs proof that competitors already did (or avoided) a trend, or when the user asks 'what are competitors doing with this trend?'."
---

# Competitor Evidence — the anti-hallucination layer

This skill exists to keep the Trend-Fit brief **honest**. The
[`trend-product-fit`](../trend-product-fit/SKILL.md) skill forbids fabricated metrics;
this is where the real evidence comes from. It feeds three things:

1. **Score justification** — "Audience Overlap is high" becomes "Competitor X runs this
   exact trend to the same 20–35 male audience (3 videos, source linked)".
2. **Saturation/Timing reality** — how many competitors already rode the trend.
3. **Risk evidence** — real user-review quotes that reveal where the trend backfired.

## Relationship to the installed `product-swipefile` skill

The repo ships the open-source **`product-swipefile`** skill (`.claude/skills/
product-swipefile/`), a deep evidence-first product-research engine ("先证据、后写作").
**Prefer it** for any full competitor teardown:

- If `product-swipefile` is available, invoke it to produce the deep teardown, then
  distill its output into the compact evidence block below.
- If it is not available, run the lightweight protocol here using web search + the
  `gooseworks` data skill for social/review data.

This skill is the *adapter*: it shapes competitor research specifically for the
trend-fit decision, rather than a general product report.

---

## The discipline (non-negotiable)

- **Every claim carries a source** (URL, platform handle, or "user-supplied"). No
  source → it's an `Assumption:`, labelled as such, not a fact.
- **Quote real review language verbatim** where possible — it's the highest-signal
  evidence for risk and messaging, and it can't be faked convincingly.
- **No invented numbers.** If you can't verify follower/view/price figures, report the
  qualitative signal and say the number is unverified.
- Prefer **3 solid, sourced findings over 10 vague ones.**

---

## What to collect (evidence block schema)

For each relevant competitor (cap at the top 3 for a trend decision):

```markdown
### Competitor: {name}  ({url})
- **Positioning:** {how they describe themselves — quote the tagline} [source]
- **Target audience:** {who they target} [source/inference]
- **Channels:** {where they're active — IG/TikTok/YouTube/Amazon/etc.} [source]
- **On THIS trend:** {Yes/No — did they ride it? how many pieces? what angle?} [source]
- **KOL / creators used:** {types/handles of creators they partner with} [source]
- **Ad / content angles:** {1–3 angles they actually run} [source]
- **Real user-review language:** "{verbatim quote}" — {platform, what it reveals} [source]
- **Price point:** {price / tier} [source] (mark "unverified" if not confirmed)
```

Every finding you intend to use as a score input must be emitted as a typed evidence item
(per [`evidence_model.md`](../trend-product-fit/evidence_model.md) §2/§3a) carrying:
`dimension`, `direction`, `magnitude`, `confidence`, **`sourceTier`** (primary/secondary/
proxy), `sourceUrl`. A finding with no `sourceTier` is not usable for scoring.

**Hard rule — do not launder source strength:**
- A **listicle / affiliate / SEO blog** is `proxy`. It gives *direction*, never proof,
  and **cannot** be used to claim Commercial Intent or Audience Overlap as measured
  purchase/audience behavior. "Lots of 'affordable dupe' listicles" is a saturation
  signal, not a "people are buying" signal.
- Reserve `primary` for raw platform data, a real review/comment corpus, named-expert
  quotes, or directly-observed campaigns. When unsure, downgrade the tier.

Then a synthesis:

```markdown
### Evidence synthesis for the trend decision
- **Saturation read:** {N of 3 competitors already on this trend → Timing score input}
- **Audience confirmation:** {does competitor activity confirm/deny audience overlap?}
- **Winning angle observed:** {the angle that's working, if any}
- **Risk evidence:** {review quotes showing where the trend/category backfires}
- **White space:** {an angle no competitor has taken yet}
```

---

## How it plugs into the fit score

| Evidence finding | Feeds dimension |
|------------------|-----------------|
| Competitors target the same audience on this trend | Audience Overlap |
| Competitors feature the product type natively in the trend | Use-case Relevance |
| A clear winning angle already exists | Message Bridge |
| Review quotes show backlash (privacy, fakeness, classism) | Brand Safety (lower it) |
| Many competitors already rode it | Timing & Saturation (lower it) |
| "Where to buy?" comments under competitor trend videos | Commercial Intent (raise it) |

Hand the synthesis back to `trend-product-fit` so each affected score cites the
evidence.

---

## Output

Return the per-competitor evidence blocks + the synthesis. Keep it tight enough to drop
into the "Why it fits" and "Risk" sections of the GTM Brief. Always end with a
**confidence note**: which findings are sourced vs. assumed.

## Worked real example

[`outputs/demo_fashion_evidence_case.md`](../../outputs/demo_fashion_evidence_case.md)
is this skill run for real (via web research) on the quiet-luxury case. It shows the
full Assumption → Evidence upgrade: evidence blocks with cited sources, a synthesis, a
dimension-by-dimension before/after table, and the recomputed score (90 → 88). Use it as
the template for what "evidence-backed" output looks like in practice.

**Structured output:** the evidence items must be emitted in the typed form defined by
[`evidence_model.md`](../trend-product-fit/evidence_model.md) (each item tags a
`dimension`, `direction`, `magnitude`, `confidence`, `sourceTier`, `sourceUrl`) so the
score adjustment is deterministic, not prose. See
[`data/demo_fashion_evidence.json`](../../data/demo_fashion_evidence.json) for the machine
form of the case above.
