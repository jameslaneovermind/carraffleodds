import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getGuide, getAllGuideSlugs } from '@/lib/guides';
import { getReview } from '@/lib/reviews';
import { BreadcrumbJsonLd, ArticleJsonLd, FaqJsonLd } from '@/components/json-ld';
import { AuthorByline } from '@/components/AuthorByline';

export const revalidate = 86400;

const SITE_URL = 'https://www.carraffleodds.com';

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const guide = getGuide(params.slug);
  if (!guide) return {};
  return {
    title: guide.meta.metaTitle,
    description: guide.meta.metaDescription,
    alternates: { canonical: `/guides/${params.slug}` },
  };
}

export default function GuidePage({ params }: PageProps) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const { meta, content } = guide;
  const guideUrl = `${SITE_URL}/guides/${meta.slug}`;

  const relatedGuideData = meta.relatedGuides
    .map((slug) => getGuide(slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const relatedSiteData = meta.relatedSites
    .map((slug) => getReview(slug))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: SITE_URL },
          { name: 'Guides', url: `${SITE_URL}/guides` },
          { name: meta.title, url: guideUrl },
        ]}
      />
      <ArticleJsonLd
        title={meta.metaTitle}
        url={guideUrl}
        lastUpdated={meta.lastUpdated}
      />
      <FaqJsonLd faqs={meta.faqItems} />

      {/* Breadcrumb nav */}
      <nav className="text-xs text-slate-400 mb-6">
        <Link href="/guides" className="hover:text-slate-600">
          Guides
        </Link>
        {' / '}
        <span className="text-slate-600">{meta.title}</span>
      </nav>

      {/* Prose */}
      <article className="prose-custom space-y-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{meta.title}</h1>
        <AuthorByline lastUpdated={meta.lastUpdated} />
        <MDXRemote source={content} />
      </article>

      {/* FAQ — visible on page, mirrors FaqJsonLd */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
        <dl className="space-y-5">
          {meta.faqItems.map(({ question, answer }) => (
            <div key={question} className="border-b border-slate-100 pb-5 last:border-0">
              <dt className="font-semibold text-slate-800">{question}</dt>
              <dd className="text-slate-600 mt-1 text-sm leading-relaxed">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Related guides */}
      {relatedGuideData.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Related guides</h2>
          <ul className="space-y-2">
            {relatedGuideData.map((g) => (
              <li key={g.meta.slug}>
                <Link
                  href={`/guides/${g.meta.slug}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                >
                  {g.meta.title} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related site reviews */}
      {relatedSiteData.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Sites we&apos;ve reviewed</h2>
          <ul className="space-y-2">
            {relatedSiteData.map((r) => (
              <li key={r.meta.slug}>
                <Link
                  href={`/sites/${r.meta.slug}`}
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                >
                  {r.meta.name} review →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer note */}
      <p className="mt-10 text-xs text-slate-400 border-t border-slate-100 pt-6">
        Information is correct to the best of our knowledge — verify before acting on it.{' '}
        <Link href="/about-our-reviews" className="underline hover:text-slate-600">
          About our reviews
        </Link>
        {' · '}
        <Link href="/methodology" className="underline hover:text-slate-600">
          How we calculate
        </Link>
        .
      </p>
    </div>
  );
}
