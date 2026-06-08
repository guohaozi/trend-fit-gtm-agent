# Source-Tier Classifier — the honesty governor, made deterministic

`sourceTier` (`primary` / `secondary` / `proxy`) is the **only** field in the evidence
pipeline with no downstream math check. Everything after it — anchor steps, caps, gate,
fragility — is deterministic. So if the tier is judged optimistically, the whole chain is
silently poisoned and **the tests still pass** (tier is human input, not computed).

This file removes the discretion. Do **not** assign `sourceTier` from memory or feel.
Run this classifier as a literal checklist. The agent that *gathers* a source must not be
trusted to *grade it upward* — when in doubt, the rule forces the lower tier.

> This is the structural fix for the failure mode where vendor marketing pages were tagged
> `primary`. See the worked re-classification at the bottom.

---

## Step 1 — Verification gate (run BEFORE tiering)

A source cannot be tiered above `proxy` until its claim is verified:

1. **Fetch the URL** (WebFetch / browser). If it cannot be fetched/opened, the source is
   **unverified**.
2. **Confirm the cited claim actually appears** at that URL (the number, the quote, the
   fact). Paraphrase is fine; invention is not.
3. Outcome:
   - **Verified** → continue to Step 2.
   - **Unverified (couldn't fetch)** → cap at `proxy`, set `confidence: low`, and add
     `"UNVERIFIED"` to the note. It may supply direction only.
   - **Contradicted** (URL doesn't say what was claimed) → **drop the item entirely.**
     This is a fabrication risk — never keep it.

> An agent that cannot browse (e.g. a sandboxed Codex run) may **not** assert `primary`
> or `secondary`. No browse → no non-proxy evidence. Say so explicitly.

---

## Step 2 — Forced-proxy checklist (any YES → `proxy`, no exceptions)

If the source is **any** of the following, it is `proxy`. You may not upgrade it, no
matter how authoritative the brand feels:

- [ ] **Vendor copy** — a company's own marketing/product page describing its own product
      (e.g. `shopify.com/magic`, a tool's landing page, a "why choose us" page).
- [ ] **Vendor documentation** — a company's own help docs / knowledge base describing its
      own feature (e.g. `help.shopify.com/...`, `help.picsart.io/...`).
- [ ] **Listicle / affiliate / SEO content** — "best 10 X", "top dupes", roundups,
      coupon/affiliate pages.
- [ ] **Press release / sponsored / native ad** — PR Newswire, branded content.
- [ ] **Single social post or thread** (one Reddit thread, one tweet) used as a *measured*
      signal. (It may be `primary` **only** as raw user-language for Audience/Use-case at
      `confidence: medium` max — see Step 3 exception.)
- [ ] **Single anecdote / testimonial.**

Vendor sources are real *directional* signals ("the format is producible", "the workflow
exists") — but they are **the seller talking about themselves**. They cannot lift a
no-evidence cap and cannot count as measured demand or measured audience.

---

## Step 3 — If no forced-proxy box is checked, assign the earned tier

| Assign | Only if the source is… | Confidence ceiling |
|--------|------------------------|--------------------|
| **`primary`** | Raw platform data (Google Trends export, native analytics), a **real review/comment corpus** (many comments, not one), named-expert quotes in reputable press, or a **directly-observed competitor campaign**. | high |
| **`secondary`** | Reputable journalism / industry analysis summarizing data or trends; established research reports. | high (usually drives ≤1 step) |
| **`proxy`** | Everything in Step 2, or anything you're unsure about. | medium (half-weight) |

**Single-thread exception:** one Reddit thread / forum post may be tagged `primary` as
*raw user-language* evidence for `audienceOverlap` or `useCaseRelevance` **only**, and its
`confidence` is capped at `medium`. A single thread is never `primary` for measured
`commercialIntent` or `timingSaturation` — for those you need a corpus or platform data.

---

## Step 4 — The no-upgrade rule

- **Tie-breaker:** unsure between two tiers → pick the **lower** one. Under-claiming source
  strength is the safe error; over-claiming is the failure this file exists to prevent.
- **No manual override above the checklist.** If a reviewer wants a higher tier, they must
  supply a *different, qualifying* source — not re-label the same one.
- Record the deciding reason in the item's `note` (e.g. "vendor doc → proxy").

---

## Worked re-classification (the real bug this fixes)

The AI-tool case originally tagged three sources `primary`. Running the checklist:

| Source | Step 2 box | Correct tier | Consequence |
|--------|-----------|--------------|-------------|
| `shopify.com/magic` | Vendor copy ✅ | **proxy** | Was the *only* evidence for `creativeFeasibility = 100` → proxy can't lift the cap → `creativeFeasibility` is now correctly flagged in `dimensionCaps`. |
| `help.shopify.com/...` | Vendor documentation ✅ | **proxy** | Use-case is not a capped dimension, so 100 still allowed, but confidence drops high → medium. |
| `help.picsart.io/...` | Vendor documentation ✅ | **proxy** | `commercialIntent` stays above its cap on the **PetaPixel secondary** source, not this one. |

Sources that correctly stayed non-proxy (verified, not vendor): Accio (secondary),
PetaPixel (secondary, named survey), TechRadar / Digital Camera World (secondary). The
Strong Go gate is therefore still genuinely earned — the fix only removed the *inflated*
support, it didn't break the real support.

See [`data/demo_ai_tool_evidence.json`](../../data/demo_ai_tool_evidence.json) and
[`outputs/demo_ai_tool_evidence_case.md`](../../outputs/demo_ai_tool_evidence_case.md)
for the corrected case.
