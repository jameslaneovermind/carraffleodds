import type { Metadata } from 'next';
import { BreadcrumbJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'Responsible Gambling — Stay in Control',
  description:
    'CarRaffleOdds encourages responsible participation in UK competitions. Find guidance on setting limits, recognising warning signs, and getting help.',
  alternates: {
    canonical: '/responsible-gambling',
  },
};

export default function ResponsibleGamblingPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'Responsible Gambling', url: 'https://www.carraffleodds.com/responsible-gambling' },
        ]}
      />

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        Responsible Gambling
      </h1>
      <p className="text-lg text-slate-600 mb-10">
        Car competitions should be enjoyable. Here&apos;s how to keep it that way.
      </p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>Our commitment</h2>
          <p>
            CarRaffleOdds believes in informed, responsible participation. While UK car competitions
            are legally classified as prize competitions (skill-based) and are not regulated by the
            Gambling Commission, we recognise that entering competitions involves spending money with
            uncertain outcomes. The psychological and financial dynamics are similar to gambling, and
            the same risks can apply.
          </p>
          <p>
            We encourage every user of this site to participate responsibly and within their means.
          </p>
        </section>

        <section>
          <h2>Setting limits</h2>
          <p>
            Before you enter any competition, it&apos;s worth setting some ground rules for yourself:
          </p>
          <ul>
            <li>
              <strong>Set a monthly budget</strong> — decide in advance how much you&apos;re willing to
              spend on competition entries each month. Treat it as entertainment, like a cinema trip or a
              night out. Once the budget is spent, stop.
            </li>
            <li>
              <strong>Never spend money you can&apos;t afford to lose.</strong> Every penny you spend on
              competition entries should be money you&apos;re comfortable never seeing again.
            </li>
            <li>
              <strong>Don&apos;t chase losses.</strong> If you haven&apos;t won recently, entering more
              competitions won&apos;t improve your odds on any individual draw. Each competition is
              independent.
            </li>
            <li>
              <strong>Remember the odds.</strong> Most competitions have thousands or hundreds of
              thousands of entries. Winning is the exception, not the expectation.
            </li>
          </ul>
        </section>

        <section>
          <h2>Warning signs</h2>
          <p>
            If any of the following apply to you, it may be time to take a step back:
          </p>
          <ul>
            <li>You&apos;re spending more on competitions than you planned or can afford</li>
            <li>You&apos;re borrowing money to enter competitions</li>
            <li>You feel anxious, stressed, or guilty about your competition spending</li>
            <li>You&apos;re hiding your spending from family or friends</li>
            <li>You&apos;re entering competitions to try to solve financial problems</li>
            <li>You feel unable to stop entering even when you want to</li>
            <li>Competition spending is causing arguments or relationship problems</li>
          </ul>
          <p>
            If you recognise yourself in any of the above, please reach out to one of the organisations
            listed below. There is no shame in asking for help — these services are free, confidential,
            and run by people who understand.
          </p>
        </section>

        <section>
          <h2>Where to get help</h2>
          <p>
            The following UK organisations offer free, confidential support:
          </p>

          <div className="space-y-4 mt-4">
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-1">GamCare</h3>
              <p className="text-sm text-slate-600 mb-2">
                Free advice, support, and counselling for anyone affected by gambling.
              </p>
              <p className="text-sm">
                <strong>Phone:</strong> 0808 8020 133 (free, 24/7)
                <br />
                <strong>Website:</strong>{' '}
                <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                  www.gamcare.org.uk
                </a>
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-1">Gambling with Lives</h3>
              <p className="text-sm text-slate-600 mb-2">
                Support for families and individuals affected by gambling harm.
              </p>
              <p className="text-sm">
                <strong>Website:</strong>{' '}
                <a href="https://www.gamblingwithlives.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                  www.gamblingwithlives.org
                </a>
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-1">Citizens Advice</h3>
              <p className="text-sm text-slate-600 mb-2">
                Free, independent advice on debt, financial problems, and consumer rights.
              </p>
              <p className="text-sm">
                <strong>Website:</strong>{' '}
                <a href="https://www.citizensadvice.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                  www.citizensadvice.org.uk
                </a>
              </p>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-1">StepChange</h3>
              <p className="text-sm text-slate-600 mb-2">
                Free debt advice and debt management solutions.
              </p>
              <p className="text-sm">
                <strong>Phone:</strong> 0800 138 1111 (free)
                <br />
                <strong>Website:</strong>{' '}
                <a href="https://www.stepchange.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                  www.stepchange.org
                </a>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2>Self-exclusion</h2>
          <p>
            If you feel you need to stop entering competitions entirely:
          </p>
          <ul>
            <li>
              Most competition sites allow you to close your account or request self-exclusion.
              Contact the site&apos;s support team directly to arrange this.
            </li>
            <li>
              Consider using website-blocking tools or browser extensions to restrict access to
              competition sites if you find it difficult to stop visiting them.
            </li>
            <li>
              Talk to someone you trust about what you&apos;re going through. You don&apos;t have
              to deal with it alone.
            </li>
          </ul>
        </section>
      </div>
    </article>
  );
}
