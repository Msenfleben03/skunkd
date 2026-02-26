import type { Card } from './types';
import { cardValue } from './types';
import { scoreHand } from './scoring';

/**
 * Result of AI discard evaluation.
 */
export interface DiscardResult {
  readonly discard: readonly [Card, Card];
  readonly keep: readonly Card[];
  readonly expectedHandValue: number;
}

/**
 * Estimate the expected crib contribution for 2 discarded cards.
 *
 * Weights derived from charm-prototype heuristics:
 * - Sum-to-15: +2 (guaranteed fifteen in crib)
 * - Pair: +2 (guaranteed pair in crib)
 * - Individual 5s: +1 each (pairs with any face card for 15)
 * - Close ranks (≤2 apart): +1 (run potential with other crib cards)
 */
function estimateCribValue(discard: readonly [Card, Card]): number {
  let value = 0;
  const v0 = cardValue(discard[0].rank);
  const v1 = cardValue(discard[1].rank);

  // Cards summing to 15 = guaranteed 2pts in crib
  if (v0 + v1 === 15) value += 2;

  // Pair in crib = guaranteed 2pts
  if (discard[0].rank === discard[1].rank) value += 2;

  // 5s pair with any face card for 15 — valuable in crib
  if (v0 === 5) value += 1;
  if (v1 === 5) value += 1;

  // Close ranks have run potential with other crib cards + starter
  if (Math.abs(v0 - v1) <= 2) value += 1;

  return value;
}

/**
 * Select which 2 cards to discard from a 6-card hand.
 *
 * Evaluates all C(6,2) = 15 possible discard combinations.
 * For each: scores the remaining 4 cards against all 46 possible starters
 * and computes the expected hand value. Applies a crib modifier:
 * - Dealer: adds estimated crib contribution (discards go to own crib)
 * - Pone: subtracts estimated crib contribution (discards help opponent)
 *
 * Returns the discard that maximizes total expected value.
 */
export function aiSelectDiscard(
  hand: readonly Card[],
  isDealer: boolean,
): DiscardResult {
  const handIds = new Set(hand.map(c => c.id));

  // Build the full deck of 52 cards for starter enumeration
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
  const SUITS = ['H', 'D', 'S', 'C'] as const;
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

  // Enumerate all C(6,2) = 15 discard combinations
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const discard: [Card, Card] = [hand[i], hand[j]];
      const keep = hand.filter((_, idx) => idx !== i && idx !== j);
      // Average hand score over all possible starters
      let totalHandScore = 0;
      let starterCount = 0;

      for (const starter of fullDeck) {
        // Skip cards in our 6-card hand
        if (handIds.has(starter.id)) continue;

        totalHandScore += scoreHand(keep, starter, false).total;
        starterCount++;
      }

      const avgHandScore = totalHandScore / starterCount;

      // Apply crib modifier (fractional weights from charm-prototype)
      // Dealer gets 60% of crib value — hand strength still dominates
      // Pone subtracts 50% — moderate penalty for helping opponent's crib
      const cribValue = estimateCribValue(discard);
      const totalValue = isDealer
        ? avgHandScore + cribValue * 0.6
        : avgHandScore - cribValue * 0.5;

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
 * Select the best card to play during pegging.
 *
 * Priority system:
 * 1. Make 31 (2 points)
 * 2. Make 15 (2 points)
 * 3. Make a pair with last card in pile (2 points)
 * 4. Avoid leaving count at 5 or 21 (easy fifteens for opponent)
 * 5. Play lowest value card (minimize opponent's scoring chances)
 *
 * Returns null if no card is playable (must declare Go).
 */
export function aiSelectPlay(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
): Card | null {
  // Filter to only playable cards (value + count <= 31)
  const playable = hand.filter(card => cardValue(card.rank) + count <= 31);

  if (playable.length === 0) return null;
  if (playable.length === 1) return playable[0];

  // Priority 1: Make 31
  const makes31 = playable.find(card => cardValue(card.rank) + count === 31);
  if (makes31) return makes31;

  // Priority 2: Make 15
  const makes15 = playable.find(card => cardValue(card.rank) + count === 15);
  if (makes15) return makes15;

  // Priority 3: Make a pair with last card in pile
  if (pile.length > 0) {
    const lastRank = pile[pile.length - 1].rank;
    const makesPair = playable.find(card => card.rank === lastRank);
    if (makesPair) return makesPair;
  }

  // Priority 4: Avoid leaving count at 5 or 21
  const DANGEROUS_COUNTS = new Set([5, 21]);
  const safe = playable.filter(card => {
    const newCount = cardValue(card.rank) + count;
    return !DANGEROUS_COUNTS.has(newCount);
  });

  // If safe options exist, pick lowest value among them
  if (safe.length > 0) {
    return safe.reduce((best, card) =>
      cardValue(card.rank) < cardValue(best.rank) ? card : best,
    );
  }

  // Priority 5: Fall back to lowest value card
  return playable.reduce((best, card) =>
    cardValue(card.rank) < cardValue(best.rank) ? card : best,
  );
}
