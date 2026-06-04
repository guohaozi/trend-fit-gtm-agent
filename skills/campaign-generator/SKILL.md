---
name: campaign-generator
description: "Turn an approved trend-fit decision into executable creative: campaign angles, content ideas in the trend's native format, sample ad copy, and brand-voiced captions. Use after trend-product-fit returns Go / Cautious test, to populate sections 4, 5, and 10 of the GTM Brief. Respects the brand voice and words-to-avoid produced by the fit analysis."
---

# Campaign Generator — from decision to filmable creative

Once [`trend-product-fit`](../trend-product-fit/SKILL.md) says "ride this trend", this
skill produces the creative the GTM Brief promises: **campaign angles (§4), content
ideas (§5), and sample ad copy (§10)**. It does **not** re-decide whether to ride the
trend — that's already settled. If the fit verdict is No-go / Weak fit, stop and say so.

## Inputs it expects
- The fit decision + score breakdown.
- The **campaign angle** seed, **brand voice**, and **words-to-use / words-to-avoid**
  from the fit brief. Honor them strictly — these encode the risk guardrails.
- Platform + format of the trend (so creative is native, not repurposed).

---

## Rules

1. **Native format first.** Match the trend's actual format (before/after, POV
   voiceover, day-in-the-life, duet, photo carousel). Off-format creative reads as an
   ad and dies.
2. **Honor the word lists.** Never use a banned word; lean on the words-to-use. Every
   risk the fit brief named must stay avoided in the copy.
3. **Specific over clever.** A hook a creator could film today beats a polished slogan.
   Write hooks as the first line of a video, not as headlines.
4. **No fabricated proof.** No invented stats, fake testimonials, or claims the product
   can't back (especially for hardware/AI — see the over-promising risk).
5. **One clear CTA per asset**, appropriate to commercial intent (soft: "link in bio";
   hard: "20% off today").
6. **Run final copy through `human-tone`** (installed skill) so it doesn't read as AI
   marketing boilerplate.

---

## What it produces

```markdown
## Campaign angles
- **Primary:** {sharpest angle — the one filmable line}
- **Alt A / Alt B:** {two more, different emotional hooks}

## Content ideas (native to {platform/format})
1. {Format} — Hook: "{first line}" → {what happens} → {CTA}
2. ...
(3–5 ideas, each tied to the trend's format and a specific selling point)

## Sample ad copy
- **Caption v1 (organic):** {short, brand voice, words-to-use, 1 CTA}
- **Caption v2 (paid):** {tighter, conversion-led, still on-voice}
- **Hook bank:** {3–5 alternative opening lines for A/B testing}
```

---

## Quality bar
- [ ] Every asset is in the trend's native format.
- [ ] Zero banned words; brand voice consistent across all assets.
- [ ] Each hook is filmable, not a tagline.
- [ ] CTA matches the commercial-intent read.
- [ ] No unverifiable claims.
- [ ] Copy passes a "would a human creator actually say this?" check.
