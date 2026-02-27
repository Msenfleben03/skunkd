import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { HandStatsSnapshot } from '@/engine/types';
import { cn } from '@/lib/utils';

interface HandByHandChartProps {
  history: readonly HandStatsSnapshot[];
  playerIndex: number;
  className?: string;
}

type Category = 'total' | 'peg' | 'hand' | 'crib';

const CATEGORY_LABELS: Record<Category, string> = {
  total: 'TOTAL',
  peg: 'PEG',
  hand: 'HAND',
  crib: 'CRIB',
};

const CATEGORY_DATA_KEY: Record<Category, string> = {
  total: 'total',
  peg: 'peg',
  hand: 'handScore',
  crib: 'cribScore',
};

export function HandByHandChart({
  history,
  playerIndex,
  className,
}: HandByHandChartProps) {
  const [category, setCategory] = useState<Category>('total');

  const data = history.map((snap) => {
    const s = snap.stats[playerIndex];
    return {
      name: `H${snap.handNumber}`,
      total: (s?.pegging ?? 0) + (s?.hand ?? 0) + (s?.crib ?? 0),
      peg: s?.pegging ?? 0,
      handScore: s?.hand ?? 0,
      cribScore: s?.crib ?? 0,
    };
  });

  const activeKey = CATEGORY_DATA_KEY[category];

  return (
    <div
      className={cn('rounded-xl bg-white/5 border border-white/10 p-4', className)}
      data-testid="hand-by-hand-chart"
    >
      <h3 className="text-sm font-semibold text-cream/60 mb-3">Hand-by-Hand Scoring</h3>

      {/* Toggle buttons */}
      <div className="flex gap-1.5 mb-3" data-testid="category-toggles">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-bold transition-colors',
              category === cat
                ? 'bg-gold text-skunk-dark'
                : 'bg-white/10 text-cream/50 hover:text-cream/70',
            )}
            data-testid={`toggle-${cat}`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#f5f0e8',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey={activeKey}
            stroke="#d4a843"
            strokeWidth={2}
            dot={{ fill: '#d4a843', r: 3 }}
            activeDot={{ r: 5, fill: '#d4a843' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
