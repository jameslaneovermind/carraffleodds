---
name: site-domain
description: >
  Core domain knowledge and guardrails for CarRaffleOdds. Load this for almost any
  task — building features, writing scrapers, writing content, or answering questions
  about how the site or the UK car raffle market works. Use it whenever you need the
  shared vocabulary, the data model summary, the site/raffle business model, or the
  hard rules that must never be broken.
---

# Skill: site-domain

The shared foundation. Other skills compose on top of this.

## What CarRaffleOdds is
An independent UK car raffle **comparison** site. We scrape live data from raffle **sites** (operators) and present individual **raffles** so people can compare odds, price, % sold and value, then click out to the source site (via affiliate link) to enter. We are not a raffle operator. Revenue = affiliate commission. One-person side project, ~1 hour/day.

## Vocabulary (use exactly)
- **site** = an operator we track (`sites` table, `/sites/[slug]`). Models: `fixed_odds`, `spot_the_ball`, `unlimited`.
- **raffle** = one competition on a site (`raffles` table).
- Money is **integer pence** in the data; format to £ only at display.
- No synonyms (operator/competition/draw) in code, schema, routes, or copy.

## How the market works (enough to be accurate)
UK raffles stay legal without a Gambling Commission licence by removing payment (a genuine **free entry route**) or chance (a real **skill question**). Most car sites are fixed-odds: a capped number of tickets, a guaranteed draw on a date. The key value insight: an **undersold guaranteed draw** has better real odds than advertised — true odds track tickets *sold*, not the cap. Some sites (e.g. BOTB) are spot-the-ball/unlimited — no fixed odds; don't show "1 in X" for those.

## Data model (summary — full detail in docs/DATA-MODEL.md)
`sites` (name, slug, model, trust signals, affiliate_url) → `raffles` (car details, prize_value, cash_alternative, ticket_price, total/sold tickets, percent_sold, computed odds/value/EV, end_date, status). Plus `scrape_logs` (run history) and `raffle_snapshots` (odds over time). Computed metrics live in `src/lib/utils.ts`.

## Hard rules (never break — full list in CLAUDE.md)
1. **No mock/hardcoded data.** Scraper fails → empty state, never fake data.
2. **Never reorder/hide listings by affiliate relationship.** Independence is the product.
3. **No programmatic per-raffle pages, no mass-generated content.** Link out for individual raffles.
4. **Human approves everything public** — no auto-publish/post/send.
5. **18+, honest, responsible.** No fake urgency, never misrepresent odds/prizes; keep responsible-play framing. Check docs/COMPLIANCE.md before public copy or new site listings.
6. **Personal project** — keep all accounts/billing separate from work; keep `ANTHROPIC_API_KEY` out of the Claude Code env.

## Pointers
Reference: docs/DATA-MODEL.md, docs/COMPLIANCE.md. Plan: docs/ROADMAP.md. Other skills: writing-voice, write-scraper, add-site, write-content.
