import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd, ArticleJsonLd } from '@/components/json-ld';

const SITE_URL = 'https://www.carraffleodds.com';
const PAGE_URL = `${SITE_URL}/methodology`;

export const metadata: Metadata = {
  title: 'How We Calculate Odds & Value Score — CarRaffleOdds Methodology',
  description:
    'How CarRaffleOdds calculates real odds, value score, and expected value for UK car competition tickets. Plain-English explanation of the maths.',
  alternates: { canonical: '/methodology' },
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Methodology', url: PAGE_URL },
        ]}
      />
      <ArticleJsonLd
        title="How We Calculate Odds & Value Score"
        url={PAGE_URL}
        lastUpdated="2026-06-27"
      />

      <nav className="text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600">Home</Link>
        {' / '}
        <span className="text-slate-600">Methodology</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
        How we calculate odds &amp; value score
      </h1>
      <p className="text-sm text-slate-500 mb-10">
        By <span className="font-medium text-slate-700">James Lane</span> · Updated June 2026
      </p>

      <div className="prose-custom space-y-10">

        {/* Intro */}
        <section>
          <p className="text-slate-700 leading-relaxed">
            Every number on CarRaffleOdds — odds, value score, expected value — is calculated
            from the same scraped data: ticket price, total tickets in the draw, tickets already
            sold, and the stated prize value or cash alternative. Here&apos;s exactly what the
            numbers mean and how they&apos;re worked out.
          </p>
        </section>

        {/* Odds */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Real odds</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            The headline odds on a fixed-ticket draw are simple: one ticket, one entry into
            a draw with a capped number of tickets. If a competition has 10,000 tickets, your
            odds with one ticket are 1 in 10,000.
          </p>
          <p className="text-slate-700 leading-relaxed mb-3">
            But most draws aren&apos;t sold out — and that matters. A guaranteed draw on a set
            date with only 4,000 of 10,000 tickets sold means your actual odds are 1 in 4,000,
            not 1 in 10,000. We show odds based on the ticket cap (the worst case), but the
            sold percentage lets you spot the undersold draws where your real odds are meaningfully
            better.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm font-mono text-slate-700">
            odds = 1 in total_tickets
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Spot-the-ball competitions (like BOTB&apos;s flagship) have no fixed ticket cap — odds
            depend on how many entries are submitted, which varies. We don&apos;t show a &quot;1 in X&quot;
            figure for those.
          </p>
        </section>

        {/* Value score */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Value score</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            The value score answers the question: how much prize value are you buying per £1
            you spend? It&apos;s the single most useful number for comparing draws of different
            sizes and ticket prices.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm font-mono text-slate-700 mb-3">
            raw score = prize_value ÷ (total_tickets × ticket_price)
          </div>
          <p className="text-slate-700 leading-relaxed mb-3">
            A raw score of 1.0 means the prize is worth exactly as much as the total ticket
            revenue if every ticket sells — perfect value, in theory. In practice, most draws
            sit below 1.0 (the operator needs margin). Higher is better.
          </p>
          <p className="text-slate-700 leading-relaxed mb-3">
            We display this on a 0–100 scale using a square-root curve, which spreads scores
            more evenly and stops outliers dominating:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm font-mono text-slate-700 mb-3">
            display score = min(√raw_score × 100, 100)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-6 font-semibold text-slate-800">Raw score</th>
                  <th className="py-2 pr-6 font-semibold text-slate-800">Display score</th>
                  <th className="py-2 font-semibold text-slate-800">What it means</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="py-2 pr-6">1.00</td><td className="py-2 pr-6">100</td><td className="py-2">Prize = total ticket revenue</td></tr>
                <tr><td className="py-2 pr-6">0.50</td><td className="py-2 pr-6">71</td><td className="py-2">Prize = 50% of revenue</td></tr>
                <tr><td className="py-2 pr-6">0.25</td><td className="py-2 pr-6">50</td><td className="py-2">Prize = 25% of revenue</td></tr>
                <tr><td className="py-2 pr-6">0.10</td><td className="py-2 pr-6">32</td><td className="py-2">Prize = 10% of revenue</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Where a cash alternative is stated but no prize value is given, we use the cash
            alternative as a conservative proxy. When neither is available, value score shows
            &quot;—&quot;.
          </p>
        </section>

        {/* Prize value */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Prize value</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            We use the prize value or cash alternative as stated by the operator on their own
            page — we don&apos;t independently value the car. If an operator claims a car is worth
            £45,000, that&apos;s what goes into the formula.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Worth checking: the cash alternative (usually 60–80% of the stated car value) is
            often a more honest indicator of what the prize is actually worth to a winner who
            takes the money.
          </p>
        </section>

        {/* Data freshness */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Data freshness</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            Ticket counts and sold percentages are scraped from the operator sites and updated
            throughout the day. End dates come from the operators directly. We don&apos;t guarantee
            real-time accuracy — always verify on the operator&apos;s site before entering.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Draws that have passed their stated end date are automatically marked as drawn and
            removed from live listings.
          </p>
        </section>

        {/* About */}
        <section className="border-t border-slate-100 pt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3">About this site</h2>
          <p className="text-slate-700 leading-relaxed mb-3">
            CarRaffleOdds is an independent comparison site built by James Lane, a car
            enthusiast who wanted to compare UK car competition odds without doing the maths
            by hand. It is not affiliated with any raffle operator. Revenue comes from
            affiliate links — we earn commission if you buy tickets via our links, which
            doesn&apos;t affect the data or rankings.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Questions or corrections: <a href="mailto:hello@carraffleodds.com" className="text-blue-600 hover:underline">hello@carraffleodds.com</a>.
          </p>
        </section>

      </div>

      <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap gap-4 text-sm">
        <Link href="/guides" className="text-blue-600 hover:underline">Guides →</Link>
        <Link href="/sites" className="text-blue-600 hover:underline">Site reviews →</Link>
        <Link href="/about-our-reviews" className="text-blue-600 hover:underline">About our reviews →</Link>
      </div>
    </div>
  );
}
