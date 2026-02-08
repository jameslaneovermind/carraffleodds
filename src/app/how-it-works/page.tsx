import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'How Car Raffle Odds Work — Understanding UK Competition Odds',
  description:
    'Learn how car raffle odds are calculated, what our metrics mean, and how to find the best value UK competitions. A complete guide to making informed decisions.',
  alternates: {
    canonical: '/how-it-works',
  },
};

const FAQ_ITEMS = [
  {
    question: 'How are car raffle odds calculated?',
    answer:
      'Your odds per ticket are determined by the total number of tickets available. If a competition has 10,000 tickets, each ticket gives you a 1 in 10,000 chance of winning. If fewer tickets sell before the draw, your actual odds are better than advertised.',
  },
  {
    question: 'Are car raffles the same as gambling?',
    answer:
      'No. UK car competitions are legally classified as prize competitions, not gambling. They require a skill-based element (usually answering a question correctly) and are not regulated by the Gambling Commission. However, they do involve spending money with uncertain outcomes, so responsible participation is still important.',
  },
  {
    question: 'What does "expected value" mean?',
    answer:
      'Expected value is the statistical value of each ticket, calculated as (prize value ÷ total tickets) ÷ ticket price. A value above 1.0 means the ticket is theoretically worth more than its price. Below 1.0 means the operator profits on average. Most competitions have expected values below 1.0.',
  },
  {
    question: 'What is the cash alternative?',
    answer:
      'Many competitions offer a cash alternative instead of the physical prize. If you win, you can choose the cash amount rather than the car. The cash alternative is often lower than the car\'s retail value but avoids costs like insurance, tax, and running expenses.',
  },
  {
    question: 'Do all tickets sell before the draw?',
    answer:
      'Not always. Many competitions are guaranteed to draw on a set date regardless of how many tickets sell. If a competition has sold only 40% of its tickets at draw time, your actual odds are significantly better than the maximum advertised odds.',
  },
];

