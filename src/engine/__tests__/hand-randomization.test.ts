import { describe, it, expect } from 'vitest';
import type { Card, GameState, PeggingState } from '../types';
import { createCard } from '../types';
import { randomizeOpponentHand } from '../expectimax';
import { createGame } from '../gameState';

/** Helper to create cards concisely */
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return createCard(rank, suit);
}

/**
 * Build a minimal PEGGING-phase GameState where player 0 has 4 known cards
 * and player 1 (opponent) has 4 known cards that randomization will replace.
 *
 * currentPlayerIndex = 1 (non-dealer plays first), so the function treats
 * player 1 as the "current" player and player 0 as the opponent to randomize.
 * We set currentPlayerIndex = 0 so player 0 is the current player and
 * player 1 is the opponent whose hand gets randomized.
 */
function makePeggingState(overrides: Partial<GameState> = {}): GameState {
  const player0Hand = [
    card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H'),
  ];
  const player1Hand = [
    card('6', 'S'), card('7', 'S'), card('8', 'S'), card('9', 'S'),
  ];
  const starterCard = card('K', 'D');

  const pegging: PeggingState = {
    count: 0,
    pile: [],
    sequence: [],
    currentPlayerIndex: 0, // player 0 is "us", player 1 is opponent
    goState: [false, false],
    playerCards: [player0Hand, player1Hand],
    lastCardPlayerIndex: null,
  };

  const base: GameState = {
    phase: 'PEGGING',
    deck: [],
    players: [
      { hand: player0Hand, score: 0, pegFront: 0, pegBack: 0 },
      { hand: player1Hand, score: 0, pegFront: 0, pegBack: 0 },
    ],
    crib: [],
    starter: starterCard,
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

  return { ...base, ...overrides };
}

describe('randomizeOpponentHand', () => {
  it('should not include cards already in the pile', () => {
    const gameState = makePeggingState();
    const randomized = randomizeOpponentHand(gameState, 'test-seed');

    // Ensure no duplicate cards exist across pile + both hands + starter
    const allCards = [
      ...randomized.pegging.pile,
      ...randomized.players.flatMap(p => p.hand),
      ...(randomized.starter ? [randomized.starter] : []),
    ];
    const cardKeys = allCards.map(c => `${c.rank}${c.suit}`);
    const uniqueKeys = new Set(cardKeys);
    expect(uniqueKeys.size).toBe(cardKeys.length); // No duplicates
  });

  it('should be deterministic with same seed', () => {
    const gameState = makePeggingState();
    const rand1 = randomizeOpponentHand(gameState, 'seed123');
    const rand2 = randomizeOpponentHand(gameState, 'seed123');

    const cards1 = rand1.players[1]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    const cards2 = rand2.players[1]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    expect(cards1).toBe(cards2);
  });

  it('should vary with different seeds', () => {
    // Use a state with 4 cards in the opponent's hand so randomization is
    // meaningful: the opponent's 4 cards are replaced by random draws from
    // the ~43 remaining unknown cards. Different seeds must produce a
    // different shuffle, so the resulting hands should differ.
    const gameState = makePeggingState();

    // Run enough seed pairs to confirm variation is happening.
    // With 4 cards drawn from ~43, the probability that two distinct seeds
    // produce the exact same hand is astronomically small (~1 in 135,000).
    const seeds = ['seedA', 'seedB', 'seedC', 'seedD', 'seedE'];
    const results = seeds.map(s =>
      randomizeOpponentHand(gameState, s).players[1]!.hand
        .map(c => `${c.rank}${c.suit}`)
        .sort()
        .join(',')
    );

    // Confirm each result is a non-empty 4-card hand
    for (const result of results) {
      expect(result.split(',').length).toBe(4);
    }

    // Confirm that not all results are the same — different seeds must
    // produce at least one different outcome across the 5 trials.
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBeGreaterThan(1);
  });

  it('should not modify player 0 hand', () => {
    const gameState = makePeggingState();
    const randomized = randomizeOpponentHand(gameState, 'test');

    // Player 0 (current player) hand should be unchanged — only opponent is randomized
    const originalCards = gameState.players[0]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    const randomizedCards = randomized.players[0]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    expect(randomizedCards).toBe(originalCards);
  });

  it('should preserve opponent hand size', () => {
    const gameState = makePeggingState();
    const originalSize = gameState.players[1]!.hand.length; // 4 cards
    const randomized = randomizeOpponentHand(gameState, 'size-test');
    expect(randomized.players[1]!.hand.length).toBe(originalSize);
  });

  it('should generate valid cards from the 52-card deck', () => {
    const gameState = makePeggingState();
    const randomized = randomizeOpponentHand(gameState, 'valid-cards');

    const validRanks = new Set(['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']);
    const validSuits = new Set(['H', 'D', 'S', 'C']);

    for (const player of randomized.players) {
      for (const c of player.hand) {
        expect(validRanks.has(c.rank)).toBe(true);
        expect(validSuits.has(c.suit)).toBe(true);
      }
    }
  });

  it('should not include player 0 known cards in the randomized opponent hand', () => {
    const gameState = makePeggingState();
    const randomized = randomizeOpponentHand(gameState, 'no-overlap');

    // Player 0's hand cards must not appear in player 1's randomized hand
    const p0Keys = new Set(gameState.players[0]!.hand.map(c => `${c.rank}-${c.suit}`));
    for (const c of randomized.players[1]!.hand) {
      expect(p0Keys.has(`${c.rank}-${c.suit}`)).toBe(false);
    }
  });

  it('should not include the starter in the randomized opponent hand', () => {
    const gameState = makePeggingState();
    const randomized = randomizeOpponentHand(gameState, 'no-starter');

    // The starter (K-D) must not appear in the randomized opponent hand
    const starterKey = `${gameState.starter!.rank}-${gameState.starter!.suit}`;
    for (const c of randomized.players[1]!.hand) {
      expect(`${c.rank}-${c.suit}`).not.toBe(starterKey);
    }
  });

  it('should handle a fresh createGame state without errors (empty hands)', () => {
    // createGame starts in DEALING with empty hands — opponent has 0 cards.
    // randomizeOpponentHand should return a valid state with an empty opponent hand.
    const gameState = createGame(2);
    const randomized = randomizeOpponentHand(gameState, 'empty-hands');
    expect(randomized.players).toHaveLength(2);
    expect(randomized.players[1]!.hand).toHaveLength(0); // 0 cards to randomize
  });

  it('should not include cards currently in the pile in the randomized opponent hand', () => {
    // Construct a state where some cards have already been played into the pile.
    // The pile cards must not appear in the randomized opponent hand.
    const pileCards = [
      card('5', 'C'), // a 5 of clubs played into the pile
      card('J', 'H'), // a jack of hearts played into the pile
    ];

    const base = makePeggingState();
    // Override the pegging state to include pile cards, keeping the pile-based
    // count and sequence consistent. makePeggingState accepts Partial<GameState>
    // so we inject a modified pegging object.
    const peggingWithPile: PeggingState = {
      ...base.pegging,
      pile: pileCards,
      sequence: pileCards,
      count: pileCards.reduce((sum, c) => sum + (c.rank === 'J' ? 10 : Number(c.rank)), 0),
    };
    const gameState = makePeggingState({ pegging: peggingWithPile });

    // Run randomization several times with different seeds to be thorough
    const seeds = ['pile-seed-1', 'pile-seed-2', 'pile-seed-3'];
    for (const s of seeds) {
      const randomized = randomizeOpponentHand(gameState, s);
      const opponentHand = randomized.players[1]!.hand;

      // No pile card may appear in the randomized opponent hand
      const pileKeys = new Set(pileCards.map(c => `${c.rank}-${c.suit}`));
      for (const c of opponentHand) {
        expect(pileKeys.has(`${c.rank}-${c.suit}`)).toBe(false);
      }
    }
  });
});
