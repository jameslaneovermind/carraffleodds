# Growth Backlog

The marketing workstream — amplification. Almost everything here is **Phase 3** (ROADMAP.md): it only pays off once there's good content to amplify, so don't start before Phase 2 is producing. All organic/earned/owned — paid is off the table at this budget (COMPLIANCE.md §6). Full reasoning is in the marketing playbook.

> Hard rule across this whole workstream: **a human approves every public action.** Automation may monitor, draft, and report; it never posts, sends, or publishes (CLAUDE.md rule 7).

Effort: **S/M/L** as before.

---

### GRO-1 · Email list (capture + weekly digest)
**What:** Add email capture on the high-intent surfaces (`/ending-soon`, the value pages) and send a weekly "best value / ending soon" digest. Use a free-tier ESP on a **personal** account (Brevo or MailerLite — both EU-hosted, GDPR-friendly). Authenticate the sending domain (SPF/DKIM/DMARC). AI drafts the digest; you approve and send.
**Why:** The only platform-proof asset — an audience no algorithm can throttle, which matters when paid is restricted. Compounds with the content.
**Acceptance:**
- ESP on a personal account; domain authenticated.
- Capture form live with **explicit opt-in** (no pre-ticked/bundled consent) and working unsubscribe (COMPLIANCE.md §5).
- First digest sent; template on-voice.
**Effort:** M

### GRO-2 · AEO measurement (free manual citation log)
**What:** Pick 15–20 buyer/seeker-intent queries ("best car competition site UK", "is BOTB legit", "are car raffles worth it"). Weekly, run them through ChatGPT / Perplexity / Google AI Mode and log: cited yes/no, position, which page. Track AI-referrer sessions (chatgpt.com, perplexity.ai) in analytics alongside it. No paid AEO tool at this scale.
**Why:** AI citation is already a live channel for us (ChatGPT is a top referrer). Measuring it tells us whether the content bet is working and which pages earn citations — directly feeds the Phase 2 go/no-go.
**Acceptance:** a query log/sheet exists and is updated weekly (≈20 min); AI-referrer traffic visible in analytics.
**Effort:** S (recurring)

### GRO-3 · Light community seeding (Reddit/forums)
**What:** Genuine, disclosed participation where we actually add value — answer real questions in UK comping/car communities (Reddit, Loquax forums, relevant Facebook groups), linking to our content only when it genuinely helps. Warm a real account first; contribute far more than you promote; disclose that you run the site. Drafting can be AI-assisted; **posting is always manual.**
**Why:** Both a traffic channel and the single biggest AI-citation source (engines lean heavily on Reddit). Compounds into AEO. But it's slow, unautomatable, and easy to get banned for spam — so it's a light, honest touch, not a part-time job.
**Acceptance:** a real, warmed account; contributions are genuinely useful and disclosed; no automated posting; track referral traffic + any "how did you hear about us" signal.
**Effort:** S (recurring, low volume)

### GRO-4 · Backlink/brand seeding (opportunistic)
**What:** Get listed/mentioned in the comping community (Loquax, relevant directories), and pitch the occasional original-data angle ("we analysed odds across UK car raffle sites") that earns natural links and citations.
**Why:** Authority and discovery; original data doubles as citation bait. Low priority versus content itself.
**Acceptance:** a few genuine mentions/links earned; any data piece is accurate and on-voice.
**Effort:** S–M

### GRO-5 · PostHog user analytics (later)
**What:** Add PostHog (personal account) for on-site behaviour — what people filter, click, where they drop, which content converts to outbound affiliate clicks. Distinct from Sentry (backend errors) and from the existing high-level analytics.
**Why:** Tells us what users actually do so we improve the right things. Useful, but only once there's enough traffic and content to learn from — hence later.
**Acceptance:** PostHog on a personal account; key events (filter use, outbound affiliate click, content→click) tracked; privacy/consent handled per COMPLIANCE.md.
**Effort:** S–M

---

## Deliberately not doing (now)
- **Paid ads** (Meta/Google) — gated and off-budget (COMPLIANCE.md §6).
- **Short-form/faceless video at scale** — saturated, increasingly penalised, and gambling-adjacent video draws scrutiny. Skip at launch; if any video, one genuine explainer done well, properly labelled.
- **Paid AEO/SEO tooling** (Profound, Ahrefs Brand Radar, etc.) — not worth it at this scale; the free manual log (GRO-2) covers it.
- **Automated community posting / mass DMs** — banned-account and brand risk; violates CLAUDE.md rule 7.
