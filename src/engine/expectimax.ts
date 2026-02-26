import type { Card, GameState, Rank, Suit } from './types';
import { RANKS, SUITS, cardValue, createCard } from './types';
import { scorePeggingPlay } from './pegging';

// ---------------------------------------------------------------------------
// Seeded randomization utilities
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function seededShuffle<T>(items: T[], seed: string | number): T[] {
  const arr = [...items];
  // mulberry32 seeded RNG
  let s = typeof seed === 'string' ? hashString(seed) : (seed | 0);
  const rng = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Full 52-card deck builder
// ---------------------------------------------------------------------------

function buildFullDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(createCard(rank as Rank, suit as Suit));
    }
  }
  return deck;
}

// ---------------------------------------------------------------------------
// randomizeOpponentHand — exported for testing
// ---------------------------------------------------------------------------

/**
 * Replace the opponent's (player index = currentPlayerIndex+1) unknown hand
 * with a random sample from the cards not otherwise accounted for.
 *
 * "Known" cards that are excluded from the random pool:
 *   - pegging.pile   (all cards played so far in the current pegging round)
 *   - players[currentPlayerIndex].hand  (we know our own cards)
 *   - starter        (if revealed)
 *
 * The opponent's current hand is treated as unknown and replaced.
 * Hand size is preserved.
 */
export function randomizeOpponentHand(
  gameState: GameState,
  seed: string | number,
): GameState {
  const currentPlayerIndex = gameState.pegging.currentPlayerIndex;
  const opponentIndex = (currentPlayerIndex + 1) % gameState.players.length;

  // Build set of known card ids
  const knownIds = new Set<string>();

  // Cards in the pegging pile
  for (const card of gameState.pegging.pile) {
    knownIds.add(card.id);
  }

  // Our own hand
  for (const card of gameState.players[currentPlayerIndex]!.hand) {
    knownIds.add(card.id);
  }

  // Starter card
  if (gameState.starter !== null) {
    knownIds.add(gameState.starter.id);
  }

  // Cards in other players' hands (if any beyond the two players)
  for (let i = 0; i < gameState.players.length; i++) {
    if (i === currentPlayerIndex || i === opponentIndex) continue;
    for (const card of gameState.players[i]!.hand) {
      knownIds.add(card.id);
    }
  }

  // Remaining available cards (full deck minus known)
  const available = buildFullDeck().filter(c => !knownIds.has(c.id));

  // Shuffle with seed
  const shuffled = seededShuffle(available, seed);

  // Take N cards where N = opponent hand size
  const opponentHandSize = gameState.players[opponentIndex]!.hand.length;
  const newOpponentHand = shuffled.slice(0, opponentHandSize);

  // Build new players array with opponent hand replaced
  const newPlayers = gameState.players.map((p, i) => {
    if (i !== opponentIndex) return p;
    return { ...p, hand: newOpponentHand };
  });

  return { ...gameState, players: newPlayers };
}

// ---------------------------------------------------------------------------
// selectBestPeggingCard — greedy priority card selection (mirrors ai.ts)
// ---------------------------------------------------------------------------

/**
 * Greedy pegging card selection following the same priority as aiSelectPlay:
 * 1. Make 31
 * 2. Make 15
 * 3. Make a pair with last card in pile
 * 4. Extend a run in the pile
 * 5. Avoid leaving count at 5, 11, or 21
 * 6. Play lowest value card
 */
function selectBestPeggingCard(playable: Card[], pile: readonly Card[]): Card {
  const count = pile.reduce((sum, c) => sum + cardValue(c.rank), 0);

  // Priority 1: Make 31
  const makes31 = playable.find(card => cardValue(card.rank) + count === 31);
  if (makes31) return makes31;

  // Priority 2: Make 15
  const makes15 = playable.find(card => cardValue(card.rank) + count === 15);
  if (makes15) return makes15;

  // Priority 3: Make a pair with last card in pile
  if (pile.length > 0) {
    const lastRank = pile[pile.length - 1]!.rank;
    const makesPair = playable.find(card => card.rank === lastRank);
    if (makesPair) return makesPair;
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
    if (bestRunCard) return bestRunCard;
  }

  // Priority 5: Avoid dangerous counts (5, 11, 21)
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

  // Priority 6: Lowest value card
  return playable.reduce((best, card) =>
    cardValue(card.rank) < cardValue(best.rank) ? card : best,
  );
}

// ---------------------------------------------------------------------------
// greedyRollout — internal simulation function
// ---------------------------------------------------------------------------

/**
 * Simulate D plays ahead greedily, alternating between current player and
 * opponent. Returns cumulative score from the perspective of the current player.
 *
 * @param pile        - Current pegging sequence (cards played this round, for
 *                      run/pair scoring context).
 * @param currentHand - Cards remaining in current player's hand
 * @param opponentHand - Cards remaining in opponent's hand (determinized)
 * @param depth       - Number of plays to look ahead
 * @param count       - Running pegging count. Must be passed explicitly; it may
 *                      differ from pile.reduce(sum) when the initial state is a
 *                      synthetic state where pile does not reflect all prior plays
 *                      (e.g. when evaluating a single candidate card from mid-peg).
 * @returns Expected score for current player from this position
 */
