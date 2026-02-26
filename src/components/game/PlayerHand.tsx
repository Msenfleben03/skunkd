import { rankOrder, type Card } from '@/engine/types';
import { cn } from '@/lib/utils';
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
 * Renders a hand of cards in an arc fan layout.
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
  // Auto-sort by rank order (Ace=1 ... King=13)
  const sorted = [...cards].sort((a, b) => rankOrder(a.rank) - rankOrder(b.rank));

  const count = sorted.length;
  if (count === 0) return null;

  // Fan geometry — spread cards in a slight arc
  const totalAngleDeg = Math.min(count * 5, 28); // total sweep angle
  const xStep = count <= 4 ? 52 : count <= 6 ? 44 : 38; // horizontal overlap
  const totalWidth = (count - 1) * xStep + 56; // 56px = card width

  return (
    <div
      className={cn('relative flex-shrink-0', className)}
      style={{
        width: totalWidth,
        // height: card (4.9rem ≈ 78px) + lift room (14px selected) + arc offset (8px)
        height: 110,
      }}
      aria-label="Player hand"
    >
      {sorted.map((card, i) => {
        const isSelected = selectedIds.has(card.id);
        const isMaxed = selectedIds.size >= maxSelectable && !isSelected;
        const isDimmed = dimUnselectable && isMaxed;

        // Arc math: angle goes from -half to +half
        const angle =
          count > 1 ? ((i / (count - 1)) - 0.5) * totalAngleDeg : 0;

        // Cards at edges of the arc sit slightly higher (like fanned cards on a table)
        const arcRaise = count > 1
          ? Math.abs((i / (count - 1)) - 0.5) * 6
          : 0;

        const canClick = onCardClick && !isDimmed && !faceDown
          ? () => onCardClick(card)
          : faceDown
          ? undefined
          : !isDimmed && onCardClick
          ? () => onCardClick(card)
          : undefined;

        return (
          <div
            key={card.id}
            className="absolute bottom-0 transition-all duration-200"
            style={{
              left: i * xStep,
              bottom: arcRaise,
              transform: `rotate(${angle}deg)`,
              transformOrigin: 'bottom center',
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
