import type { Card } from './types';
import { cardValue } from './types';

/**
 * Score fifteens: count all subsets of size 2-5 that sum to 15.
 * Uses bitmask enumeration to check ALL 2^n - n - 1 subsets of size >= 2.
 * Returns points (2 per fifteen).
 */
export function scoreFifteens(cards: readonly Card[]): number {
  const n = cards.length;
  const values = cards.map(c => cardValue(c.rank));
  let count = 0;

  // Enumerate all subsets via bitmask (1 to 2^n - 1)
  const totalMasks = 1 << n;
  for (let mask = 1; mask < totalMasks; mask++) {
    // Skip single-card subsets (need at least 2 cards)
    if ((mask & (mask - 1)) === 0) continue;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        sum += values[i];
      }
    }
    if (sum === 15) count++;
  }

  return count * 2;
}

/**
 * Score pairs: count all pairs of cards with matching rank.
 * C(n,2) pairs for n cards of same rank. Returns 2 per pair.
 */
export function scorePairs(cards: readonly Card[]): number {
  let count = 0;
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) count++;
    }
  }
  return count * 2;
}
