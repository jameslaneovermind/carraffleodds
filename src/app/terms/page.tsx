import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for CarRaffleOdds — the independent UK car raffle comparison platform.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        Terms of Service
      </h1>
      <p className="text-sm text-slate-500 mb-10">Last updated: February 2026</p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>1. About the service</h2>
          <p>
            CarRaffleOdds (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an independent comparison
            and information service. We aggregate publicly available data about UK prize competitions
            and present it in a format designed to help users compare options. We do not sell raffle
            tickets, operate competitions, or process payments of any kind.
          </p>
          <p>
            By using this website, you agree to these Terms of Service. If you do not agree, please
            do not use the site.
          </p>
        </section>

        <section>
          <h2>2. Data accuracy</h2>
          <p>
            We make every reasonable effort to keep the information on CarRaffleOdds accurate and
            up to date. However, raffle odds, ticket prices, availability, and draw dates change
            frequently and are controlled by third-party competition operators.
          </p>
          <p>
            We do not guarantee the accuracy, completeness, or timeliness of any data displayed on
            this site. <strong>Always verify information directly with the competition operator
            before purchasing tickets.</strong> Discrepancies between our data and the operator&apos;s
            site should be resolved in favour of the operator&apos;s listing.
          </p>
        </section>

        <section>
          <h2>3. Affiliate links</h2>
          <p>
            This site contains affiliate links to third-party competition websites. When you click
            through to a competition site and make a purchase, we may earn a commission. This
            commission does not affect the ticket price you pay or the data we display. We show
            the same information regardless of whether we have an affiliate relationship with a
            given operator.
          </p>
        </section>

        <section>
          <h2>4. No gambling or financial advice</h2>
          <p>
            Nothing on this site constitutes gambling advice, financial advice, or a recommendation
            to participate in any particular competition. UK car competitions are legally classified
            as skill-based prize competitions and are not regulated by the Gambling Commission.
            Participation in any competition is entirely at your own risk and discretion.
          </p>
          <p>
            If you are concerned about your spending on competitions, please visit our{' '}
            <Link href="/responsible-gambling" className="text-blue-600 hover:text-blue-700 underline">
              Responsible Gambling
            </Link>{' '}
            page.
          </p>
        </section>

        <section>
          <h2>5. Age restriction</h2>
          <p>
            This website is intended for users aged 18 and over only. Most UK prize competitions
            require entrants to be at least 18 years old. By using CarRaffleOdds, you confirm
            that you are aged 18 or over.
          </p>
        </section>

        <section>
          <h2>6. Intellectual property</h2>
          <p>
            All original content, design, code, and data presentation on CarRaffleOdds is owned by
            us and protected by copyright. Competition data, images, and trademarks belong to their
            respective operators and are displayed under fair use for comparison purposes.
          </p>
          <p>
            You may not reproduce, distribute, or commercially exploit any content from this site
            without our written permission.
          </p>
        </section>

        <section>
          <h2>7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, CarRaffleOdds shall not be liable for:
          </p>
          <ul>
            <li>The conduct, reliability, or legitimacy of any third-party competition operator</li>
            <li>The accuracy of real-time odds or availability data</li>
            <li>Any financial losses arising from participation in competitions</li>
            <li>Any interruption or unavailability of this website</li>
            <li>Any damages arising from your use of, or inability to use, this site</li>
          </ul>
          <p>
            Your use of CarRaffleOdds is at your own risk. We provide the service on an &quot;as is&quot;
            and &quot;as available&quot; basis without warranties of any kind, express or implied.
          </p>
        </section>

        <section>
          <h2>8. Third-party websites</h2>
          <p>
            CarRaffleOdds contains links to external competition websites. We are not responsible
            for the content, practices, or policies of these third-party sites. We recommend
            reading the terms and conditions of any competition site before making a purchase.
          </p>
        </section>

        <section>
          <h2>9. Changes to these terms</h2>
          <p>
            We may update these Terms of Service from time to time. Changes will be posted on this
            page with an updated &quot;last updated&quot; date. Your continued use of the site after
            any changes constitutes acceptance of the revised terms.
          </p>
        </section>

        <section>
          <h2>10. Governing law</h2>
          <p>
            These terms are governed by and construed in accordance with the laws of England and
            Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of
            England and Wales.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <a
              href="mailto:hello@carraffleodds.com"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              hello@carraffleodds.com
            </a>.
          </p>
        </section>
      </div>
    </article>
  );
}
