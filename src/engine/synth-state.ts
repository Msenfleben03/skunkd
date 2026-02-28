import type { Card, GameState, PeggingState, PlayerState } from './types';
import { cardValue } from './types';
import { createDeck } from './deck';

/**
 * Build a minimal synthetic GameState for evaluating a single candidate card
 * during pegging, suitable for passing to expectimaxPeggingPlay.
 *
 * The candidate card is placed as the sole card in the current player's hand,
 * forcing Expectimax to evaluate it first. The opponent's hand is given a
 * realistic placeholder size that randomizeOpponentHand will replace with
 * random draws from the available pool.
 *
 * @param hand      - Full hand at decision time (all remaining cards)
 * @param pile      - Current pegging pile (sequence of played cards)
 * @param count     - Current pegging count
 * @param candidate - The single card being evaluated
 */
export function buildSynthPeggingState(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
  candidate: Card,
): GameState {
  // Opponent hand size: mirror remaining cards minus the one we're about to play
  // Clamp to [0, 4] — max pegging hand after discard is 4 cards
  const opponentHandSize = Math.max(0, Math.min(4, hand.length - 1));

  // Build placeholder opponent cards from cards not in the pile or our hand
  const knownIds = new Set<string>([
    ...pile.map(c => c.id),
    ...hand.map(c => c.id),
  ]);
  const opponentPlaceholders = createDeck()
    .filter(c => !knownIds.has(c.id))
    .slice(0, opponentHandSize);

  const currentPlayerIndex = 0;

  const currentPlayer: PlayerState = {
    hand: [candidate],
    score: 0,
    pegFront: 0,
    pegBack: 0,
  };

  const opponentPlayer: PlayerState = {
    hand: opponentPlaceholders,
    score: 0,
    pegFront: 0,
    pegBack: 0,
  };

  const pegging: PeggingState = {
    count,
    pile,
    sequence: pile,
    currentPlayerIndex,
    goState: [false, false],
    playerCards: [[candidate], opponentPlaceholders],
    lastCardPlayerIndex: null,
  };

  return {
    phase: 'PEGGING',
    deck: [],
    players: [currentPlayer, opponentPlayer],
    crib: [],
    starter: null,
    dealerIndex: 1,
    handNumber: 1,
    pegging,
    handStats: [
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ],
    winner: null,
    decisionLog: [],
    handStatsHistory: [],
  };
}

/**
 * Evaluate a single candidate card's Expectimax EV using the shared synth state builder.
 * Returns 0 if the card is not playable at the current count.
 * Applies a -1.5 penalty when the resulting count is a known dangerous count
 * ({5, 11, 21}) that lets the opponent score immediately.
 */
export function evalCandidateEV(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
  candidate: Card,
  expectimaxFn: (state: GameState, dets?: number, depth?: number) => number,
  dangerousCounts: ReadonlySet<number>,
): number {
  const newCount = count + cardValue(candidate.rank);
  if (newCount > 31) return 0;
  const dangerPenalty = dangerousCounts.has(newCount) ? -1.5 : 0;
  const synthState = buildSynthPeggingState(hand, pile, count, candidate);
  return expectimaxFn(synthState, 20, 3) + dangerPenalty;
}
