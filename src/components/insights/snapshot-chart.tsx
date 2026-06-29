'use client';

import type { TimingDataPoint } from '@/lib/insights';

interface SnapshotChartProps {
  data: TimingDataPoint[];
}

const PAD = { top: 24, right: 24, bottom: 48, left: 52 };
const W = 700;
const H = 320;
const CW = W - PAD.left - PAD.right;  // 624
const CH = H - PAD.top - PAD.bottom;  // 248

export function SnapshotChart({ data }: SnapshotChartProps) {
  if (!data.length) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center border border-slate-200 rounded-xl">
        No timing data available yet.
      </p>
    );
  }

  // Sort descending (60 → 0 days before end)
  const sorted = [...data].sort((a, b) => b.days_before_end - a.days_before_end);
  const maxDays = sorted[0].days_before_end;

  // Scales
  const xScale = (days: number) =>
    maxDays > 0 ? ((maxDays - days) / maxDays) * CW : 0;
  const yScale = (pct: number) => CH - (pct / 100) * CH;

  // Polyline points
  const points = sorted
    .map((d) => `${xScale(d.days_before_end).toFixed(1)},${yScale(d.avg_percent_sold).toFixed(1)}`)
    .join(' ');

  // Axis ticks
  const yTicks = [0, 25, 50, 75, 100];
  const xTickValues = [60, 45, 30, 14, 7, 0].filter((d) => d <= maxDays);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-2xl"
        role="img"
        aria-label="Average sell-through rate by days before draw close"
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Y grid lines + labels */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={0} y1={yScale(tick)} x2={CW} y2={yScale(tick)}
                stroke="#e2e8f0" strokeWidth={1}
              />
              <text
                x={-8} y={yScale(tick)}
                textAnchor="end" dominantBaseline="middle"
                fill="#94a3b8" fontSize={11}
              >
                {tick}%
              </text>
            </g>
          ))}

          {/* X axis ticks */}
          {xTickValues.map((days) => (
            <g key={days}>
              <line
                x1={xScale(days)} y1={CH} x2={xScale(days)} y2={CH + 5}
                stroke="#cbd5e1" strokeWidth={1}
              />
              <text
                x={xScale(days)} y={CH + 18}
                textAnchor="middle"
                fill="#94a3b8" fontSize={11}
              >
                {days}d
              </text>
            </g>
          ))}

          {/* Axis border lines */}
          <line x1={0} y1={0} x2={0} y2={CH} stroke="#e2e8f0" strokeWidth={1} />
          <line x1={0} y1={CH} x2={CW} y2={CH} stroke="#e2e8f0" strokeWidth={1} />

          {/* Data line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Axis labels */}
          <text
            x={CW / 2} y={CH + 40}
            textAnchor="middle"
            fill="#64748b" fontSize={12}
          >
            Days before draw closes
          </text>
          <text
            x={-(CH / 2)} y={-40}
            textAnchor="middle"
            fill="#64748b" fontSize={12}
            transform="rotate(-90)"
          >
            Avg % tickets sold
          </text>
        </g>
      </svg>
      <p className="text-xs text-slate-400 mt-2">
        Based on {data.reduce((s, d) => s + d.sample_count, 0).toLocaleString()} snapshot readings
        across all sites. Buckets with fewer than 50 readings excluded.
      </p>
    </div>
  );
}
