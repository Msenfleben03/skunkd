# Data Tables Reference

## Table of Contents
- [Schell Crib Expected Value Table](#schell-crib-expected-value-table)
- [Implementation Pattern](#implementation-pattern)
- [Opponent Discard Probability](#opponent-discard-probability)
- [Prime-Hash Lookup](#prime-hash-lookup)
- [Cribbage Space Sizes](#cribbage-space-sizes)
- [Key Statistics](#key-statistics)

---

## Schell Crib Expected Value Table

Complete rank-pair crib EV values from Schell/Hessel/Rasmussen/Bowman research (researchers agree within 2.4%). Values represent average crib points when these two cards are in the crib.

### High Value Discards (> 6.0 avg pts)

| Rank Pair | Crib EV | Note |
|-----------|---------|------|
| 5-5 | 8.50 | Highest value — pairs with everything for 15 |
| 2-3 | 6.90 | Run + fifteen + connector potential |
| 5-J | 6.66 | Five + face card = guaranteed 15 |
| 5-10 | 6.66 | Five + face card = guaranteed 15 |
| 5-K | 6.67 | Five + face card = guaranteed 15 |
| 5-Q | 6.63 | Five + face card = guaranteed 15 |
| 5-6 | 6.40 | Run + fifteen potential |
| 4-5 | 6.20 | Run + near fifteen |
| A-4 | 6.10 | Sum to 5, pair with tens for 15 |

### Strong Discards (4.5 - 6.0 avg pts)

| Rank Pair | Crib EV | Note |
|-----------|---------|------|
| 3-3 | 5.90 | Pair + fifteen potential |
| 4-4 | 5.90 | Pair |
| 7-8 | 5.50 | Strong connectors |
| 6-6 | 5.50 | Pair |
| 7-7 | 5.50 | Pair |
| 6-7 | 5.40 | Connectors |
| A-A | 5.20 | Pair + run potential |
| 2-2 | 5.20 | Pair |
| 8-8 | 5.10 | Pair |
| 5-9 | 5.00 | Near sum to 15 (14) |
| 3-4 | 4.90 | Connectors |
| 6-9 | 4.80 | Sum to 15 |
| 9-9 | 4.70 | Pair |
| A-2 | 4.60 | Run potential |
| 8-9 | 4.50 | Connectors |

### Medium Discards (3.5 - 4.5 avg pts)

| Rank Pair | Crib EV | Note |
|-----------|---------|------|
| 10-10 | 4.30 | Pair |
| J-J | 4.30 | Pair |
| Q-Q | 4.30 | Pair |
| K-K | 4.30 | Pair |
| A-3 | 4.20 | Near connector |
| 2-4 | 4.10 | Near connector |
| 3-6 | 4.00 | Sum near 15 (9) |
| 4-6 | 3.90 | Run potential |
| 3-K | 3.89 | Distant |
| 2-Q | 3.86 | Distant |
| 2-10 | 3.71 | Distant |
| 2-K | 3.57 | Distant |
| 3-Q | 3.65 | Distant |
| A-10 | 3.51 | Weak — distant ranks |
| 3-10 | 3.51 | Weak — distant ranks |
| A-Q | 3.50 | Weak |

### Weak Discards (< 3.5 avg pts — best for opponent's crib)

| Rank Pair | Crib EV | Note |
|-----------|---------|------|
| A-K | 3.36 | No scoring synergy |
| 8-K | 3.20 | Distant |
| 9-10 | 3.10 | Near connector but high |
| 10-Q | 3.00 | Both face value 10 |
| 10-K | 2.80 | Weakest area |
| 9-K | 2.90 | Weakest area |
| 9-Q | 2.90 | Weakest area |
| J-K | 2.80 | Worst — two ten-cards, no synergy |

---

## Implementation Pattern

```typescript
const RANK_ORDER = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function sortedRankPair(r1: string, r2: string): string {
  const i1 = RANK_ORDER.indexOf(r1);
  const i2 = RANK_ORDER.indexOf(r2);
  return i1 <= i2 ? `${r1}-${r2}` : `${r2}-${r1}`;
}

// Complete table (91 unique pairs)
const CRIB_EV_TABLE: Record<string, number> = {
  // High value
  '5-5': 8.50, '2-3': 6.90, '5-J': 6.66, '5-10': 6.66,
  '5-K': 6.67, '5-Q': 6.63, '5-6': 6.40, '4-5': 6.20, 'A-4': 6.10,
  // Strong
  '3-3': 5.90, '4-4': 5.90, '7-8': 5.50, '6-6': 5.50, '7-7': 5.50,
  '6-7': 5.40, 'A-A': 5.20, '2-2': 5.20, '8-8': 5.10, '5-9': 5.00,
  '3-4': 4.90, '6-9': 4.80, '9-9': 4.70, 'A-2': 4.60, '8-9': 4.50,
  // Medium
  '10-10': 4.30, 'J-J': 4.30, 'Q-Q': 4.30, 'K-K': 4.30,
  'A-3': 4.20, '2-4': 4.10, '3-6': 4.00, '4-6': 3.90,
  '3-K': 3.89, '2-Q': 3.86, '2-10': 3.71, '2-K': 3.57,
  '3-Q': 3.65, 'A-10': 3.51, '3-10': 3.51, 'A-Q': 3.50,
  // Weak (throw to opponent's crib)
  'A-K': 3.36, '8-K': 3.20, '9-10': 3.10, '10-Q': 3.00,
  '10-K': 2.80, '9-K': 2.90, '9-Q': 2.90, 'J-K': 2.80,
  // Fill remaining with interpolated values
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

function lookupCribEV(c1: Card, c2: Card): number {
  const key = sortedRankPair(c1.rank, c2.rank);
  return CRIB_EV_TABLE[key] ?? 3.50;  // Default to median if missing
}
```

---

## Opponent Discard Probability

From orbitals.com analysis — opponent discard frequency varies 101-fold across card pairs:

| Category | Frequency | Examples |
|----------|-----------|---------|
| Very common (> 2%) | 2.0-3.7% | 10-K, 9-K, Q-K, J-K (players dump high cards) |
| Common (1-2%) | 1.0-2.0% | 8-K, 10-Q, 9-J, high-card pairs |
| Uncommon (0.5-1%) | 0.5-1.0% | Mid-range cards, mixed values |
| Rare (< 0.5%) | 0.03-0.5% | 5-5, A-A, 2-3, 5-J (players keep these) |

**Usage in Monte Carlo:** Weight opponent discard sampling by these probabilities for more accurate crib EV. Uniform sampling overestimates crib value because it assumes opponents discard 5-5 as often as 10-K.

---

## Prime-Hash Lookup

For O(1) hand score lookup after precomputation:

```typescript
const RANK_PRIMES: Record<string, number> = {
  A: 2, '2': 3, '3': 5, '4': 7, '5': 11,
  '6': 13, '7': 17, '8': 19, '9': 23, '10': 29,
  J: 31, Q: 37, K: 41,
};

function handKey(cards: readonly Card[]): number {
  return cards.reduce((product, c) => product * RANK_PRIMES[c.rank], 1);
}

// Product of primes is unique for each multiset of ranks
// 6,175 rank-only combos cover all non-flush cases
// Flush hands need separate storage (same ranks, different score)
const SCORE_CACHE = new Map<number, number>();

function cachedScore(keep: readonly Card[], starter: Card): number {
  const key = handKey([...keep, starter]);
  const cached = SCORE_CACHE.get(key);
  if (cached !== undefined) return cached;
  const score = scoreHand(keep, starter, false).total;
  SCORE_CACHE.set(key, score);
  return score;
}
```

**Note:** This optimization is premature for current engine — 690 score calls per discard is fast enough. Profile before implementing.

---

## Cribbage Space Sizes

| Scenario | Formula | Count | Approach |
|----------|---------|-------|----------|
| Discard hand EV | C(6,2) x 46 | 690 | EXACT (current engine) |
| Crib EV (opponent unknown) | C(46,2) x 44 | 45,540 | Enumerate (~80ms) |
| Hand+starter universe | C(52,6) x 46 | 12,994,800 | Sampling or exhaustive |
| Pegging game tree (4v4) | ~4! x 4! branches | ~576 orderings | Minimax feasible |
| Full game simulation | ~10^14 histories | ~10^14 | Monte Carlo only |

---

## Key Statistics

From exhaustive enumeration (12,994,800 combos, validated against rubl.com):

| Metric | Value |
|--------|-------|
| Average hand score | 4.7692 pts |
| Average optimal discard hand | 8.21 pts |
| Most common score | 4 (21.98% of hands) |
| Zero-point hands | 7.76% |
| Maximum possible | 29 (only 4 hands in 12.9M) |
| Impossible scores | 19, 25, 26, 27 |
| Dealer advantage (crib) | +4.727 pts/hand |
| Dealer avg combined | 13.36 pts (hand+crib) |
