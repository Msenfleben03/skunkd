import { rankOrder, type Card } from '@/engine/types';
import { cn } from '@/lib/utils';
import { useCardSize } from '@/hooks/useCardSize';
import { GameCard } from './GameCard';

export interface PlayerHandProps {
  /** Cards to display (will be auto-sorted by rank) */
  cards: Card[];
  /** IDs of currently selected cards */
  selectedIds?: Set<string>;
  /** Called when a card is tapped/clicked */
  onCardClick?: (card: Card) => void;
  /** Max cards that can be selected at once (2 for discard, 1 for pegging) */
  maxSelectable?: number;
  /** Dim cards when max is reached and they aren't already selected */
  dimUnselectable?: boolean;
  /** Render all cards face-down (for opponent's hand) */
  faceDown?: boolean;
  className?: string;
}

/**
 * Renders a hand of cards in a flat overlapping row.
 * Cards are auto-sorted lowest→highest by rank.
 * Supports tap-to-select with max selection enforcement.
 */
export function PlayerHand({
  cards,
  selectedIds = new Set(),
  onCardClick,
  maxSelectable = 1,
  dimUnselectable = false,
  faceDown = false,
  className,
}: PlayerHandProps) {
  const sz = useCardSize();

  // Auto-sort by rank order (Ace=1 ... King=13)
  const sorted = [...cards].sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));

  const count = sorted.length;
  if (count === 0) return null;

  const xStep = sz.xStep(count);
  // Extra gap inserted after each selected card so it doesn't cover neighbours
  const selGap = Math.round(xStep * 0.5);
  const totalGap = selectedIds.size * selGap;
  const totalWidth = (count - 1) * xStep + sz.w + totalGap;

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{
        width: totalWidth,
        height: sz.containerH,
      }}
      aria-label="Player hand"
    >
      {sorted.map((card, i) => {
        const isSelected = selectedIds.has(card.id);
        const isMaxed = selectedIds.size >= maxSelectable && !isSelected;
        const isDimmed = dimUnselectable && isMaxed;

        // Count selected cards before this index to compute cumulative gap
        let gapBefore = 0;
        for (let j = 0; j < i; j++) {
          if (selectedIds.has(sorted[j].id)) gapBefore += selGap;
        }

        return (
          <div
            key={card.id}
            className="absolute bottom-0 transition-all duration-200"
            style={{
              left: i * xStep + gapBefore,
              zIndex: isSelected ? count + 10 : i,
            }}
          >
            <GameCard
              card={faceDown ? undefined : card}
              faceDown={faceDown}
              selected={isSelected}
              dimmed={isDimmed}
              onClick={onCardClick && !isDimmed ? () => onCardClick(card) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
