import type { Card } from './types';
import { cardValue, rankOrder } from './types';

export interface PeggingPlayScore {
  readonly pairs: number;
  readonly runs: number;
  readonly fifteen: number;
  readonly thirtyone: number;
  readonly total: number;
}

/**
 * Score the most recent play in a pegging round.
 * Analyzes the pile (all cards played this round) and scores
 * the effect of the last card played.
 */
export function scorePeggingPlay(pile: readonly Card[]): PeggingPlayScore {
  if (pile.length === 0) {
    return { pairs: 0, runs: 0, fifteen: 0, thirtyone: 0, total: 0 };
  }

  const count = pile.reduce((sum, c) => sum + cardValue(c.rank), 0);
  const fifteen = count === 15 ? 2 : 0;
  const thirtyone = count === 31 ? 2 : 0;
  const pairs = scorePeggingPairs(pile);
  const runs = scorePeggingRuns(pile);

  return {
    pairs,
    runs,
    fifteen,
    thirtyone,
    total: pairs + runs + fifteen + thirtyone,
  };
}

/**
 * Score pairs from the end of the pile.
 * Count consecutive cards with same rank going backwards from the last card.
 * 2 matching = pair (2pts), 3 = pair royal (6pts), 4 = double pair royal (12pts).
 */
function scorePeggingPairs(pile: readonly Card[]): number {
  if (pile.length < 2) return 0;

  const lastRank = pile[pile.length - 1].rank;
  let matchCount = 1;

  for (let i = pile.length - 2; i >= 0; i--) {
    if (pile[i].rank === lastRank) {
      matchCount++;
    } else {
      break;
    }
  }

  if (matchCount < 2) return 0;
  // C(n,2) pairs × 2 points each
  return (matchCount * (matchCount - 1) / 2) * 2;
}

/**
 * Score runs from the end of the pile.
 * Check the last N cards (N from pile.length down to 3).
 * If they form a consecutive rank sequence (no gaps, no duplicates), score the longest.
 */
function scorePeggingRuns(pile: readonly Card[]): number {
  if (pile.length < 3) return 0;

  // Check from longest possible run down to 3
  for (let n = pile.length; n >= 3; n--) {
    const lastN = pile.slice(pile.length - n);
    const orders = lastN.map(c => rankOrder(c.rank));

    // Must have all unique ranks (no duplicates in pegging runs)
    const unique = new Set(orders);
    if (unique.size !== n) continue;

    // Check if they form consecutive sequence
    const min = Math.min(...orders);
    const max = Math.max(...orders);
    if (max - min === n - 1) {
      return n; // Score = length of run
    }
  }

  return 0;
}
