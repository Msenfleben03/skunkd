import { type Card, type Phase, type PeggingState } from '@/engine/types';
import { cn } from '@/lib/utils';
import { GameCard } from './GameCard';

export interface PlayAreaProps {
  phase: Phase;
  starter: Card | null;
  pegging: PeggingState;
  /** Cards in the crib (4 after both players discard) */
  crib: readonly Card[];
  /** Whose turn it is (0 = human/non-dealer, 1 = AI/dealer) */
  humanPlayerIndex: number;
  /** Optional phase message (scoring events, go, etc.) */
  message?: string;
  className?: string;
}

const PHASE_LABELS: Partial<Record<Phase, string>> = {
  DISCARD_TO_CRIB: 'Salt the crib — pick 2',
  CUT_STARTER: 'Cut for starter',
  SHOW_NONDEALER: 'Counting hands…',
  SHOW_DEALER: 'Counting hands…',
  SHOW_CRIB: 'Counting crib…',
  HAND_COMPLETE: 'Hand complete',
};

/** Center-table area: count, pegging pile, starter, crib */
export function PlayArea({
  phase,
  starter,
  pegging,
  crib,
  humanPlayerIndex,
  message,
  className,
}: PlayAreaProps) {
  const isPegging = phase === 'PEGGING';
  const isShow = phase === 'SHOW_NONDEALER' || phase === 'SHOW_DEALER' || phase === 'SHOW_CRIB';
  const showCribFaceUp = phase === 'SHOW_CRIB';

  const isHumanTurn = isPegging && pegging.currentPlayerIndex === humanPlayerIndex;
  const turnLabel = isPegging
    ? isHumanTurn
      ? 'Your turn'
      : 'Opponent thinking…'
    : null;

  // Count colour: danger zones (5, 21, 26) in amber
  const isDanger = isPegging && (pegging.count === 5 || pegging.count === 21 || pegging.count === 26);
  const isMax = isPegging && pegging.count === 31;

  const phaseLabel = PHASE_LABELS[phase];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      {/* Phase / message toast */}
      {(message || phaseLabel) && (
        <div
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium tracking-wide',
            'bg-walnut/70 text-cream/90 border border-gold/20',
            'transition-all duration-300',
          )}
          aria-live="polite"
        >
          {message ?? phaseLabel}
        </div>
      )}

      {/* Pegging count — the centrepiece during pegging */}
      {isPegging && (
        <div className="text-center" aria-label={`Pegging count: ${pegging.count}`}>
          <p className="text-[10px] text-cream/50 uppercase tracking-[0.15em] mb-0.5">Count</p>
          <div
            className={cn(
              'font-display font-black tabular-nums leading-none transition-colors duration-300',
              'text-6xl',
              isDanger && 'text-amber-400',
              isMax && 'text-skunk-green',
              !isDanger && !isMax && 'text-gold',
            )}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {pegging.count}
          </div>
          {turnLabel && (
            <p className="text-[10px] text-cream/50 mt-1">{turnLabel}</p>
          )}
        </div>
      )}

      {/* Pegging sequence — cards played in current round */}
      {isPegging && pegging.sequence.length > 0 && (
        <div
          className="flex gap-1 flex-wrap justify-center max-w-[280px]"
          aria-label="Pegging sequence"
        >
          {[...pegging.sequence].map((card, i) => (
            <GameCard
              key={card.id}
              card={card}
              mini
              style={{ zIndex: i }}
            />
          ))}
        </div>
      )}

      {/* Pile count when sequence has been reset */}
      {isPegging && pegging.sequence.length === 0 && pegging.pile.length > 0 && (
        <p className="text-[10px] text-cream/40">
          {pegging.pile.length} card{pegging.pile.length !== 1 ? 's' : ''} played
        </p>
      )}

      {/* Show phase instruction */}
      {isShow && !message && (
        <p className="text-[10px] text-cream/50 uppercase tracking-widest">
          {phase === 'SHOW_CRIB' ? 'Crib' : 'Hand'} scoring
        </p>
      )}

      {/* Starter + Crib row */}
      <div className="flex items-end gap-6">
        {/* Starter card */}
        {starter ? (
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-[9px] text-gold/60 uppercase tracking-[0.15em]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Starter
            </span>
            <GameCard
              card={starter}
              className={phase === 'CUT_STARTER' ? 'animate-[flip_0.4s_ease-in-out]' : ''}
            />
          </div>
        ) : (
          phase === 'DISCARD_TO_CRIB' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-cream/30 uppercase tracking-[0.15em]">
                Starter TBD
              </span>
              {/* placeholder card silhouette */}
              <div className="w-14 h-[4.9rem] rounded-[5px] border border-dashed border-white/10" />
            </div>
          )
        )}

        {/* Crib */}
        {crib.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            <span
              className="text-[9px] text-gold/60 uppercase tracking-[0.15em]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Crib
            </span>
            {showCribFaceUp ? (
              <div className="flex gap-1">
                {[...crib].slice(0, 4).map((card, i) => (
                  <GameCard key={card.id} card={card} mini style={{ zIndex: i }} />
                ))}
              </div>
            ) : (
              <GameCard faceDown />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
