import { describe, it, expect } from 'vitest';
import { cardValue, rankOrder, isRed, cardLabel, createCard, RANKS, SUITS } from '../types';

describe('Card utilities', () => {
  it('cardValue returns correct pip values', () => {
    expect(cardValue('A')).toBe(1);
    expect(cardValue('2')).toBe(2);
    expect(cardValue('5')).toBe(5);
    expect(cardValue('9')).toBe(9);
    expect(cardValue('10')).toBe(10);
    expect(cardValue('J')).toBe(10);
    expect(cardValue('Q')).toBe(10);
    expect(cardValue('K')).toBe(10);
  });

  it('rankOrder returns sort order (A=1, K=13)', () => {
    expect(rankOrder('A')).toBe(1);
    expect(rankOrder('2')).toBe(2);
    expect(rankOrder('10')).toBe(10);
    expect(rankOrder('J')).toBe(11);
    expect(rankOrder('Q')).toBe(12);
    expect(rankOrder('K')).toBe(13);
  });

  it('isRed identifies red suits', () => {
    expect(isRed('H')).toBe(true);
    expect(isRed('D')).toBe(true);
    expect(isRed('S')).toBe(false);
    expect(isRed('C')).toBe(false);
  });

  it('createCard creates a card with rank, suit, and id', () => {
    const card = createCard('A', 'S');
    expect(card.rank).toBe('A');
    expect(card.suit).toBe('S');
    expect(card.id).toBe('A-S');
  });

  it('cardLabel formats display string', () => {
    expect(cardLabel(createCard('A', 'S'))).toBe('A of Spades');
    expect(cardLabel(createCard('10', 'H'))).toBe('10 of Hearts');
    expect(cardLabel(createCard('K', 'D'))).toBe('K of Diamonds');
    expect(cardLabel(createCard('J', 'C'))).toBe('J of Clubs');
  });

  it('RANKS has 13 ranks', () => {
    expect(RANKS).toHaveLength(13);
  });

  it('SUITS has 4 suits', () => {
    expect(SUITS).toHaveLength(4);
  });
});
