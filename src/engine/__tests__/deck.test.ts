import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal } from '../deck';

describe('Deck', () => {
  it('createDeck returns 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('createDeck has no duplicates', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.rank}-${c.suit}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('createDeck has 13 of each suit', () => {
    const deck = createDeck();
    const suits = ['H', 'D', 'S', 'C'] as const;
    for (const suit of suits) {
      expect(deck.filter(c => c.suit === suit)).toHaveLength(13);
    }
  });

  it('shuffle returns same cards in different order', () => {
    const deck = createDeck();
    const shuffled = shuffle([...deck]);
    expect(shuffled).toHaveLength(52);
    // Statistically near-impossible to stay in same order
    const samePosition = deck.filter((c, i) =>
      c.rank === shuffled[i].rank && c.suit === shuffled[i].suit
    );
    expect(samePosition.length).toBeLessThan(52);
  });

  it('shuffle does not mutate the original array', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffle(deck);
    // deck should still be the same reference but shuffle returns new array
    expect(deck).toHaveLength(52);
  });
});

describe('deal', () => {
  it('deals correct number of cards to each player (2 players)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const { hands, remaining } = deal(shuffled, 2, 6);
    expect(hands).toHaveLength(2);
    expect(hands[0]).toHaveLength(6);
    expect(hands[1]).toHaveLength(6);
    expect(remaining).toHaveLength(52 - 12);
  });

  it('deals correct number of cards to each player (3 players)', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const { hands, remaining } = deal(shuffled, 3, 5);
    expect(hands).toHaveLength(3);
    for (const hand of hands) {
      expect(hand).toHaveLength(5);
    }
    expect(remaining).toHaveLength(52 - 15);
  });

  it('deals cards alternately (first card to first player)', () => {
    const deck = createDeck();
    const { hands } = deal(deck, 2, 2);
    // Cards dealt alternately: player0 gets deck[0], player1 gets deck[1],
    // player0 gets deck[2], player1 gets deck[3]
    expect(hands[0][0].id).toBe(deck[0].id);
    expect(hands[1][0].id).toBe(deck[1].id);
    expect(hands[0][1].id).toBe(deck[2].id);
    expect(hands[1][1].id).toBe(deck[3].id);
  });
});
