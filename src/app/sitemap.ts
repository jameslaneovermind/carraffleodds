import { MetadataRoute } from 'next';
import { ALL_CATEGORIES } from '@/lib/constants';

const SITE_URL = 'https://www.carraffleodds.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Core pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/raffles`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ending-soon`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/responsible-gambling`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    // Terms and Privacy are noindexed but still in sitemap
    // (Google prefers seeing all canonical URLs even if noindexed)
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = ALL_CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/raffles/${cat.slug}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages];
}
