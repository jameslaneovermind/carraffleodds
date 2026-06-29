import { SkillCompCard } from './skill-comp-card';
import type { Raffle } from '@/lib/types';

interface SkillCompGridProps {
  raffles: Raffle[];
}

export function SkillCompGrid({ raffles }: SkillCompGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {raffles.map((raffle, index) => (
        <div
          key={raffle.id}
          className={index < 9 ? 'animate-fade-in-up' : undefined}
          style={index < 9 ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}
        >
          <SkillCompCard raffle={raffle} priority={index < 3} />
        </div>
      ))}
    </div>
  );
}
