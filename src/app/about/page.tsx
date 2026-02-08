import type { Metadata } from 'next';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { OrganizationJsonLd, BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'About CarRaffleOdds — Independent UK Raffle Comparison',
  description:
    'Learn how CarRaffleOdds works. We independently track and compare odds across UK car raffle sites so you can make informed decisions.',
  alternates: {
    canonical: '/about',
  },
};

export const revalidate = 3600; // 1 hour — for dynamic counts

async function getStats() {
  const supabase = createBrowserClient();

  const { count: raffleCount } = await supabase
    .from('raffles')
    .select('*', { count: 'exact', head: true })
    .in('status', ['active', 'ending_soon']);

  const { count: siteCount } = await supabase
    .from('sites')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  return {
    raffles: raffleCount ?? 0,
    sites: siteCount ?? 0,
  };
}

export default async function AboutPage() {
  const stats = await getStats();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'About', url: 'https://www.carraffleodds.com/about' },
        ]}
      />

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        About CarRaffleOdds
      </h1>
      <p className="text-lg text-slate-600 mb-10">
        The independent comparison platform for UK car raffles and competitions.
      </p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>What is CarRaffleOdds?</h2>
          <p>
            CarRaffleOdds is an independent comparison platform that tracks live odds, ticket prices, and
            availability across UK car raffle and competition sites. We&apos;re not a raffle operator — we don&apos;t
            sell tickets or run competitions ourselves. Our job is simpler than that: we gather the data and
            present it clearly so you can make informed decisions about which competitions offer the best value
            for your money.
          </p>
          <p>
            We built CarRaffleOdds because the UK car raffle market has grown rapidly, and it&apos;s become
            genuinely difficult to compare across sites. Ticket prices, total tickets, odds, and draw dates
            vary enormously. Some competitions have 5,000 entries, others have 5 million. Without comparing
            the numbers side by side, it&apos;s easy to misjudge where you&apos;re getting the best chance.
          </p>
        </section>

        <section>
          <h2>What we track</h2>
          <p>
            We currently monitor{' '}
            <strong>{stats.raffles} active competitions</strong> across{' '}
            <strong>{stats.sites} sites</strong>. For each competition, we track:
          </p>
          <ul>
            <li>Ticket prices</li>
            <li>Total tickets available (which determines your odds)</li>
            <li>Percentage of tickets sold</li>
            <li>Draw dates and live countdown timers</li>
            <li>Cash alternatives and prize values</li>
          </ul>
          <p>
            Our scrapers run every few hours to keep the data as fresh as possible. Odds and availability
            change constantly, so we recommend always checking the competition site directly before making
            a purchase — but our data gives you a reliable snapshot for comparison purposes.
          </p>
        </section>

        <section>
          <h2>How we make money</h2>
          <p>
            We believe in being upfront about this. CarRaffleOdds may earn a commission when you click
            through to a competition site and purchase tickets. This is a standard affiliate arrangement
            and it doesn&apos;t affect the odds or data we show — we display the same information whether we
            have an affiliate relationship with a site or not.
          </p>
          <p>
            Affiliate partnerships are what keep CarRaffleOdds free to use. We&apos;d rather be transparent
            about the business model than pretend it doesn&apos;t exist.
          </p>
        </section>

        <section>
          <h2>What we don&apos;t do</h2>
          <p>
            It&apos;s worth being clear about what CarRaffleOdds is <em>not</em>:
          </p>
          <ul>
            <li>We don&apos;t sell raffle tickets or process payments</li>
            <li>We don&apos;t guarantee odds, outcomes, or prize delivery</li>
            <li>We don&apos;t endorse any particular raffle site over another</li>
            <li>We&apos;re not regulated by the Gambling Commission — UK car competitions are legally classified as skill-based prize competitions, not gambling</li>
            <li>We don&apos;t provide gambling or financial advice</li>
          </ul>
          <p>
            If you&apos;re concerned about your spending on competitions, please visit
            our{' '}
            <Link href="/responsible-gambling" className="text-blue-600 hover:text-blue-700 underline">
              Responsible Gambling
            </Link>{' '}
            page for guidance and helpline information.
          </p>
        </section>

        <section>
          <h2>Get in touch</h2>
          <p>
            CarRaffleOdds is a small, independent project — not a large company. If you have questions,
            feedback, or a business enquiry, you can reach us at{' '}
            <a
              href="mailto:hello@carraffleodds.com"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              hello@carraffleodds.com
            </a>.
          </p>
          <p>
            If you operate a competition site and would like to be listed, or if you spot any data
            inaccuracies, we&apos;d be happy to hear from you.
          </p>
        </section>
      </div>
    </article>
  );
}
