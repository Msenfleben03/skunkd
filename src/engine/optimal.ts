import type { Card } from './types';
import { DANGEROUS_PEG_COUNTS, cardValue } from './types';
import { createDeck } from './deck';
import { scoreHand } from './scoring';
import { scorePeggingPlay } from './pegging';
import { monteCartoCribEV } from './crib-ev';
import { expectimaxPeggingPlay } from './expectimax';
import { buildSynthPeggingState } from './synth-state';

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
  const fullDeck = createDeck();
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

      // Monte Carlo crib EV — pass full 6-card hand as knownCards
      const cribEV = monteCartoCribEV(discard, hand as Card[], 500);
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
 * Evaluate a single candidate card's Expectimax EV.
 * Returns 0 if the card is not playable at the current count.
 * Applies a -1.5 penalty when the resulting count is a known dangerous count
 * ({5, 11, 21}) that lets the opponent score immediately.
 */
function evalCandidateEV(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
  candidate: Card,
): number {
  const newCount = count + cardValue(candidate.rank);
  if (newCount > 31) return 0;
  const dangerPenalty = DANGEROUS_PEG_COUNTS.has(newCount) ? -1.5 : 0;
  const synthState = buildSynthPeggingState(hand, pile, count, candidate);
  return expectimaxPeggingPlay(synthState, 20, 3) + dangerPenalty;
}

/**
 * Calculate the optimal card to play during pegging for coaching.
 *
 * Uses Expectimax EV (20 determinizations, depth 3) to rank each playable
 * card, selecting the one with highest expected cumulative value. Falls back
 * to greedy immediate scoring to generate human-readable reasoning strings
 * (31, 15, pair, run, safe-play).
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

  // ── Expectimax EV ranking ──────────────────────────────────────────────
  // Score every playable card with Expectimax (immediate + look-ahead EV)
  let bestCard: Card = playable[0]!;
  let bestEV = -Infinity;
  for (const card of playable) {
    const ev = evalCandidateEV(hand, pile, count, card);
    if (ev > bestEV) {
      bestEV = ev;
      bestCard = card;
    }
  }

  // ── Immediate pegging score for the selected card ──────────────────────
  const newPile = [...pile, bestCard];
  const peggingScore = scorePeggingPlay(newPile);
  const newCount = count + cardValue(bestCard.rank);

  // ── Generate reasoning based on what the play achieves ────────────────
  let reasoning: string;

  if (newCount === 31) {
    reasoning = `Play ${bestCard.rank}${bestCard.suit} to make 31 for 2 points.`;
  } else if (newCount === 15) {
    reasoning = `Play ${bestCard.rank}${bestCard.suit} to make 15 for 2 points.`;
  } else if (pile.length > 0 && bestCard.rank === pile[pile.length - 1]!.rank) {
    reasoning = `Play ${bestCard.rank}${bestCard.suit} to make a pair for ${peggingScore.total} points.`;
  } else if (peggingScore.runs > 0) {
    reasoning = `Play ${bestCard.rank}${bestCard.suit} to extend the run for ${peggingScore.total} points.`;
  } else {
    // Describe safe-play or neutral reasoning
    const avoidsOnlyDangerous = playable.every(c => {
      const nc = count + cardValue(c.rank);
      return nc === newCount || DANGEROUS_PEG_COUNTS.has(nc);
    });

    if (avoidsOnlyDangerous && playable.length > 1) {
      const avoided = playable
        .filter(c => c !== bestCard)
        .map(c => `${c.rank}${c.suit} (would leave ${cardValue(c.rank) + count})`)
        .join(', ');
      reasoning = `Play ${bestCard.rank}${bestCard.suit} (lowest safe card). Avoided: ${avoided}.`;
    } else {
      reasoning = `Play ${bestCard.rank}${bestCard.suit} — highest Expectimax EV (${bestEV.toFixed(2)} pts)${peggingScore.total > 0 ? ` for ${peggingScore.total} points` : ''}.`;
    }
  }

  // scorePeggingPlay sums the pile directly, so 15/31 must use newCount instead.
  const fifteen = newCount === 15 ? 2 : 0;
  const thirtyone = newCount === 31 ? 2 : 0;
  const points = peggingScore.pairs + peggingScore.runs + fifteen + thirtyone;

  return { card: bestCard, reasoning, points };
}
