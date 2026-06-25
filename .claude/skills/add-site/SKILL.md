---
name: add-site
description: >
  End-to-end procedure for onboarding a new raffle site to CarRaffleOdds. Load this
  whenever adding, listing, or evaluating a new operator. Covers the compliance/trust
  check that must happen before listing, the affiliate setup, the sites-table record,
  and wiring up the scraper. This is a recurring, compliance-sensitive task — follow
  the steps.
---

# Skill: add-site

Adding a site touches compliance, money, and data at once. Do the checks before the code.

## Step 1 — Compliance & trust check (BEFORE listing anything)
Confirm the site is compliantly structured and not an obvious scam (COMPLIANCE.md):
- **Genuine free-entry route or real skill element?** (Required for it to be lawful without a GC licence — and for us to be comfortable listing it.) If neither, don't list it.
- Companies House: registered UK company, verifiable number.
- Trustpilot rating + review count; look for verified winner testimonials.
- Live/recorded draws shown? Transparent total ticket numbers? Clear T&Cs?
- DCMS Voluntary Code signatory? (good trust signal for the site review.)
If it fails the basics, stop here.

## Step 2 — Affiliate setup
- Check whether the site runs a publisher affiliate programme (most UK ones are on **Awin**). Record: network, merchant ID, commission (e.g. flat CPA), cookie window. If it's only a customer refer-a-friend scheme (wallet credit/points), it is **not** publisher-monetisable — note that and set `has_affiliate = false`.
- Get the base `affiliate_url` if monetisable; otherwise link out to the plain `source_url`.
- Joining/financial steps (signing up to a network, entering payment details) are for the human, not the agent.

## Step 3 — `sites` record
Insert into `sites`: name, slug, url, logo_url, `competition_model` (fixed_odds / spot_the_ball / unlimited), trust_score (our assessment), trustpilot_rating/reviews, affiliate_url, has_affiliate, active. (See docs/DATA-MODEL.md.)

## Step 4 — Scraper
Build/extend the scraper for the site using the **write-scraper** skill. Verify it writes real raffles to Supabase and reports failures to Sentry. Add it to the orchestrator and the schedule.

## Step 5 — Site review page (content)
Once data flows, write the `/sites/[slug]` review using the **write-content** skill (hand-written prose + live widget). This is durable content, not generated.

## Acceptance
- Site passes the compliance/trust check (free route or skill element confirmed).
- Affiliate status recorded accurately (or flagged not-monetisable).
- `sites` record complete and correct.
- Scraper writes real data, runs on schedule, reports to Sentry.
- Listings/ranking are NOT influenced by whether we earn from the site (CLAUDE.md rule 2).
