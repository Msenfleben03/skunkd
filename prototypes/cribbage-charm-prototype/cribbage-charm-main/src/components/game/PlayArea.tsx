import { Card, Phase, PeggingState } from '@/engine/types';
import { GameCard } from './GameCard';

interface Props {
  phase: Phase;
  starter: Card | null;
  pegging: PeggingState;
  crib: Card[];
  message: string;
}

export function PlayArea({ phase, starter, pegging, crib, message }: Props) {
  const isPegging = phase === 'PEGGING';

  if (phase === 'HAND_COMPLETE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 relative z-10">
        <div className="text-4xl mb-2">✅</div>
        <h3 className="font-display text-lg text-primary">Hand Complete</h3>
        <p className="text-muted-foreground text-sm">Next hand awaits, pone.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 relative z-10 px-4">
      {/* Message toast */}
      {message && (
        <div className="text-primary font-semibold text-sm animate-fade-up bg-walnut/60 px-3 py-1 rounded-full">
          {message}
        </div>
      )}

      {/* Running count */}
      {isPegging && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Count</span>
          <div className="text-5xl font-display font-bold text-primary tabular-nums leading-none mt-1">
            {pegging.count}
          </div>
        </div>
      )}

      {/* Played cards in current sequence */}
      {isPegging && pegging.sequence.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center max-w-[300px] mt-2">
          {pegging.sequence.map((card) => (
            <GameCard key={card.id} card={card} mini />
          ))}
        </div>
      )}

      {/* Previously played indicator */}
      {isPegging && pegging.pile.length > 0 && pegging.sequence.length === 0 && pegging.count === 0 && (
        <p className="text-xs text-muted-foreground">{pegging.pile.length} cards played this hand</p>
      )}

      {/* Turn indicator during pegging */}
      {isPegging && (
        <p className="text-xs text-muted-foreground mt-1">
          {pegging.turn === 'player' ? 'Your turn' : "Muggins' turn"}
        </p>
      )}

      {/* Starter + Crib */}
      <div className="flex items-end gap-6 mt-3">
        {starter && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Starter</span>
            <GameCard card={starter} className={phase === 'CUT_STARTER' ? 'animate-flip' : ''} />
          </div>
        )}
        {crib.length > 0 && phase !== 'SHOW_CRIB' && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Crib</span>
            <GameCard faceDown />
          </div>
        )}
        {!starter && phase === 'DISCARD_TO_CRIB' && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Salt the crib — pick 2</span>
          </div>
        )}
      </div>
    </div>
  );
}
