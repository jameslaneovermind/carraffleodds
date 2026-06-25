# Compliance & Ethics

The guardrails for running a gambling-adjacent UK site. This is reference, not legal advice — it's here so the agent and you apply the same rules consistently. Consult before writing public-facing copy, listing a new site, or touching email. When something here is genuinely uncertain and money/risk is involved, get a UK gambling solicitor's view rather than guessing.

> Re-verify periodically: rules in this space change often (Voluntary Code, ICO/PECR, ASA rulings, platform ad policies). Treat dates below as a snapshot.

---

## 1. Why these sites are legal (and what that means for us)

UK raffles avoid needing a Gambling Commission licence by removing one element of a lottery (payment + chance + prize):
- **Free-entry route** — a genuine, prominent, equally-weighted free entry (e.g. postal at normal rate) removes "payment".
- **Skill element** — a real question that deters a significant proportion of entrants removes "chance".

As an **aggregator we don't run draws**, which keeps us well clear of the operators' licensing question. But two duties follow:
1. **Only list sites that are compliantly structured** — i.e. they actually offer a genuine free route or skill element. Check this when adding a site (see `add-site` skill).
2. **Never misrepresent odds or prizes.** We can compare and comment; we can't invent or distort.

The **DCMS Voluntary Code of Good Practice for Prize Draw Operators** (full compliance expected 20 May 2026) is the live regulatory backdrop — 18+ only, age verification, spend limits, prominent free routes, fair draws. Track which sites are signatories; it's a useful trust signal for our site review pages, and banks/processors/ad platforms increasingly use it in due diligence.

---

## 2. Advertising rules (CAP/ASA) — apply to ALL our copy

Everything we publish — site copy, guides, emails, social, even organic posts — is marketing and falls under the CAP Code.
- State significant conditions clearly: how to enter incl. cost, closing date, prize, eligibility, and the free route.
- **No fake urgency.** No countdown timers that reset, no "selling fast" claims we can't substantiate, no non-updating ticket figures. (The ASA has acted on exactly these.)
- Don't exaggerate odds or prize value. Don't imply entering is a route out of financial trouble.
- Label promotional content clearly where required.

## 3. Affiliate disclosure (FTC + ASA)

Affiliate links create a material connection that must be disclosed plainly and up front — not buried in the footer.
- Use clear language ("we may earn a commission if you buy through this link") — the existing `/about` and footer disclosure is the right spirit; keep it on any page with affiliate links.
- **Never pose as an unaffiliated user** anywhere (esp. Reddit/forums). The FTC's Fake Reviews & Testimonials rule and the ASA both prohibit it. On community platforms, disclose that you run the site.

## 4. Age & responsible play

- **18+ throughout.** Keep the 18+ marker; never target or appeal to under-18s in copy or imagery.
- Keep the responsible-gambling framing and signposting (the `/responsible-gambling` page). Use the honest line we already use: the odds are against you, winning is a bonus, treat spend as entertainment.
- Signpost help where appropriate. Don't strip these for conversion.

## 5. Data protection (UK GDPR + PECR) — mainly the email list

When we start collecting email (GROWTH.md):
- **Marketing email needs explicit opt-in consent** — freely given, specific, informed. Pre-ticked boxes, bundled "by signing up you agree", and entry-condition consent do **not** count.
- Honour the lawful-basis split: collecting an email to send a requested digest is fine *with consent for that purpose*; using it for anything else needs its own basis.
- **Never buy or scrape email lists.** We inherit liability for how every address was collected. ICO fines are severe.
- Every email needs a working unsubscribe, honoured promptly. Authenticate the sending domain (SPF/DKIM/DMARC).
- Note the Data (Use and Access) Act 2026 changed parts of the regime — re-check current ICO guidance before launch.

## 6. Paid advertising (why it's effectively off the table)

The free-entry route removes UK *licensing* but **not** the ad platforms' gambling regimes. Both Meta and Google treat raffles/prize draws as gambling for advertising, and explicitly pull in aggregator/affiliate sites. Meta needs Real Money Gaming authorisation (achievable via a UK gambling solicitor's opinion letter, ~£1k); Google's certification points awkwardly at charity registration for UK draws. **Net: at a near-zero budget, treat paid as off the table.** Revisit only with revenue and a solicitor's letter. This is *why* the growth plan is all organic/earned/owned.

## 7. Tax & housekeeping

Affiliate income is taxable income — keep clean records (Awin statements etc.). This is a personal venture; keep its finances separate from work. (Prize winnings being tax-free in the UK is a fact for our *content*, not relevant to our own tax.)

---

## Quick checklist before publishing anything public
- [ ] 18+ and responsible-play framing intact
- [ ] No fake urgency / no misrepresented odds or prizes
- [ ] Affiliate relationship disclosed up front if links present
- [ ] Significant conditions stated (entry cost, closing, free route)
- [ ] If it's email: explicit opt-in + working unsubscribe + authenticated domain
- [ ] If it's a new site listing: genuine free route / skill element verified
