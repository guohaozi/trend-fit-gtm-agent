---
name: trend-shortlist
description: "Given one product and several candidate trends (3-5, entered manually), score each with trend-product-fit, gather real evidence to adjust the scores, rank the trends by evidence-adjusted fit, and return the single best trend's full GTM brief plus a one-line verdict for the rest. Use when the user has a product and wants to know WHICH of several trends to ride, not just whether to ride one. This is the 'middle version' agent workflow between manual single-trend scoring and fully automatic trend discovery."
---

# Trend Shortlist — pick the best trend for a product

The single-trend skill answers *"should we ride THIS trend?"*. This skill answers the
question a GTM lead actually asks: *"here are five trends on my radar — which one is
worth my next campaign?"* It is the **middle version** of the agent: still
human-curated trends in, but real evidence and ranking automated.

```
Product profile  +  3-5 candidate trends (manual)
        │
        ├─ for each trend:  trend-product-fit  → assumption baseline score
        ├─ for each trend:  competitor-evidence → evidence items
        ├─ for each trend:  evidence_model      → evidence-adjusted score + band + confidence
        │
        ├─ RANK trends by evidence-adjusted fit
        └─ OUTPUT: ranked table + winner's full GTM brief + one-line why-not for the rest
```

This is what turns the project from a demo into an actual agent workflow.

---

## Inputs
- **One product profile** (same shape as `trend-product-fit`).
- **3-5 candidate trends** (same shape as a single Trend Input each). Do not exceed ~5;
  beyond that, evidence gathering gets expensive and the ranking loses focus.
- Optional: `riskTolerance` from the product profile (drives overrides per trend).

If the user gives more than 5, ask which 5 matter most, or take the first 5 and say so.

---

## Process (per trend, then across)

### Step 1 — Baseline score each trend
Run [`trend-product-fit`](../trend-product-fit/SKILL.md) on each (product × trend) pair to
get the 7 assumption anchors and a baseline band. This is fast and needs no tools.

### Step 2 — Gather evidence for each trend
Run [`competitor-evidence`](../competitor-evidence/SKILL.md) per trend. Prioritize the
dimensions most likely to move a ranking decision:
- **Timing & Saturation** — is it rising or past peak? (Google Trends via
  `seo-keyword-research`; competitor activity volume.)
- **Brand Safety** — any documented controversy? (This can trigger an override and sink a
  high scorer — check it for every trend.)
- **Audience / Use-case / Commercial** — do competitors already ride it to this audience?

Budget rule: spend evidence effort where trends are **close** in baseline score. Don't
deep-research a clear No-go.

### Step 3 — Adjust scores
Apply [`evidence_model`](../trend-product-fit/evidence_model.md) to convert evidence items
into anchor-step adjustments. Each trend now has an **evidence-adjusted total, band, and
per-dimension confidence**.

### Step 4 — Rank
Sort the trends by, in order:
1. **Final band** priority: Strong Go > Go > Cautious test > Weak fit > No-go (after
   overrides). A trend whose Brand Safety evidence triggered an override drops here,
   regardless of raw total.
2. **Evidence-adjusted display total** (descending).
3. **Mean dimension confidence** (descending) — when two trends tie on score, prefer the
   one whose score we actually have evidence for. An assumption-only 80 ranks below an
   evidence-confirmed 80.
4. **Lower saturation risk** (higher Timing & Saturation score) as the final tie-break.

### Step 5 — Output
```markdown
## Trend shortlist for {Product}

| Rank | Trend | Baseline | Evidence-adj | Band | Confidence | One-line verdict |
|------|-------|----------|--------------|------|------------|------------------|
| 1 | … | 90 | 88 | Strong Go | high | Best fit; ride with X angle. |
| 2 | … | 84 | 72 | Go | medium | Viable but late — saturated. |
| 3 | … | 78 | 55 | Cautious | high | Skip: documented brand-safety risk. |
| … |

### Why #1 wins
{2-3 sentences: what the evidence confirmed/revised and why it beat #2.}

### Recommended campaign — {winning trend}
{The winner's FULL GTM brief, via trend-product-fit §1-12, on evidence-adjusted scores.}

### The rest, briefly
- **{Trend 2}** — {one line: the single reason it's not #1.}
- **{Trend 3}** — {one line.}
```

Only the winner gets a full brief. The others get one honest line each — usually the
single dimension or risk that knocked them down.

---

## Rules
- **Rank on evidence-adjusted, not baseline.** The whole value is that evidence reorders
  the list — a trend that looked great on assumptions can fall when the data comes in.
- **Overrides beat totals.** A documented brand-safety problem caps or sinks a trend even
  if its raw score is highest. Surface the override reason in the verdict.
- **Confidence is a ranking signal, not decoration.** Reward trends whose scores are
  evidenced over trends scored on vibes.
- **No fabricated evidence, ever.** Same discipline as the rest of the project: every
  adjustment traces to a sourced evidence item or it doesn't happen. A trend with no
  evidence simply keeps its assumption baseline and is labelled as such.
- **Be willing to recommend "none of these."** If every trend lands at Weak fit / No-go
  after evidence, say so and explain what kind of trend *would* fit.

---

## Quality bar
- [ ] Every trend has a baseline and an evidence-adjusted score (or is labelled assumption-only).
- [ ] Ranking respects overrides, then adjusted total, then confidence.
- [ ] The winner's brief uses the evidence-adjusted scores, not the baseline.
- [ ] Each non-winner has a specific one-line reason (a dimension or a risk), not a generic dismissal.
- [ ] No invented metrics; every score change cites an evidence item.
