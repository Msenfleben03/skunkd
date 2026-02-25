import type { Card, ScoreBreakdown } from './types';
import { cardValue, rankOrder } from './types';

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

/**
 * Score runs: find longest consecutive rank sequences, multiplied by
 * duplicate counts. Handles double runs, double-double runs, triple runs.
 *
 * Algorithm:
 * 1. Build a frequency map of rank orders
 * 2. Find all maximal consecutive sequences of length >= 3
 * 3. For each sequence, multiply run length by product of frequencies
 *    (this naturally handles duplicate ranks creating multiple runs)
 */
export function scoreRuns(cards: readonly Card[]): number {
  // Count how many cards at each rank order (1-13)
  const freq = new Map<number, number>();
  for (const c of cards) {
    const order = rankOrder(c.rank);
    freq.set(order, (freq.get(order) ?? 0) + 1);
  }

  // Get sorted unique rank orders
  const orders = [...freq.keys()].sort((a, b) => a - b);

  // Find all maximal consecutive sequences
  let totalScore = 0;

  let i = 0;
  while (i < orders.length) {
    // Start a new consecutive sequence
    let j = i;
    while (j + 1 < orders.length && orders[j + 1] === orders[j] + 1) {
      j++;
    }

    const runLength = j - i + 1;
    if (runLength >= 3) {
      // Multiply by product of frequencies of each rank in the run
      let multiplier = 1;
      for (let k = i; k <= j; k++) {
        multiplier *= freq.get(orders[k])!;
      }
      totalScore += runLength * multiplier;
    }

    i = j + 1;
  }

  return totalScore;
}

/**
 * Score flush.
 * Hand: 4 cards same suit = 4pts; all 5 same suit = 5pts.
 * Crib: MUST be all 5 same suit or 0pts (4-card crib flush = 0).
 */
export function scoreFlush(
  hand: readonly Card[],
  starter: Card,
  isCrib: boolean,
): number {
  const handSuit = hand[0].suit;
  const allHandMatch = hand.every(c => c.suit === handSuit);

  if (!allHandMatch) return 0;

  const starterMatches = starter.suit === handSuit;

  if (isCrib) {
    return starterMatches ? 5 : 0;
  }

  return starterMatches ? 5 : 4;
}

/**
 * Score nobs: Jack in HAND matching STARTER suit = 1 point.
 * Note: Jack AS the starter is "His Heels" (handled in game state, not here).
 */
export function scoreNobs(hand: readonly Card[], starter: Card): number {
  return hand.some(c => c.rank === 'J' && c.suit === starter.suit) ? 1 : 0;
}

/**
 * Score a complete hand (4 cards + starter).
 * Combines fifteens, pairs, runs, flush, and nobs into a ScoreBreakdown.
 */
export function scoreHand(
  hand: readonly Card[],
  starter: Card,
  isCrib: boolean,
): ScoreBreakdown {
  const allCards = [...hand, starter];
  const fifteens = scoreFifteens(allCards);
  const pairs = scorePairs(allCards);
  const runs = scoreRuns(allCards);
  const flush = scoreFlush(hand, starter, isCrib);
  const nobs = scoreNobs(hand, starter);

  return {
    total: fifteens + pairs + runs + flush + nobs,
    fifteens,
    pairs,
    runs,
    flush,
    nobs,
  };
}
