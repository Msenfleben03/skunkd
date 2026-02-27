import { cn } from '@/lib/utils';

interface ScoreBreakdownProps {
  totalScore: number;
  totalPegging: number;
  totalHand: number;
  totalCrib: number;
  className?: string;
}

export function ScoreBreakdown({
  totalScore,
  totalPegging,
  totalHand,
  totalCrib,
  className,
}: ScoreBreakdownProps) {
  return (
    <div
      data-testid="score-breakdown"
      className={cn(
        'rounded-xl bg-white/5 border border-white/10 p-4',
        className,
      )}
    >
      {/* Total score in gold */}
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-sm font-semibold text-cream/60">Total Score</span>
        <span
          className="text-2xl font-black tabular-nums"
          style={{ color: '#d4a843' }}
          data-testid="total-score"
        >
          {totalScore}
        </span>
      </div>

      {/* Category rows in cream */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-cream/50">Pegging Points</span>
          <span className="text-cream/80 font-semibold tabular-nums" data-testid="pegging-points">
            {totalPegging}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-cream/50">Hand Points</span>
          <span className="text-cream/80 font-semibold tabular-nums" data-testid="hand-points">
            {totalHand}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-cream/50">Crib Points</span>
          <span className="text-cream/80 font-semibold tabular-nums" data-testid="crib-points">
            {totalCrib}
          </span>
        </div>
      </div>
    </div>
  );
}
