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

function buildStatusText(
  phase: Phase,
  isHumanTurn: boolean,
): string | null {
  switch (phase) {
    case 'DISCARD_TO_CRIB': return 'Pick 2 cards to salt the crib';
    case 'CUT_STARTER': return 'Cut for the starter card';
    case 'PEGGING': return isHumanTurn ? 'Your turn — tap a card to play' : 'Opponent thinking…';
    case 'SHOW_NONDEALER': return 'Counting your hand…';
    case 'SHOW_DEALER': return 'Counting opponent hand…';
    case 'SHOW_CRIB': return 'Counting the crib…';
    case 'HAND_COMPLETE': return 'Hand complete';
    default: return null;
  }
}

/** Mascot action shot based on current game phase */
function getMascotImage(phase: Phase, isHumanTurn: boolean): string | null {
  switch (phase) {
    case 'DISCARD_TO_CRIB': return '/mascot-action-03.png';
    case 'CUT_STARTER': return '/mascot-action-04.png';
    case 'PEGGING': return isHumanTurn ? '/mascot-action-01.png' : '/mascot-action-03.png';
    case 'SHOW_NONDEALER':
    case 'SHOW_DEALER':
    case 'SHOW_CRIB': return '/mascot-action-02.png';
    case 'HAND_COMPLETE': return '/mascot-action-02.png';
    default: return null;
  }
}

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

  // Count colour: danger zones (5, 21, 26) in amber
  const isDanger = isPegging && (pegging.count === 5 || pegging.count === 21 || pegging.count === 26);
  const isMax = isPegging && pegging.count === 31;

  const statusText = message ?? buildStatusText(phase, isHumanTurn);
  const mascotSrc = getMascotImage(phase, isHumanTurn);

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      {/* Mascot action shot — compact on mobile to preserve hand visibility */}
      {mascotSrc && (
        <img
          src={mascotSrc}
          alt=""
          aria-hidden="true"
          className="w-[20vw] max-w-[96px] md:w-[30vw] md:max-w-[180px] object-contain opacity-70 pointer-events-none"
        />
      )}

      {/* Persistent status bar */}
      {statusText && (
        <div
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-medium tracking-wide',
            'bg-walnut/50 text-cream/85 border border-gold/20',
          )}
          aria-live="polite"
        >
          {statusText}
        </div>
      )}

      {/* Pegging count — the centrepiece during pegging */}
      {isPegging && (
        <div className="text-center" aria-label={`Pegging count: ${pegging.count}`}>
          <p className="text-[10px] text-cream/50 uppercase tracking-[0.15em] mb-0.5">Count</p>
          <div
            className={cn(
              'font-display font-black tabular-nums leading-none transition-colors duration-300',
              'text-7xl md:text-9xl',
              isDanger && 'text-amber-400',
              isMax && 'text-skunk-green',
              !isDanger && !isMax && 'text-gold',
            )}
          >
            {pegging.count}
          </div>
        </div>
      )}

      {/* Pegging sequence — cards played in current round */}
      {isPegging && pegging.sequence.length > 0 && (
        <div
          className="flex gap-1 flex-wrap justify-center max-w-[320px]"
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
              <div className="w-16 md:w-[5.625rem] lg:w-[6.75rem] h-[6.3rem] md:h-[7.875rem] lg:h-[9.4rem] rounded-md border border-dashed border-white/10" />
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
