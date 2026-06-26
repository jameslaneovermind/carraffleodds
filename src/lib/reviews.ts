import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const REVIEWS_DIR = path.join(process.cwd(), 'content/reviews');

export interface SiteReviewMeta {
  name: string;
  slug: string;
  trustpilotScore: number;
  trustpilotCount: string;
  yearsEstablished: number;
  companiesHouseNumber: string;
  voluntaryCode: boolean;
  parentCompany?: string;
  parentSiblings?: string[];
  logoUrl: string;
  affiliateUrl: string;
  tagline: string;
  metaDescription: string;
}

export interface SiteReview {
  meta: SiteReviewMeta;
  content: string;
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(REVIEWS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace('.mdx', ''));
}

export function getReview(slug: string): SiteReview | null {
  const filePath = path.join(REVIEWS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return { meta: data as SiteReviewMeta, content };
}

export function getAllReviews(): SiteReview[] {
  return getAllSlugs()
    .map((slug) => getReview(slug))
    .filter((r): r is SiteReview => r !== null)
    .sort((a, b) => a.meta.yearsEstablished - b.meta.yearsEstablished);
}