export default function HowItWorksPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: 'https://www.carraffleodds.com' },
          { name: 'How It Works', url: 'https://www.carraffleodds.com/how-it-works' },
        ]}
      />
      <FaqJsonLd faqs={FAQ_ITEMS} />

      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
        How Car Raffle Odds Work
      </h1>
      <p className="text-lg text-slate-600 mb-10">
        A straightforward guide to understanding UK car competition odds, our metrics, and finding the best value.
      </p>

      <div className="prose-custom space-y-8">
        <section>
          <h2>How UK car raffles work</h2>
          <p>
            Car raffles — more accurately called <em>prize competitions</em> — have become one of the
            fastest-growing ways to win a car in the UK. Unlike traditional gambling, they are legally
            classified as skill-based competitions because entrants must correctly answer a question
            (usually a simple multiple-choice question) to be eligible for the draw.
          </p>
          <p>
            This skill element is what keeps them outside the scope of the Gambling Commission. The
            question is typically straightforward — the legal requirement is that it exists, not that
            it&apos;s difficult.
          </p>
          <p>
            Most competitions work on a <strong>fixed-odds model</strong>: a set number of tickets are
            made available, and once they&apos;re sold (or the draw date arrives), a winner is selected.
            Some sites use unlimited entry models where there&apos;s no cap on ticket numbers — these
            typically have much worse odds as a result.
          </p>
        </section>

        <section>
          <h2>How we calculate odds</h2>
          <p>
            The formula is simple: <strong>your odds per ticket = 1 in [total tickets]</strong>.
          </p>
          <p>
            If a competition has 10,000 tickets available and you buy one, your odds of winning are
            1 in 10,000. Buy five tickets and your odds improve to 5 in 10,000, or 1 in 2,000.
          </p>
          <p>
            But here&apos;s the thing most people miss: <strong>percentage sold matters</strong>. If a
            competition has 10,000 tickets available but only 4,000 have sold by the time the draw
            happens, your actual odds are 1 in 4,000 — significantly better than the advertised 1 in
            10,000. This is why we track the percentage sold alongside the total ticket count.
          </p>
          <p>
            Competitions that are guaranteed to draw on a specific date regardless of how many tickets
            sell can represent genuinely good value when they&apos;re under-sold.
          </p>
        </section>

        <section>
          <h2>Understanding our metrics</h2>
          <p>
            Every competition card on CarRaffleOdds shows several key data points. Here&apos;s what each
            one means and why it matters:
          </p>

          <h3>Ticket Price</h3>
          <p>
            What one entry costs. Prices range from under 10p to over £20. A higher ticket price
            doesn&apos;t necessarily mean worse value — it depends on the total number of tickets and
            the prize value.
          </p>

          <h3>Odds (1 in X)</h3>
          <p>
            The total number of tickets available. A lower number means better odds for you. A
            competition with 1 in 5,000 odds gives you a much better chance per ticket than one
            with 1 in 500,000 odds — even if the ticket price is higher.
          </p>

          <h3>Percentage Sold</h3>
          <p>
            How many tickets have been purchased so far. Lower percentages mean fewer competitors.
            A competition showing 15% sold near its end date suggests your actual odds could be
            far better than the maximum advertised.
          </p>

          <h3>Cash Alternative</h3>
          <p>
            Some competitions offer cash instead of the car. If you win, you choose. The cash
            alternative is usually lower than the car&apos;s retail value, but it avoids the costs
            that come with a new car — insurance, tax, running costs, and depreciation. For many
            winners, the cash is the smarter financial choice.
          </p>

          <h3>End Date / Countdown</h3>
          <p>
            When the draw happens. Competitions are typically guaranteed to draw on this date
            regardless of how many tickets have sold. Our live countdown timers show you exactly
            how much time remains.
          </p>
        </section>

        <section>
          <h2>Tips for finding value</h2>
          <p>
            There&apos;s no guaranteed way to win — that&apos;s the nature of competitions. But there are
            ways to make more informed choices:
          </p>
          <ul>
            <li>
              <strong>Look for low percentage sold near the end date.</strong> If a competition is
              drawing tomorrow and only 20% of tickets have sold, your actual odds are roughly five
              times better than the maximum.
            </li>
            <li>
              <strong>Compare odds to ticket price.</strong> A £0.99 ticket with 1 in 500,000 odds is
              worse value than a £5 ticket with 1 in 5,000 odds. Think about what you&apos;re paying
              per unit of chance.
            </li>
            <li>
              <strong>Consider whether you want the car or the cash.</strong> If you&apos;d take the cash
              alternative anyway, compare the cash value against the odds and ticket price — not the
              car&apos;s retail value.
            </li>
            <li>
              <strong>Set a budget and stick to it.</strong> Decide in advance how much you&apos;re
              willing to spend per month on competitions. Treat it as entertainment spending, not an
              investment.
            </li>
          </ul>
        </section>

        <section>
          <h2>What makes a trustworthy raffle site</h2>
          <p>
            Not all competition sites are created equal. Here are the signs of a reputable operator:
          </p>
          <ul>
            <li>Registered UK company with a verifiable company number</li>
            <li>Transparent total ticket numbers and draw processes</li>
            <li>Live or recorded draws that you can watch</li>
            <li>Positive Trustpilot reviews with verified winner testimonials</li>
            <li>Clear terms and conditions</li>
            <li>A free postal entry option (legally required for UK prize competitions)</li>
          </ul>
          <p>
            If a site is unclear about ticket limits, doesn&apos;t show draw processes, or has
            consistently poor reviews, it&apos;s worth being cautious.
          </p>
        </section>

        <section>
          <h2>Participate responsibly</h2>
          <p>
            While car competitions aren&apos;t classified as gambling under UK law, they involve
            spending money with uncertain outcomes. The odds are always against you — winning is
            not expected, it&apos;s a bonus if it happens. Please read our{' '}
            <Link href="/responsible-gambling" className="text-blue-600 hover:text-blue-700 underline">
              Responsible Gambling
            </Link>{' '}
            page for guidance on setting limits and getting help if needed.
          </p>
        </section>
      </div>
    </article>
  );
}
