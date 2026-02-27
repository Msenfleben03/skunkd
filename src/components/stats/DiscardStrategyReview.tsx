import type { DecisionSnapshot, Card } from '@/engine/types';
import { optimalDiscard } from '@/engine/optimal';
import { cn } from '@/lib/utils';

interface DiscardStrategyReviewProps {
  decisions: readonly DecisionSnapshot[];
  className?: string;
}

interface AnalyzedDiscard {
  handIndex: number;
  isDealer: boolean;
  isOptimal: boolean;
  delta: number;
  playerDiscard: readonly Card[];
  optimalDiscard: readonly Card[];
  playerEV: number;
  optimalEV: number;
}

function cardShort(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export function DiscardStrategyReview({
  decisions,
  className,
}: DiscardStrategyReviewProps) {
  const discardDecisions = decisions.filter((d) => d.type === 'discard');

  if (discardDecisions.length === 0) return null;

  const analyzed: AnalyzedDiscard[] = discardDecisions.map((d) => {
    const result = optimalDiscard([...d.hand], d.isDealer);

    // Find player's chosen option by matching discard card IDs
    const playerDiscardIds = new Set(d.playerChoice.map((c) => c.id));
    const playerOption = result.allOptions.find((opt) =>
      opt.discard.every((c) => playerDiscardIds.has(c.id)),
    );

    const playerEV = playerOption?.expectedValue ?? 0;
    const optimalEV = result.expectedValue;
    const delta = playerEV - optimalEV;
    const isOptimal = Math.abs(delta) < 0.01;

    return {
      handIndex: d.handIndex,
      isDealer: d.isDealer,
      isOptimal,
      delta,
      playerDiscard: d.playerChoice,
      optimalDiscard: result.discard,
      playerEV,
      optimalEV,
    };
  });

  const strategicCount = analyzed.filter((a) => a.isOptimal).length;
  const strategicPct = Math.round((strategicCount / analyzed.length) * 100);
  const avgDeficit =
    analyzed.length > 0
      ? analyzed.reduce((sum, a) => sum + Math.abs(a.delta), 0) / analyzed.length
      : 0;

  const pctColorClass =
    strategicPct >= 70
      ? 'text-green-400'
      : strategicPct >= 40
        ? 'text-gold'
        : 'text-red-400';

  return (
    <div
      data-testid="discard-strategy-review"
      className={cn(
        'rounded-xl bg-white/5 border border-white/10 p-4',
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-cream/60 mb-3">
        Discard Strategy Review
      </h3>

      {/* Aggregate stats */}
      <div className="flex gap-4 mb-4">
        <div>
          <p className="text-xs text-cream/40">Strategic Rounds</p>
          <p className={cn('text-lg font-black tabular-nums', pctColorClass)} data-testid="strategic-pct">
            {strategicPct}%
          </p>
        </div>
        <div>
          <p className="text-xs text-cream/40">Avg EV Deficit</p>
          <p className="text-lg font-black tabular-nums text-cream/80" data-testid="avg-deficit">
            {avgDeficit.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Per-hand list */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {analyzed.map((a, i) => (
          <div
            key={i}
            className="rounded-lg bg-white/5 px-3 py-2 text-xs"
            data-testid={`discard-hand-${i}`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-cream/60 font-medium">
                Hand {a.handIndex + 1}{' '}
                <span className="text-cream/30">
                  ({a.isDealer ? 'Dealer' : 'Pone'})
                </span>
              </span>
              {a.isOptimal ? (
                <span className="text-green-400 font-bold">Optimal</span>
              ) : (
                <span className="text-red-400 font-bold">
                  {a.delta.toFixed(2)} EV
                </span>
              )}
            </div>
            {!a.isOptimal && (
              <div className="text-cream/40 mt-0.5">
                <span>
                  You discarded: {a.playerDiscard.map(cardShort).join(', ')}
                </span>
                <span className="mx-1.5">|</span>
                <span>
                  Optimal: {a.optimalDiscard.map(cardShort).join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
