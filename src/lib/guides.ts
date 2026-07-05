import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const GUIDES_DIR = path.join(process.cwd(), 'content/guides');

export interface GuideMeta {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  lastUpdated: string;
  faqItems: Array<{ question: string; answer: string }>;
  relatedGuides: string[];
  relatedSites: string[];
  /** Unreviewed draft — excluded from the guides index, sitemap, and direct access until a human approves it. */
  draft?: boolean;
}

export interface Guide {
  meta: GuideMeta;
  content: string;
}

export function getAllGuideSlugs(): string[] {
  return fs
    .readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''));
}

export function getGuide(slug: string): Guide | null {
  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { meta: data as GuideMeta, content };
}

export function getAllGuides(): Guide[] {
  return getAllGuideSlugs()
    .map((slug) => getGuide(slug))
    .filter((g): g is Guide => g !== null);
}

export function getPublishedGuideSlugs(): string[] {
  return getAllGuides()
    .filter((g) => !g.meta.draft)
    .map((g) => g.meta.slug);
}

export function getPublishedGuides(): Guide[] {
  return getAllGuides().filter((g) => !g.meta.draft);
}
