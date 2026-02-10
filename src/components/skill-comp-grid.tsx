'use client';

import { motion } from 'framer-motion';
import { SkillCompCard } from './skill-comp-card';
import type { Raffle } from '@/lib/types';

interface SkillCompGridProps {
  raffles: Raffle[];
}

export function SkillCompGrid({ raffles }: SkillCompGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {raffles.map((raffle, index) => (
        <motion.div
          key={raffle.id}
          initial={index < 9 ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={
            index < 9
              ? { duration: 0.35, delay: index * 0.06, ease: 'easeOut' }
              : { duration: 0 }
          }
        >
          <SkillCompCard raffle={raffle} />
        </motion.div>
      ))}
    </div>
  );
}
