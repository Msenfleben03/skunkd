import { useEffect, useRef, useState } from 'react';
import { type Card } from '@/engine/types';
import { cn } from '@/lib/utils';
import { GameCard } from './GameCard';

export interface DealCard {
  /** The card being dealt */
  card: Card;
  /** X offset from center in px (negative = left, positive = right) */
  targetX: number;
  /** Y offset from center in px (negative = up, positive = down) */
  targetY: number;
  /** Delay in ms before this card starts animating */
  delay: number;
  /** Whether to show the card face-down (true for opponent's hand) */
  faceDown?: boolean;
}

export interface DealAnimationProps {
  /** Cards to deal with their target positions and delays */
  cards: DealCard[];
  /** Called after the last card settles */
  onComplete?: () => void;
  className?: string;
}

/**
 * Overlay that animates cards flying from the centre deck position
 * to their target positions. GPU-composited: uses only transform + opacity.
 *
 * Usage: render this over the game table while `isDealing` is true.
 * Remove it from the tree once `onComplete` fires.
 */
export function DealAnimation({ cards, onComplete, className }: DealAnimationProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  // Track whether cleanup has run so onComplete fires only once
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (cards.length === 0) {
      onCompleteRef.current?.();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    cards.forEach((_, i) => {
      const t = setTimeout(() => {
        setRevealedCount(prev => prev + 1);
      }, cards[i].delay);
      timers.push(t);
    });

    const lastDelay = Math.max(...cards.map(c => c.delay));
    // onComplete fires 350ms after the last card starts (time for it to settle)
    const completeTimer = setTimeout(() => {
      onCompleteRef.current?.();
    }, lastDelay + 350);
    timers.push(completeTimer);

    return () => timers.forEach(clearTimeout);
  }, [cards]);

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none z-50 overflow-hidden', className)}
      aria-hidden="true"
      data-testid="deal-animation"
    >
      {cards.map((animCard, i) => {
        const isRevealed = i < revealedCount;

        return (
          <div
            key={animCard.card.id}
            className="absolute top-1/2 left-1/2"
            style={{
              // Before reveal: sit at deck centre (0,0). After: fly to target.
              transform: isRevealed
                ? `translate(calc(-50% + ${animCard.targetX}px), calc(-50% + ${animCard.targetY}px))`
                : 'translate(-50%, -50%)',
              opacity: isRevealed ? 1 : 0,
              // Springy easing for the "flick" feel of real card dealing
              transition: isRevealed
                ? 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.12s ease'
                : 'none',
              zIndex: 50 - i,
            }}
          >
            <GameCard
              card={animCard.faceDown ? undefined : animCard.card}
              faceDown={animCard.faceDown}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper: builds DealCard[] for a standard 2-player deal.
 * Alternates dealing to player then opponent, 3 cards each then 2 each = 12 total? No,
 * cribbage deals 6 to each player = 12 cards total, alternating one at a time.
 *
 * @param playerCards  - 6 cards for the human player
 * @param opponentCards - 6 cards for the opponent (dealt face-down)
 * @param cardW - card width in px (default 56)
 * @param handY - Y offset for player's hand from centre (positive = below)
 * @param opponentY - Y offset for opponent's hand from centre (negative = above)
 */
export function buildDealSequence(
  playerCards: Card[],
  opponentCards: Card[],
  cardW = 56,
  handY = 140,
  opponentY = -140,
): DealCard[] {
  const result: DealCard[] = [];
  const totalCards = playerCards.length + opponentCards.length;
  const cardDelay = Math.floor(1400 / totalCards); // spread over ~1.4s

  // Interleave: p[0], o[0], p[1], o[1], ...
  const maxLen = Math.max(playerCards.length, opponentCards.length);
  let delay = 0;

  for (let i = 0; i < maxLen; i++) {
    if (i < playerCards.length) {
      const xOffset = (i - (playerCards.length - 1) / 2) * (cardW * 0.75);
      result.push({
        card: playerCards[i],
        targetX: xOffset,
        targetY: handY,
        delay,
        faceDown: false,
      });
      delay += cardDelay;
    }

    if (i < opponentCards.length) {
      const xOffset = (i - (opponentCards.length - 1) / 2) * (cardW * 0.75);
      result.push({
        card: opponentCards[i],
        targetX: xOffset,
        targetY: opponentY,
        delay,
        faceDown: true,
      });
      delay += cardDelay;
    }
  }

  return result;
}
