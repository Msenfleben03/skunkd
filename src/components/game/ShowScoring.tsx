import { useMemo } from 'react';
import { type Card, type ScoreBreakdown } from '@/engine/types';
import { cn } from '@/lib/utils';
import { GameCard } from './GameCard';

export interface ShowScoringProps {
  /** Label shown as the header, e.g. "Your Hand", "Opponent's Hand", "Crib" */
  label: string;
  /** The 4-card hand being scored */
  cards: readonly Card[];
  /** The starter card (cut) */
  starter: Card;
  /** Score breakdown from scoreHand() */
  scoring: ScoreBreakdown;
  className?: string;
}

const SCORE_ROWS = [
  { key: 'fifteens', label: 'Fifteens' },
  { key: 'pairs',    label: 'Pairs' },
  { key: 'runs',     label: 'Runs' },
  { key: 'flush',    label: 'Flush' },
  { key: 'nobs',     label: 'Nobs' },
] as const;

const ZERO_HAND_QUIPS = [
  "Nineteen! (That's zero, by the way.)",
  "A hand like a busted flush. Zero.",
  "Absolute bricks. 0 points.",
  "Zero. Even the crib laughed.",
];

export function ShowScoring({
  label,
  cards,
  starter,
  scoring,
  className,
}: ShowScoringProps) {
  const nonZeroRows = SCORE_ROWS.filter(r => scoring[r.key] > 0);
  const isZeroHand = scoring.total === 0;
  const zeroQuip = useMemo(
    () => ZERO_HAND_QUIPS[Math.floor(Math.random() * ZERO_HAND_QUIPS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 px-4 w-full max-w-xs mx-auto',
        className,
      )}
      data-testid="show-scoring"
      aria-label={`${label} scoring`}
    >
      {/* Header */}
      <h3
        className="text-lg font-bold text-gold tracking-wide font-display"
      >
        {label}
      </h3>

      {/* Cards row: hand + cut separator + starter */}
      <div className="flex items-end gap-1.5" aria-label="Cards being scored">
        {[...cards].map((c, i) => (
          <GameCard key={c.id} card={c} mini style={{ zIndex: i }} />
        ))}
        <div className="flex flex-col items-center gap-0.5 ml-2">
          <span className="text-[8px] text-cream/40 uppercase tracking-widest">Cut</span>
          <GameCard card={starter} mini />
        </div>
      </div>

      {/* Score breakdown card */}
      <div
        className="w-full rounded-2xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: 'rgba(92,58,33,0.7)' }}
        aria-label="Score breakdown"
      >
        {isZeroHand ? (
          <p className="text-sm text-cream/50 text-center py-4 px-4 italic">
            {zeroQuip}
          </p>
        ) : (
          <div className="py-1">
            {nonZeroRows.map(row => (
              <div
                key={row.key}
                className="flex justify-between items-center text-sm px-4 py-1.5 border-b border-white/5 last:border-0"
              >
                <span className="text-cream/70">{row.label}</span>
                <span
                  className="font-bold tabular-nums text-cream font-display"
                  aria-label={`${row.label}: ${scoring[row.key]} points`}
                >
                  {scoring[row.key]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total row */}
        <div
          className="flex justify-between items-center px-4 py-2.5 border-t border-gold/30"
          style={{ backgroundColor: 'rgba(212,168,67,0.12)' }}
          aria-label={`Total: ${scoring.total} points`}
        >
          <span className="text-gold font-bold text-sm tracking-wide">Total</span>
          <span
            className="text-gold font-black text-xl tabular-nums font-display"
          >
            {scoring.total}
          </span>
        </div>
      </div>
    </div>
  );
}
