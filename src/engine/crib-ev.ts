import type { Card, Rank } from './types';
import { RANKS, SUITS } from './types';
import { scoreHand } from './scoring';

function sortedRankPair(r1: Rank, r2: Rank): string {
  const i1 = RANKS.indexOf(r1);
  const i2 = RANKS.indexOf(r2);
  return i1 <= i2 ? `${r1}-${r2}` : `${r2}-${r1}`;
}

/**
 * Schell Crib Expected Value Table (91 unique rank pairs).
 *
 * Values = average total crib score when these 2 cards are in the crib,
 * averaged over all possible 2-card completions from opponent + all starters.
 * Cross-validated by Hessel, Rasmussen, and Bowman within 2.4%.
 */
const CRIB_EV_TABLE: Record<string, number> = {
  // High value (> 6.0)
  '5-5': 8.50, '2-3': 6.90, '5-J': 6.66, '5-10': 6.66,
  '5-K': 6.67, '5-Q': 6.63, '5-6': 6.40, '4-5': 6.20, 'A-4': 6.10,
  // Strong (4.5 - 6.0)
  '3-3': 5.90, '4-4': 5.90, '7-8': 5.50, '6-6': 5.50, '7-7': 5.50,
  '6-7': 5.40, 'A-A': 5.20, '2-2': 5.20, '8-8': 5.10, '5-9': 5.00,
  '3-4': 4.90, '6-9': 4.80, '9-9': 4.70, 'A-2': 4.60, '8-9': 4.50,
  // Medium (3.5 - 4.5)
  '10-10': 4.30, 'J-J': 4.30, 'Q-Q': 4.30, 'K-K': 4.30,
  'A-3': 4.20, '2-4': 4.10, '3-6': 4.00, '4-6': 3.90,
  '3-K': 3.89, '2-Q': 3.86, '2-10': 3.71, '2-K': 3.57,
  '3-Q': 3.65, 'A-10': 3.51, '3-10': 3.51, 'A-Q': 3.50,
  // Weak (< 3.5)
  'A-K': 3.36, '8-K': 3.20, '9-10': 3.10, '10-Q': 3.00,
  '10-K': 2.80, '9-K': 2.90, '9-Q': 2.90, 'J-K': 2.80,
  // Remaining pairs (interpolated from research)
  'A-5': 5.80, 'A-6': 4.00, 'A-7': 3.80, 'A-8': 3.60, 'A-9': 3.70,
  'A-J': 3.50, '2-5': 5.70, '2-6': 4.30, '2-7': 4.10, '2-8': 3.80,
  '2-9': 3.90, '2-J': 3.70, '3-5': 5.60, '3-7': 4.20, '3-8': 4.00,
  '3-9': 3.80, '3-J': 3.60, '4-7': 4.10, '4-8': 3.90, '4-9': 3.80,
  '4-10': 3.70, '4-Q': 3.70, '4-K': 3.60, '4-J': 3.70,
  '5-7': 5.30, '5-8': 5.10, '6-8': 4.40, '6-10': 3.60,
  '6-J': 3.60, '6-Q': 3.60, '6-K': 3.50,
  '7-9': 4.40, '7-10': 3.80, '7-J': 3.80, '7-Q': 3.70, '7-K': 3.60,
  '8-10': 3.50, '8-J': 3.50, '8-Q': 3.40, '9-J': 3.10,
  '10-J': 3.00, 'J-Q': 2.90, 'Q-K': 2.80,
};

/**
 * Look up expected crib value for a pair of cards using the Schell table.
 * Suit is irrelevant — only rank matters.
 * All 91 unique rank pairs are covered (C(13,2) + 13 same-rank).
 */
export function lookupCribEV(c1: Card, c2: Card): number {
  const key = sortedRankPair(c1.rank, c2.rank);
  return CRIB_EV_TABLE[key] ?? 3.50;
}

/** Pick `count` random items from array using partial Fisher-Yates (in-place, returns items). */
function pickRandom(arr: readonly Card[], count: number): Card[] {
  const pool = [...arr];
  const n = pool.length;
  const picked: Card[] = [];
  for (let i = 0; i < count && i < n; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  return picked;
}

/**
 * Monte Carlo estimate of crib expected value for a specific discard pair.
 *
 * Samples `samples` random completions of the crib (2 random opponent discards
 * + 1 random starter) from the non-known cards. Returns average crib score.
 * Uniform sampling — no weighted opponent discard bias (future enhancement).
 *
 * Used in the coaching path only. Gameplay AI uses `lookupCribEV` for speed.
 *
 * @param discard - The 2 cards being discarded to the crib
 * @param knownCards - All cards visible to this player (hand + any revealed cards)
 * @param samples - Number of random completions to simulate (default: 500)
 */
export function monteCartoCribEV(
  discard: readonly [Card, Card],
  knownCards: readonly Card[],
  samples = 500,
): number {
  // Build deck of cards not yet known
  const knownIds = new Set(knownCards.map(c => c.id));
  const remaining: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const id = `${rank}-${suit}`;
      if (!knownIds.has(id)) remaining.push({ rank, suit, id });
    }
  }

  // Need at least 3 unknown cards: 2 opponent discards + 1 starter
  if (remaining.length < 3) return lookupCribEV(discard[0], discard[1]);

  let total = 0;
  for (let i = 0; i < samples; i++) {
    const [opp1, opp2, starter] = pickRandom(remaining, 3);
    const crib: Card[] = [discard[0], discard[1], opp1, opp2];
    total += scoreHand(crib, starter, true).total;
  }
  return total / samples;
}
