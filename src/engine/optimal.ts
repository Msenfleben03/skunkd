import type { Card } from './types';
import { cardValue, RANKS, SUITS } from './types';
import { scoreHand } from './scoring';
import { scorePeggingPlay } from './pegging';
import { lookupCribEV } from './crib-ev';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * A single evaluated discard option.
 */
export interface DiscardOption {
  readonly discard: readonly [Card, Card];
  readonly keep: readonly Card[];
  readonly expectedValue: number;
}

/**
 * Full result from optimalDiscard — includes all 15 evaluated options.
 */
export interface OptimalDiscardResult {
  readonly discard: readonly [Card, Card];
  readonly keep: readonly Card[];
  readonly expectedValue: number;
  readonly reasoning: string;
  readonly allOptions: readonly DiscardOption[];
}

/**
 * Result from optimalPeggingPlay — includes reasoning for coaching.
 */
export interface OptimalPlayResult {
  readonly card: Card | null;
  readonly reasoning: string;
  readonly points: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function buildFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }
  return deck;
}

// ─── Optimal Discard ────────────────────────────────────────────────────

/**
 * Calculate the optimal discard for coaching.
 *
 * Evaluates all C(6,2) = 15 discard combinations, computing the expected
 * hand value for each by averaging over all 46 possible starters. Uses
 * Schell rank-pair crib EV for dealer/pone position. Returns the best
 * discard with reasoning and a ranked list of all 15 options.
 */
export function optimalDiscard(
  hand: readonly Card[],
  isDealer: boolean,
): OptimalDiscardResult {
  const fullDeck = buildFullDeck();
  const handIds = new Set(hand.map(c => c.id));

  const options: DiscardOption[] = [];

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

      options.push({ discard, keep, expectedValue: totalValue });
    }
  }

  // Sort descending by expected value
  options.sort((a, b) => b.expectedValue - a.expectedValue);

  const best = options[0];

  // Generate reasoning
  const discardLabels = best.discard.map(c => `${c.rank}${c.suit}`).join(', ');
  const keepLabels = best.keep.map(c => `${c.rank}${c.suit}`).join(', ');
  const positionNote = isDealer
    ? 'As dealer, crib discards benefit you'
    : 'As pone, avoid giving opponent strong crib cards';
  const marginNote = options.length > 1
    ? ` (${(best.expectedValue - options[1].expectedValue).toFixed(2)} pts better than next option)`
    : '';

  const reasoning = `Keep ${keepLabels}, discard ${discardLabels}. `
    + `Expected value: ${best.expectedValue.toFixed(2)} pts. `
    + `${positionNote}${marginNote}.`;

  return {
    discard: best.discard,
    keep: best.keep,
    expectedValue: best.expectedValue,
    reasoning,
    allOptions: options,
  };
}

// ─── Optimal Pegging Play ───────────────────────────────────────────────

/**
 * Calculate the optimal card to play during pegging for coaching.
 *
 * Priority system:
 * 1. Make 31 (2 points)
 * 2. Make 15 (2 points)
 * 3. Make a pair with last card in pile (2 points)
 * 4. Extend a run in the pile (3+ points)
 * 5. Avoid leaving count at 5, 11, or 21 (easy opponent scoring)
 * 6. Play lowest value card
 *
 * Returns null card with Go reasoning when no play is possible.
 */
export function optimalPeggingPlay(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
): OptimalPlayResult {
  const playable = hand.filter(card => cardValue(card.rank) + count <= 31);

  if (playable.length === 0) {
    return {
      card: null,
      reasoning: 'No playable card — must declare Go.',
      points: 0,
    };
  }

  // Priority 1: Make 31
  const makes31 = playable.find(card => cardValue(card.rank) + count === 31);
  if (makes31) {
    return {
      card: makes31,
      reasoning: `Play ${makes31.rank}${makes31.suit} to make 31 for 2 points.`,
      points: 2,
    };
  }

  // Priority 2: Make 15
  const makes15 = playable.find(card => cardValue(card.rank) + count === 15);
  if (makes15) {
    return {
      card: makes15,
      reasoning: `Play ${makes15.rank}${makes15.suit} to make 15 for 2 points.`,
      points: 2,
    };
  }

  // Priority 3: Make a pair with last card in pile
  if (pile.length > 0) {
    const lastRank = pile[pile.length - 1].rank;
    const makesPair = playable.find(card => card.rank === lastRank);
    if (makesPair) {
      const newPile = [...pile, makesPair];
      const peggingScore = scorePeggingPlay(newPile);
      return {
        card: makesPair,
        reasoning: `Play ${makesPair.rank}${makesPair.suit} to make a pair for ${peggingScore.total} points.`,
        points: peggingScore.total,
      };
    }
  }

  // Priority 4: Extend a run in the pile
  if (pile.length >= 2) {
    let bestRunCard: Card | null = null;
    let bestRunScore = 0;
    for (const card of playable) {
      const newPile = [...pile, card];
      const score = scorePeggingPlay(newPile);
      if (score.runs > bestRunScore) {
        bestRunScore = score.runs;
        bestRunCard = card;
      }
    }
    if (bestRunCard) {
      const newPile = [...pile, bestRunCard];
      const peggingScore = scorePeggingPlay(newPile);
      return {
        card: bestRunCard,
        reasoning: `Play ${bestRunCard.rank}${bestRunCard.suit} to extend the run for ${peggingScore.total} points.`,
        points: peggingScore.total,
      };
    }
  }

  // Priority 5: Avoid dangerous counts (5, 11, 21)
  const DANGEROUS_COUNTS = new Set([5, 11, 21]);
  const safe = playable.filter(card => {
    const newCount = cardValue(card.rank) + count;
    return !DANGEROUS_COUNTS.has(newCount);
  });

  const candidates = safe.length > 0 ? safe : playable;

  // Play lowest value card
  const best = candidates.reduce((b, card) =>
    cardValue(card.rank) < cardValue(b.rank) ? card : b,
  );

  // Check if this play scores anything via pegging
  const newPile = [...pile, best];
  const peggingScore = scorePeggingPlay(newPile);
  const points = peggingScore.total;

  let reasoning: string;
  if (safe.length > 0 && safe.length < playable.length) {
    const avoided = playable
      .filter(c => !safe.includes(c))
      .map(c => `${c.rank}${c.suit} (would leave ${cardValue(c.rank) + count})`)
      .join(', ');
    reasoning = `Play ${best.rank}${best.suit} (lowest safe card). Avoided: ${avoided}.`;
  } else {
    reasoning = `Play ${best.rank}${best.suit} — lowest value card${points > 0 ? ` for ${points} points` : ''}.`;
  }

  return { card: best, reasoning, points };
}
