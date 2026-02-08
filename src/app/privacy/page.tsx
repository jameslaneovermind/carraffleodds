import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for CarRaffleOdds — how we handle your data and protect your privacy.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        Privacy Policy
      </h1>
      <p className="text-sm text-slate-500 mb-10">Last updated: February 2026</p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>1. Who we are</h2>
          <p>
            CarRaffleOdds is an independent comparison website for UK car raffles and prize
            competitions. We are a small, independent project based in the United Kingdom.
          </p>
          <p>
            For data protection queries, you can contact us at{' '}
            <a
              href="mailto:hello@carraffleodds.com"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              hello@carraffleodds.com
            </a>.
          </p>
        </section>

        <section>
          <h2>2. What data we collect</h2>
          <p>
            We collect very little personal data. CarRaffleOdds does not require user registration,
            does not process payments, and does not collect personally identifiable information
            through forms or accounts.
          </p>
          <p>The data we may collect includes:</p>
          <ul>
            <li>
              <strong>Anonymous analytics data:</strong> page views, device type, browser type,
              approximate geographic location (country level), and referral source. This data is
              aggregated and cannot be used to identify individual users.
            </li>
            <li>
              <strong>Technical data:</strong> IP addresses may be temporarily processed by our
              hosting provider (Vercel) for security and performance purposes. These are not stored
              or accessible to us in an identifiable form.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. Analytics</h2>
          <p>
            We may use privacy-focused analytics services to understand how people use our site.
            If analytics are active, they collect aggregated, anonymous usage data — not personal
            information. We do not use Google Analytics or any service that creates individual
            user profiles.
          </p>
          <p>
            Analytics help us understand which pages are most useful, how people discover the site,
            and where we can improve. You can block analytics by using a browser-based ad blocker
            or privacy extension.
          </p>
        </section>

        <section>
          <h2>4. Cookies</h2>
          <p>
            CarRaffleOdds uses minimal cookies:
          </p>
          <ul>
            <li>
              <strong>Essential cookies:</strong> strictly necessary cookies for site functionality
              (e.g., remembering filter preferences). These do not require consent.
            </li>
            <li>
              <strong>Analytics cookies:</strong> if analytics are implemented, anonymous cookies
              may be used to track page views. These are optional and can be blocked.
            </li>
          </ul>
          <p>
            We do not use advertising cookies, remarketing cookies, or third-party tracking cookies.
            We do not sell, share, or trade cookie data with any third party.
          </p>
        </section>

        <section>
          <h2>5. Third-party links and affiliate cookies</h2>
          <p>
            CarRaffleOdds contains links to external competition websites. When you click an
            affiliate link, the destination site may set its own cookies to track the referral.
            This is standard practice for affiliate programmes and is controlled by the third-party
            site, not by us.
          </p>
          <p>
            We are not responsible for the privacy practices of third-party websites. We recommend
            reviewing the privacy policy of any site you visit through our links.
          </p>
        </section>

        <section>
          <h2>6. Data retention</h2>
          <p>
            Anonymous analytics data, if collected, is retained for up to 12 months before
            being automatically deleted. We do not store any personal data beyond what is
            described in this policy.
          </p>
        </section>

        <section>
          <h2>7. Your rights under UK GDPR</h2>
          <p>
            Under the UK General Data Protection Regulation, you have the following rights:
          </p>
          <ul>
            <li><strong>Right of access</strong> — request a copy of the data we hold about you</li>
            <li><strong>Right to rectification</strong> — request correction of inaccurate data</li>
            <li><strong>Right to erasure</strong> — request deletion of your data</li>
            <li><strong>Right to object</strong> — object to our processing of your data</li>
            <li><strong>Right to data portability</strong> — request your data in a machine-readable format</li>
            <li><strong>Right to complain</strong> — lodge a complaint with the Information Commissioner&apos;s Office (ICO)</li>
          </ul>
          <p>
            Given that we collect minimal anonymous data, most of these rights are unlikely to be
            relevant. However, if you have any concerns or requests, please contact us at{' '}
            <a
              href="mailto:hello@carraffleodds.com"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              hello@carraffleodds.com
            </a>.
          </p>
          <p>
            You can also contact the ICO directly at{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
              ico.org.uk
            </a>{' '}
            or by phone on 0303 123 1113.
          </p>
        </section>

        <section>
          <h2>8. Children&apos;s privacy</h2>
          <p>
            CarRaffleOdds is not intended for use by anyone under the age of 18. We do not
            knowingly collect data from children. Most UK prize competitions require entrants
            to be at least 18 years old.
          </p>
        </section>

        <section>
          <h2>9. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated date. Your continued use of the site after any changes constitutes
            acceptance of the revised policy.
          </p>
        </section>
      </div>
    </article>
  );
}
