import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { WebSiteJsonLd } from '@/components/json-ld';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const SITE_URL = 'https://www.carraffleodds.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | CarRaffleOdds',
    default: 'CarRaffleOdds — Compare the Best UK Car Raffle Odds',
  },
  description:
    'Compare live odds across UK car raffle and competition sites. Find the best deals, track ticket sales, and win your dream car for less. Updated every few hours.',
  keywords: [
    'car raffle odds',
    'UK car competitions',
    'raffle comparison',
    'best odds car raffle',
    'dream car giveaway odds',
    'car competition UK',
    'raffle odds comparison',
  ],
  authors: [{ name: 'CarRaffleOdds' }],
  creator: 'CarRaffleOdds',
  publisher: 'CarRaffleOdds',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: SITE_URL,
    siteName: 'CarRaffleOdds',
    title: 'CarRaffleOdds — Compare the Best UK Car Raffle Odds',
    description:
      'Compare live odds across UK car raffle and competition sites. Find the best deals, track ticket sales, and win your dream car for less.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CarRaffleOdds — Compare UK Car Raffle Odds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarRaffleOdds — Compare the Best UK Car Raffle Odds',
    description:
      'Compare live odds across UK car raffle and competition sites. Find the best deals and win your dream car for less.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        <WebSiteJsonLd />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
