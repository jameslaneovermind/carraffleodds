// ============================================
// JSON-LD structured data components for SEO
// ============================================

const SITE_URL = 'https://www.carraffleodds.com';

interface JsonLdProps {
  data: Record<string, unknown>;
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * WebSite schema — used on the homepage.
 * Helps Google understand site identity and enables sitelinks.
 */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'CarRaffleOdds',
        url: SITE_URL,
        description:
          'Compare live odds across UK car raffle and competition sites.',
      }}
    />
  );
}

/**
 * Organization schema — used on the About page.
 */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'CarRaffleOdds',
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description:
          'Independent UK car raffle odds comparison platform',
        foundingDate: '2025',
        email: 'hello@carraffleodds.com',
        sameAs: [],
      }}
    />
  );
}

/**
 * BreadcrumbList schema — used on category and content pages.
 * Appears as breadcrumbs in Google search results → improves CTR.
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

/**
 * ItemList schema — used on the raffles listing page.
 * Provides potential rich results for list pages.
 */
export function RaffleListJsonLd({
  name,
  description,
  items,
}: {
  name: string;
  description: string;
  items: { title: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        description,
        numberOfItems: items.length,
        itemListElement: items.slice(0, 10).map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.title,
          url: item.url,
        })),
      }}
    />
  );
}

/**
 * FAQPage schema — useful for the How It Works page.
 * Can generate rich FAQ snippets in Google search results.
 */
export function FaqJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }}
    />
  );
}