function greedyRollout(
  pile: readonly Card[],
  currentHand: Card[],
  opponentHand: Card[],
  depth: number,
  count: number,
): number {
  if (depth === 0) return 0;

  // Find current player's playable cards
  const playable = currentHand.filter(c => count + cardValue(c.rank) <= 31);

  if (playable.length === 0) {
    // Go — opponent plays
    const opponentPlayable = opponentHand.filter(c => count + cardValue(c.rank) <= 31);
    if (opponentPlayable.length === 0) {
      // Both can't play — end this count sequence
      return 0;
    }

    // NOTE: depth tick is consumed by opponent-go path; minor bias acceptable for depth <= 5
    const bestOpponentCard = selectBestPeggingCard(opponentPlayable, pile);
    const tentativeOpponentPile = [...pile, bestOpponentCard];
    const opponentCount = count + cardValue(bestOpponentCard.rank);
    // Reset pile to [] if opponent scores exactly 31; play continues with fresh count
    const newPile = opponentCount === 31 ? [] : tentativeOpponentPile;
    const newCount = opponentCount === 31 ? 0 : opponentCount;
    // Opponent scoring does NOT contribute to our EV (it's their gain, our loss)
    const newOpponentHand = opponentHand.filter(
      c => !(c.rank === bestOpponentCard.rank && c.suit === bestOpponentCard.suit),
    );

    // After opponent plays, it's our turn again
    return greedyRollout(newPile, currentHand, newOpponentHand, depth - 1, newCount);
  }

  // Current player plays best card (greedy)
  const bestCard = selectBestPeggingCard(playable, pile);
  const tentativePile = [...pile, bestCard];
  const newCount = count + cardValue(bestCard.rank);
  // Score the play using the tentative pile for run/pair context, but override
  // the pile-sum-based count detection with the actual running count.
  // scorePeggingPlay computes count internally from pile.reduce(), so we need
  // to build a pile whose sum equals newCount for correct 15/31 detection.
  // Since tentativePile may start from a synthetic empty pile (count mismatch),
  // we score pairs/runs from tentativePile and detect 15/31 from newCount directly.
  const pairsAndRuns = scorePeggingPlay(tentativePile);
  const fifteen = newCount === 15 ? 2 : 0;
  const thirtyone = newCount === 31 ? 2 : 0;
  const immediateScore = pairsAndRuns.pairs + pairsAndRuns.runs + fifteen + thirtyone;

  const newCurrentHand = currentHand.filter(
    c => !(c.rank === bestCard.rank && c.suit === bestCard.suit),
  );
  // Reset pile to [] if current player scores exactly 31; play continues with fresh count
  const newPile = newCount === 31 ? [] : tentativePile;
  const nextCount = newCount === 31 ? 0 : newCount;

  // After current player plays, it's opponent's turn
  return immediateScore + greedyRollout(newPile, opponentHand, newCurrentHand, depth - 1, nextCount);
}

// ---------------------------------------------------------------------------
// expectimaxPeggingPlay — main exported function
// ---------------------------------------------------------------------------

/**
 * Expectimax pegging evaluation.
 * Averages expected score over N determinizations of opponent's unknown hand,
 * with greedy rollout to depth D.
 *
 * @param gameState - Current game state with pegging pile
 * @param myScore - Current player score
 * @param opponentScore - Opponent score
 * @param determinizations - Number of random hand samples (default 20)
 * @param depth - Lookahead depth in plays (default 3)
 * @param seed - Optional seed for reproducibility
 * @returns Expected value (points) of current position
 */
export function expectimaxPeggingPlay(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  determinizations: number = 20,
  depth: number = 3,
  seed?: number,
): number {
  void myScore;
  void opponentScore;

  const currentPlayerIndex = gameState.pegging.currentPlayerIndex;
  const myHand = [...gameState.players[currentPlayerIndex]!.hand];

  // If no hand cards, nothing to evaluate
  if (myHand.length === 0 && depth > 0) {
    // Still run determinizations — opponent may score
    // Return 0 as we have nothing to play
    return 0;
  }

  let totalEv = 0;

  for (let i = 0; i < determinizations; i++) {
    const detSeed = seed !== undefined ? seed + i : i * 31337;
    const detState = randomizeOpponentHand(gameState, detSeed);
    const opponentIndex = (currentPlayerIndex + 1) % 2;
    const opponentHand = [...detState.players[opponentIndex]!.hand];

    const ev = greedyRollout(gameState.pegging.sequence, myHand, opponentHand, depth, gameState.pegging.count);
    totalEv += ev;
  }

  return totalEv / determinizations;
}
