import type { Card } from './types';
import { cardValue, RANKS, SUITS } from './types';
import { scoreHand } from './scoring';
import { scorePeggingPlay } from './pegging';
import { lookupCribEV } from './crib-ev';
import { optimalPeggingPlay } from './optimal';

// ─── AI Difficulty ────────────────────────────────────────────────────────

/**
 * AI difficulty levels.
 * - easy:   grabs free 31/15, otherwise plays lowest card
 * - medium: full greedy heuristic (31 > 15 > pair > run > avoid {5,11,21} > lowest)
 * - hard:   Expectimax look-ahead via optimalPeggingPlay (20 det, depth 3)
 * - expert: same as hard (future: increase determinizations/depth)
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

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
 * Select the best card to play during pegging.
 *
 * Priority system (medium difficulty):
 * 1. Make 31 (2 points)
 * 2. Make 15 (2 points)
 * 3. Make a pair with last card in pile (2 points) — skipped in defense mode
 * 4. Extend a run in the pile (3+ points) — skipped in defense mode
 * 5. Avoid leaving count at 5, 11, or 21 (easy opponent scoring)
 * 6. Play lowest value card
 *
 * Optionally accepts scores for board-position-aware play (Theory of 26).
 * For hard/expert difficulty, uses Expectimax look-ahead via optimalPeggingPlay.
 * Returns null if no card is playable (must declare Go).
 */
export function aiSelectPlay(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
  myScore?: number,
  opponentScore?: number,
  isDealer?: boolean,
  difficulty?: AIDifficulty,
): Card | null {
  const playable = hand.filter(card => cardValue(card.rank) + count <= 31);

  if (playable.length === 0) return null;
  if (playable.length === 1) return playable[0]!;

  // ── Hard / Expert: Expectimax look-ahead ──────────────────────────────
  if (difficulty === 'hard' || difficulty === 'expert') {
    const result = optimalPeggingPlay(hand, pile, count);
    // optimalPeggingPlay returns null card only when no playable — already handled above
    return result.card;
  }

  // ── Easy: grab free 31/15, otherwise play lowest card ─────────────────
  if (difficulty === 'easy') {
    const makes31 = playable.find(card => cardValue(card.rank) + count === 31);
    if (makes31) return makes31;
    const makes15 = playable.find(card => cardValue(card.rank) + count === 15);
    if (makes15) return makes15;
    return playable.reduce((best, card) =>
      cardValue(card.rank) < cardValue(best.rank) ? card : best,
    );
  }

  // ── Medium (default): full greedy heuristic ───────────────────────────
  const mode = (myScore !== undefined && opponentScore !== undefined && isDealer !== undefined)
    ? getPositionMode(myScore, opponentScore, isDealer)
    : 'neutral';

  // Priority 1: Make 31
  const makes31 = playable.find(card => cardValue(card.rank) + count === 31);
  if (makes31) return makes31;

  // Priority 2: Make 15
  const makes15 = playable.find(card => cardValue(card.rank) + count === 15);
  if (makes15) return makes15;

  // Priority 3: Make a pair (skip in defense — opponent may have pair royal)
  if (pile.length > 0 && mode !== 'defense') {
    const lastRank = pile[pile.length - 1].rank;
    const makesPair = playable.find(card => card.rank === lastRank);
    if (makesPair) return makesPair;
  }

  // Priority 4: Extend a run in the pile (skip in defense — opponent may extend further)
  if (pile.length >= 2 && mode !== 'defense') {
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
    if (bestRunCard) return bestRunCard;
  }

  // Priority 5: Avoid leaving count at 5, 11, or 21
  const DANGEROUS_COUNTS = new Set([5, 11, 21]);
  const safe = playable.filter(card => {
    const newCount = cardValue(card.rank) + count;
    return !DANGEROUS_COUNTS.has(newCount);
  });

  if (safe.length > 0) {
    return safe.reduce((best, card) =>
      cardValue(card.rank) < cardValue(best.rank) ? card : best,
    );
  }

  // Priority 6: Fall back to lowest value card
  return playable.reduce((best, card) =>
    cardValue(card.rank) < cardValue(best.rank) ? card : best,
  );
}
