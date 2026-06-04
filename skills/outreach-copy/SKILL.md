---
name: outreach-copy
description: "Draft creator/KOL and BD outreach for an approved trend campaign: short, personalized DMs and emails that propose a collaboration tied to the specific trend and product. Use to populate section 11 (Outreach DM) of the GTM Brief, after trend-product-fit identifies the right creator type. Produces ready-to-send, non-spammy messages."
---

# Outreach Copy — turn the creator type into a sendable message

[`trend-product-fit`](../trend-product-fit/SKILL.md) §9 names the *type* of creator to
target (tier + niche). This skill writes the actual outreach: a DM the BD team could
send today, plus an email variant and a short follow-up. It fills **§11 of the GTM
Brief**.

## Inputs
- Creator type / niche from the fit brief (never invent specific creator names/handles
  unless the user or `competitor-evidence` supplied real ones).
- The campaign angle + brand voice.
- The collaboration ask (gifted product / paid / affiliate / co-create).

---

## Rules for outreach that doesn't get ignored

1. **Lead with them, not you.** Reference their actual content/niche in the first line.
   Use a `{personalization}` placeholder the BD rep fills per creator — never fake a
   specific compliment.
2. **Tie to the trend explicitly.** The reason-to-reach-out is *this trend × this
   creator's audience* — make that the hook.
3. **Short.** A cold DM is 3–5 sentences. One ask, one CTA. No paragraphs.
4. **Honest offer.** State the collaboration type plainly. No vague "let's collab".
5. **No spam tells.** No mass-blast phrasing, no fake urgency, no "Dear creator".
6. **Disclose paid partnerships** downstream (FTC) — note this in the brief.

---

## Output

```markdown
## Creator outreach
**Target type:** {tier + niche, from fit brief}

**DM (Instagram/TikTok):**
> Hey {name} — {personalized line about their content}. We're {brand}, and we're
> leaning into {trend} right now. {One line on why their audience fits.} Would you be
> up for {collab ask}? Happy to send {product} over — no strings if it's not a fit.

**Email variant:**
Subject: {trend} collab with {brand}?
> {2–3 sentence version of the DM, slightly more formal, with one concrete next step.}

**Follow-up (if no reply, +4 days):**
> {one-line, low-pressure nudge}
```

Keep placeholders explicit (`{name}`, `{personalized line}`) so reps personalize per
send instead of blasting. Run the final copy through `human-tone` so it reads like a
person, not a template.

## Quality bar
- [ ] First line is about the creator, not the brand.
- [ ] The trend tie-in is explicit and specific.
- [ ] Under ~5 sentences; one clear ask.
- [ ] No fabricated creator names or fake compliments.
- [ ] Doesn't read like a mass blast.
