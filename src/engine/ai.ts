import type { Card } from './types';
import { cardValue, RANKS, SUITS } from './types';
import { scoreHand } from './scoring';
import { lookupCribEV } from './crib-ev';
import { optimalPeggingPlay } from './optimal';

/**
 * Result of AI discard evaluation.
 */
export interface DiscardResult {
  readonly discard: readonly [Card, Card];
  readonly keep: readonly Card[];
  readonly expectedHandValue: number;
}

/**
 * Board position mode based on Theory of 26.
 * Retained for coaching/analysis use — not used in pegging play selection.
 */
export type PositionMode = 'offense' | 'defense' | 'neutral';

/**
 * Determine board position mode using Theory of 26 zones.
 *
 * Returns the strategic mode based on score and dealer position.
 * Zones alternate offense/defense — dealer and pone are always opposite.
 */
export function getPositionMode(
  myScore: number,
  _opponentScore: number,
  isDealer: boolean,
): PositionMode {
  if (myScore <= 60) return 'neutral';

  let dealerMode: PositionMode;
  if (myScore <= 75) dealerMode = 'defense';
  else if (myScore <= 86) dealerMode = 'offense';
  else if (myScore <= 101) dealerMode = 'defense';
  else if (myScore <= 112) dealerMode = 'offense';
  else dealerMode = 'defense'; // 113-120

  return isDealer ? dealerMode : (dealerMode === 'offense' ? 'defense' : 'offense');
}

/**
 * Select which 2 cards to discard from a 6-card hand.
 *
 * Evaluates all C(6,2) = 15 possible discard combinations.
 * For each: scores the remaining 4 cards against all 46 possible starters
 * and computes the expected hand value. Uses Schell rank-pair crib EV:
 * - Dealer: adds crib EV (discards go to own crib)
 * - Pone: subtracts crib EV (discards help opponent)
 *
 * Returns the discard that maximizes total expected value.
 */
export function aiSelectDiscard(
  hand: readonly Card[],
  isDealer: boolean,
): DiscardResult {
  const handIds = new Set(hand.map(c => c.id));

  const fullDeck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      fullDeck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }

  let bestScore = -Infinity;
  let bestDiscard: [Card, Card] = [hand[0], hand[1]];
  let bestKeep: Card[] = hand.slice(2);
  let bestExpected = 0;

  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const discard: [Card, Card] = [hand[i], hand[j]];
      const keep = hand.filter((_, idx) => idx !== i && idx !== j);

      let totalHandScore = 0;
      let starterCount = 0;

      for (const starter of fullDeck) {
        if (handIds.has(starter.id)) continue;
        totalHandScore += scoreHand(keep, starter, false).total;
        starterCount++;
      }

      const avgHandScore = totalHandScore / starterCount;

      // Schell crib EV — direct addition/subtraction
      const cribEV = lookupCribEV(discard[0], discard[1]);
      const totalValue = isDealer
        ? avgHandScore + cribEV
        : avgHandScore - cribEV;

      if (totalValue > bestScore) {
        bestScore = totalValue;
        bestDiscard = discard;
        bestKeep = keep;
        bestExpected = avgHandScore;
      }
    }
  }

  return {
    discard: bestDiscard,
    keep: bestKeep,
    expectedHandValue: bestExpected,
  };
}

/**
 * Select the best card to play during pegging using Expectimax look-ahead.
 *
 * Uses optimalPeggingPlay (20 determinizations, depth 3) to rank all playable
 * cards by expected cumulative value, accounting for dangerous counts
 * ({5,11,21}) and future scoring opportunities.
 *
 * Returns null if no card is playable (must declare Go).
 */
export function aiSelectPlay(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
): Card | null {
  const playable = hand.filter(card => cardValue(card.rank) + count <= 31);
  if (playable.length === 0) return null;

  return optimalPeggingPlay(hand, pile, count).card;
}
