'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  percentSold: number;
  className?: string;
}

function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-rose-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getProgressLabel(percent: number): string {
  if (percent >= 80) return 'Nearly gone';
  if (percent >= 50) return 'Selling fast';
  return 'Good odds';
}

export function ProgressBar({ percentSold, className }: ProgressBarProps) {
  const color = getProgressColor(percentSold);
  const label = getProgressLabel(percentSold);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums text-slate-700">{percentSold}% sold</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentSold, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
