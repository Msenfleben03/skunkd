import { type Phase, type PeggingState, cardValue } from '@/engine/types';
import { cn } from '@/lib/utils';

export interface ActionBarProps {
  phase: Phase;
  /** IDs of currently selected cards */
  selectedCardIds: string[];
  pegging: PeggingState;
  /** Which player index is the human (usually 0) */
  humanPlayerIndex: number;
  onDiscard: () => void;
  onPlay: () => void;
  onGo: () => void;
  onAdvance: () => void;
  onNextHand: () => void;
  onNewGame: () => void;
  className?: string;
}

// ── Shared button styles ────────────────────────────────────────────────────

const BASE_BTN =
  'w-full rounded-xl font-bold text-base py-3.5 px-6 transition-all duration-150 select-none';

const PRIMARY_BTN = cn(
  BASE_BTN,
  'bg-gold text-skunk-dark shadow-lg shadow-gold/20',
  'active:scale-[0.97] active:shadow-sm',
  'hover:bg-gold-bright',
);

const SECONDARY_BTN = cn(
  BASE_BTN,
  'bg-walnut/60 text-cream border border-white/15',
  'active:scale-[0.97]',
);

const DISABLED_BTN = cn(
  BASE_BTN,
  'bg-walnut/30 text-cream/30 cursor-not-allowed',
);

const GO_BTN = cn(
  BASE_BTN,
  'bg-burgundy/80 text-cream border border-burgundy-light/30',
  'active:scale-[0.97]',
);

// ── Component ───────────────────────────────────────────────────────────────

export function ActionBar({
  phase,
  selectedCardIds,
  pegging,
  humanPlayerIndex,
  onDiscard,
  onPlay,
  onGo,
  onAdvance,
  onNextHand,
  onNewGame,
  className,
}: ActionBarProps) {
  const isHumanTurn = pegging.currentPlayerIndex === humanPlayerIndex;

  // Can the human play any card without busting?
  const humanPeggingCards = pegging.playerCards[humanPlayerIndex] ?? [];
  const canPlayACard = humanPeggingCards.some(
    c => cardValue(c.rank) + pegging.count <= 31,
  );
  const hasCardSelected = selectedCardIds.length === 1;

  let button: React.ReactNode;

  switch (phase) {
    case 'GAME_START':
      button = (
        <button className={PRIMARY_BTN} onClick={onNewGame} data-testid="action-btn">
          Deal Me In
        </button>
      );
      break;

    case 'DEALING':
    case 'CUT_STARTER':
      button = (
        <button className={DISABLED_BTN} disabled data-testid="action-btn">
          {phase === 'DEALING' ? 'Dealing…' : 'Cutting starter…'}
        </button>
      );
      break;

    case 'DISCARD_TO_CRIB': {
      const count = selectedCardIds.length;
      const ready = count === 2;
      button = (
        <button
          className={ready ? PRIMARY_BTN : DISABLED_BTN}
          disabled={!ready}
          onClick={ready ? onDiscard : undefined}
          data-testid="action-btn"
          aria-label={`Send to crib (${count} of 2 selected)`}
        >
          {ready ? 'Send to Crib' : `Select cards (${count}/2)`}
        </button>
      );
      break;
    }

    case 'PEGGING':
      if (!isHumanTurn) {
        button = (
          <button className={DISABLED_BTN} disabled data-testid="action-btn">
            Opponent thinking…
          </button>
        );
      } else if (!canPlayACard) {
        button = (
          <button className={GO_BTN} onClick={onGo} data-testid="action-btn">
            Say "Go!"
          </button>
        );
      } else if (hasCardSelected) {
        button = (
          <button className={PRIMARY_BTN} onClick={onPlay} data-testid="action-btn">
            Play Card
          </button>
        );
      } else {
        button = (
          <button className={DISABLED_BTN} disabled data-testid="action-btn">
            Tap a card to play
          </button>
        );
      }
      break;

    case 'SHOW_NONDEALER':
    case 'SHOW_DEALER':
    case 'SHOW_CRIB':
      button = (
        <button className={SECONDARY_BTN} onClick={onAdvance} data-testid="action-btn">
          Continue →
        </button>
      );
      break;

    case 'HAND_COMPLETE':
      button = (
        <button className={PRIMARY_BTN} onClick={onNextHand} data-testid="action-btn">
          Next Hand
        </button>
      );
      break;

    case 'GAME_OVER':
      button = (
        <button className={PRIMARY_BTN} onClick={onNewGame} data-testid="action-btn">
          Play Again
        </button>
      );
      break;

    default:
      button = (
        <button className={PRIMARY_BTN} onClick={onNewGame} data-testid="action-btn">
          Deal Me In
        </button>
      );
  }

  return (
    <div
      className={cn(
        'px-4 py-3 bg-walnut/90 backdrop-blur-sm border-t border-white/10',
        'relative z-20',
        className,
      )}
      data-testid="action-bar"
    >
      {button}
    </div>
  );
}
