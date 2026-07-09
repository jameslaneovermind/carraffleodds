# Homepage Visual Refresh Design

## Goal

Give the homepage (and by extension the shared header/logo) a more deliberate,
distinctive look without abandoning the "trustworthy, not hype-y" tone the
site depends on. Starting point was a three-way direction choice (Trusted
Comparison / Modern Automotive / Editorial), refined down to: keep the bold,
structured energy of "Modern Automotive" but recolour it onto the site's
existing blue palette, and fix the logo, which was flagged as looking amateurish.

This spec does not touch page copy, layout of sections below the hero, or any
other route — scope is the hero/header visual system and the logo.

---

## Visual direction

**Base: "B1 — Light Technical."** Same white background as today, same overall
page structure — no dark hero, no repaint of the whole site. What changes:
sharper corners (4px radius instead of the current 8–12px) and a more
structured, deliberate hierarchy in the hero than today's homepage has.

This was chosen over two alternatives considered and rejected:
- **"Modern Automotive" as originally mocked** (dark hero, amber accent) —
  rejected because the dark/amber combination reads closer to a promo or
  casino site, which conflicts with CLAUDE.md's "18+, honest, responsible"
  tone rule.
- **"Editorial/Data-led"** (warm off-white, green accent, serif headline) —
  viable but a bigger repaint of the existing blue-600 brand than necessary.

## Colour

- **Blue-600 (`#2563eb`) stays the primary UI colour** — buttons, links,
  primary CTAs — unchanged from the current site.
- **Gradients are allowed only in restrained, single-hue form**: a barely-there
  background wash (e.g. white → pale blue) or a one-hue button gradient
  (blue-600 → blue-700) with a soft shadow for lift.
- **Explicitly not allowed:** multi-hue/mesh gradients, gradient text,
  glassmorphism. These read as generic AI-generated template output ("AI
  slop") — the same category of tell as the Geist font, which is why the
  headline font is changing (see Typography).

## Orange / amber

Orange is not a new accent — it's already the brand-mark colour (the current
logo's dice icon, and the amber "Odds" in the wordmark) and already carries
meaning elsewhere on the site (star ratings, urgency states like "ending
today", skill-based competition badges). This refresh **restores and reuses**
that existing meaning on the homepage rather than inventing a new one:

- Logo mark: amber → orange gradient (unchanged intent from today).
- Wordmark: "CarRaffle" in slate-900, "Odds" in amber-600 (unchanged from today).
- Hero: star-rating and urgency-badge treatments may use the same amber/orange
  already used for those signals elsewhere in the app — nothing new invented.

Orange must **not** spread into new UI elements (secondary buttons, generic
decoration) — doing so would dilute it from "this always means rating/urgency/
brand" into "this is just a second accent colour," which is the thing we're
trying to avoid.

## Typography

- **Headings: Instrument Sans**, replacing the current heading font. Chosen
  over Geist (rejected — the single most common "default Next.js app" tell),
  Space Grotesk, and Bricolage Grotesque as the safest, most subtle
  "refinement rather than a statement" option.
- **Body text: Inter**, unchanged.
- **Space Grotesk** is retained, but narrowly — for uppercase nav links, tag
  chips, and button labels only. Never for headlines or body copy.

## Logo system

Two distinct assets, two distinct jobs — deliberately not interchangeable,
to avoid diluting brand recognition:

### 1. Single die — the brand mark
Used everywhere something needs to *identify* the site: nav header, favicon,
apple-touch-icon, any app-icon slot. One rounded-square die, amber→orange
diagonal gradient, five evenly-spaced pips in dark rust-brown, no drop shadow,
no 3D bevel. Replaces the current two-overlapping-dice mark, which was
reported as cluttered/amateurish and confirmed as such during review (uneven
overlap, inconsistent pip sizing).

Wordmark next to it is unchanged: "CarRaffle**Odds**" in Instrument Sans,
"Odds" in amber-600.

**Source asset:** AI-generated (OpenAI Playground), fixed for real alpha
transparency and saved to `~/Downloads/carraffleodds-logo-transparent.png`
(1254×1254px, RGBA). The original export had no alpha channel — it baked a
checkerboard pattern into the pixels instead of true transparency; this was
corrected via a flood-fill background removal before use.

### 2. Two dice — decorative motif only, not a logo
Used in large, one-off, supportive placements — homepage hero artwork next to
the headline, social share / og:image card, similar marketing contexts. Never
used anywhere that functions as a clickable "home" icon, and never at nav/
favicon size — its looser diagonal composition (roughly 25% of its square
canvas filled, vs. ~75% for the single die) reads as noticeably smaller and
less confident than the single die at small sizes, confirmed by rendering both
down to 40px and 16px for comparison.

At hero size (~170px) the composition holds up fine — the empty-corner issue
only bites at icon scale — but the source asset has a soft drop shadow that
needs removing before use, either via a regeneration with stronger "no
shadow" prompting or a manual touch-up pass.

**Source asset:** AI-generated, same transparency fix applied, saved to
`~/Downloads/carraffleodds-two-dice-transparent.png` (1254×1254px, RGBA).

## Sizing & asset pipeline (implementation notes, not yet done)

Both source assets are raster PNGs at 1254×1254px with true alpha. Before
these ship:
- Export the single-die mark at the sizes Next.js's icon conventions need
  (`app/icon.png`/`apple-icon.png`, plus a 32×32 favicon) — a flat, simple
  shape like this downsamples cleanly, so no vectorization is required to
  ship, though an SVG remains the more robust long-term option if pixel-
  perfect crispness at 16px becomes a problem.
- Fix the drop shadow on the two-dice asset before it's used in the hero.
- Resize/optimize whatever's used in the hero to avoid an oversized asset
  hurting Core Web Vitals (ties into the roadmap's ENG-5 performance item).

---

## Non-goals

- No dark-mode hero or repaint of the rest of the site.
- No change to page copy, section order, or anything below the hero.
- No mass/generated content — this is a one-time visual system change, not a
  pattern for future pages (CLAUDE.md rule 4).
- No SVG vectorization of the logo assets as part of this spec — raster
  exports are acceptable to ship; vectorizing is a follow-up if small-size
  crispness turns out to be a problem in practice.
- No changes to the two-dice asset's use anywhere *other* than hero/marketing
  contexts — it does not become a second nav/favicon option under any
  circumstance.
