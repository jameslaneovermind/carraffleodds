import type { Metadata } from 'next';
import Link from 'next/link';
import { Target, ArrowRight, Info } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { SkillCompGrid } from '@/components/skill-comp-grid';
import type { Raffle, Site } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Skill Competitions — Spot the Ball & More | CarRaffleOdds',
  description:
    'Browse skill-based competitions like BOTB Spot the Ball. Compare entry prices, cash alternatives, and prizes. Different from raffles — no fixed odds.',
  alternates: {
    canonical: '/competitions',
  },
};

export const revalidate = 300;

async function fetchSkillCompetitions() {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('raffles')
    .select('*, site:sites!inner(id, name, slug, url, logo_url, competition_model)')
    .eq('status', 'active')
    .eq('site.competition_model', 'spot_the_ball')
    .order('end_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching skill competitions:', error);
    return [];
  }

  return (data ?? []) as (Raffle & { site: Pick<Site, 'id' | 'name' | 'slug' | 'url' | 'logo_url' | 'competition_model'> })[];
}

export default async function CompetitionsPage() {
  const competitions = await fetchSkillCompetitions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-semibold text-orange-600 uppercase tracking-wide">
            Skill-Based
          </span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Skill Competitions
        </h1>
        <p className="mt-2 text-slate-500 max-w-2xl">
          Spot the Ball and other skill-based competitions. Unlike raffles, these have unlimited entries
          and winners are chosen by skill rather than random draw.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-8 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">
              How are these different from raffles?
            </p>
            <p className="mt-1 text-sm text-orange-700/80">
              Skill competitions have <strong>unlimited entries</strong> and no fixed odds.
              Winners are determined by skill (e.g. closest guess to the ball position), not a random draw.
              Because of this, we can&apos;t calculate odds or value scores like we do for raffles.
            </p>
          </div>
        </div>
      </div>

      {/* Competition grid */}
      {competitions.length > 0 ? (
        <SkillCompGrid raffles={competitions} />
      ) : (
        <div className="text-center py-16">
          <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">
            No skill competitions right now
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Check back soon — new competitions are added regularly.
          </p>
          <Link
            href="/raffles"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Browse Raffles Instead
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
