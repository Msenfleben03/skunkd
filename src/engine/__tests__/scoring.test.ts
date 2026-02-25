import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import { createCard } from '../types';
import { scoreFifteens, scorePairs, scoreRuns, scoreFlush, scoreNobs } from '../scoring';

/** Helper to create cards concisely */
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return createCard(rank, suit);
}

describe('scoreFifteens', () => {
  it('scores three fifteens: 5+10, 5+3+7, 2+3+10', () => {
    const cards = [card('5', 'H'), card('10', 'S'), card('2', 'D'), card('3', 'C'), card('7', 'H')];
    expect(scoreFifteens(cards)).toBe(6);
  });

  it('scores 7+8 = 2 points', () => {
    const cards = [card('7', 'H'), card('8', 'S'), card('A', 'D'), card('2', 'C'), card('3', 'H')];
    expect(scoreFifteens(cards)).toBe(2);
  });

  it('scores three-card fifteen (5+4+6)', () => {
    const cards = [card('5', 'H'), card('4', 'S'), card('6', 'D'), card('A', 'C'), card('2', 'H')];
    expect(scoreFifteens(cards)).toBe(2);
  });

  it('scores multiple fifteens from 5,5,5,J,K', () => {
    // 5+J=15 x3 (each 5 with J) = 3 fifteens
    // 5+K=15 x3 (each 5 with K) = 3 fifteens
    // 5+5+5=15 x1 = 1 fifteen
    // J+5 already counted, K+5 already counted
    // Total: 7 fifteens = 14 points
    // Wait, let me recount carefully:
    // Pairs of cards that sum to 15: 5H+JC, 5S+JC, 5D+JC, 5H+KH, 5S+KH, 5D+KH = 6
    // Triples: 5H+5S+5D = 15 = 1
    // No 4-card or 5-card combos sum to 15 (5+5+5+10+10=35, etc.)
    // Total: 7 fifteens = 14 points
    const cards = [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('J', 'C'), card('K', 'H')];
    expect(scoreFifteens(cards)).toBe(14);
  });

  it('scores the perfect 29-hand fifteens (5,5,5,J + starter 5)', () => {
    // All four 5s + J of matching suit + starter 5
    // Pairs summing to 15: 5+J x4 = 4
    // Triples summing to 15: 5+5+5 x4 (C(4,3)=4 ways to pick three 5s) = 4
    // Total: 8 fifteens = 16 points
    const cards = [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('J', 'C'), card('5', 'C')];
    expect(scoreFifteens(cards)).toBe(16);
  });

  it('scores one fifteen: 2+3+4+6 = 15', () => {
    const cards = [card('A', 'H'), card('2', 'S'), card('3', 'D'), card('4', 'C'), card('6', 'H')];
    expect(scoreFifteens(cards)).toBe(2);
  });

  it('scores zero when no fifteens exist', () => {
    // A(1)+3+6+Q(10)+K(10) — no subset sums to 15
    const cards = [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('Q', 'C'), card('K', 'S')];
    expect(scoreFifteens(cards)).toBe(0);
  });

  it('scores five-card fifteen (A+2+3+4+5)', () => {
    const cards = [card('A', 'H'), card('2', 'S'), card('3', 'D'), card('4', 'C'), card('5', 'H')];
    expect(scoreFifteens(cards)).toBe(2);
  });

  it('scores four-card fifteen (A+4+K+Q) - no, that is 25. Use A+4+J = 15? No, 1+4+10=15', () => {
    // A+4+J = 1+4+10 = 15
    const cards = [card('A', 'H'), card('4', 'S'), card('J', 'D'), card('8', 'C'), card('9', 'H')];
    // A+4+J = 15, 8+J = no(18), 9+? ... let me recalc
    // A(1)+4+J(10)=15 ✓
    // A(1)+4+8+9 = 22 ✗
    // 8+? = no pairs to 15 with remaining
    // Just 1 fifteen = 2 points
    // Wait: also check A+5 but no 5... just A+4+J=15
    // But also: 9+4+A+? no... let me just check exhaustively
    // Only fifteen: A+4+J = 15
    expect(scoreFifteens(cards)).toBe(2);
  });
});

describe('scorePairs', () => {
  it('scores a single pair = 2 points', () => {
    const cards = [card('5', 'H'), card('5', 'S'), card('3', 'D'), card('8', 'C'), card('K', 'H')];
    expect(scorePairs(cards)).toBe(2);
  });

  it('scores pair royal (three of a kind) = 6 points', () => {
    const cards = [card('7', 'H'), card('7', 'S'), card('7', 'D'), card('2', 'C'), card('K', 'H')];
    expect(scorePairs(cards)).toBe(6);
  });

  it('scores double pair royal (four of a kind) = 12 points', () => {
    const cards = [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('5', 'C'), card('J', 'H')];
    expect(scorePairs(cards)).toBe(12);
  });

  it('scores two different pairs = 4 points', () => {
    const cards = [card('3', 'H'), card('3', 'S'), card('9', 'D'), card('9', 'C'), card('K', 'H')];
    expect(scorePairs(cards)).toBe(4);
  });

  it('scores no pairs = 0 points', () => {
    const cards = [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('9', 'C'), card('K', 'H')];
    expect(scorePairs(cards)).toBe(0);
  });
});

describe('scoreRuns', () => {
  it('scores a simple run of 3', () => {
    const cards = [card('3', 'H'), card('4', 'S'), card('5', 'D'), card('9', 'C'), card('K', 'H')];
    expect(scoreRuns(cards)).toBe(3);
  });

  it('scores a run of 4', () => {
    const cards = [card('3', 'H'), card('4', 'S'), card('5', 'D'), card('6', 'C'), card('K', 'H')];
    expect(scoreRuns(cards)).toBe(4);
  });

  it('scores a run of 5', () => {
    const cards = [card('A', 'H'), card('2', 'S'), card('3', 'D'), card('4', 'C'), card('5', 'H')];
    expect(scoreRuns(cards)).toBe(5);
  });

  it('scores double run: 3-4-4-5-6 = TWO runs of 4 = 8 points', () => {
    const cards = [card('3', 'H'), card('4', 'S'), card('4', 'D'), card('5', 'C'), card('6', 'H')];
    expect(scoreRuns(cards)).toBe(8);
  });

  it('scores double run of 3: 3-4-4-5 = TWO runs of 3 = 6 points', () => {
    const cards = [card('3', 'H'), card('4', 'S'), card('4', 'D'), card('5', 'C'), card('K', 'H')];
    expect(scoreRuns(cards)).toBe(6);
  });

  it('scores double-double run: 3-3-4-4-5 = FOUR runs of 3 = 12 points', () => {
    const cards = [card('3', 'H'), card('3', 'S'), card('4', 'D'), card('4', 'C'), card('5', 'H')];
    expect(scoreRuns(cards)).toBe(12);
  });

  it('scores triple run: 3-3-3-4-5 = THREE runs of 3 = 9 points', () => {
    const cards = [card('3', 'H'), card('3', 'S'), card('3', 'D'), card('4', 'C'), card('5', 'H')];
    expect(scoreRuns(cards)).toBe(9);
  });

  it('scores no run when cards are not consecutive', () => {
    const cards = [card('2', 'H'), card('4', 'S'), card('6', 'D'), card('8', 'C'), card('10', 'H')];
    expect(scoreRuns(cards)).toBe(0);
  });

  it('scores no run for only 2 consecutive ranks', () => {
    const cards = [card('3', 'H'), card('4', 'S'), card('8', 'D'), card('J', 'C'), card('K', 'H')];
    expect(scoreRuns(cards)).toBe(0);
  });

  it('scores run with face cards: J-Q-K', () => {
    const cards = [card('J', 'H'), card('Q', 'S'), card('K', 'D'), card('2', 'C'), card('7', 'H')];
    expect(scoreRuns(cards)).toBe(3);
  });

  it('scores run with A-2-3 (A is low)', () => {
    const cards = [card('A', 'H'), card('2', 'S'), card('3', 'D'), card('8', 'C'), card('K', 'H')];
    expect(scoreRuns(cards)).toBe(3);
  });
});

describe('scoreFlush', () => {
  it('scores 4-card hand flush = 4 points', () => {
    const hand = [card('2', 'H'), card('5', 'H'), card('8', 'H'), card('J', 'H')];
    const starter = card('K', 'S'); // different suit
    expect(scoreFlush(hand, starter, false)).toBe(4);
  });

  it('scores 5-card flush (hand + starter) = 5 points', () => {
    const hand = [card('2', 'H'), card('5', 'H'), card('8', 'H'), card('J', 'H')];
    const starter = card('K', 'H'); // same suit
    expect(scoreFlush(hand, starter, false)).toBe(5);
  });

  it('scores 0 for no flush', () => {
    const hand = [card('2', 'H'), card('5', 'S'), card('8', 'H'), card('J', 'H')];
    const starter = card('K', 'H');
    expect(scoreFlush(hand, starter, false)).toBe(0);
  });

  it('crib: 4-card flush = 0 points (must be 5-card)', () => {
    const hand = [card('2', 'H'), card('5', 'H'), card('8', 'H'), card('J', 'H')];
    const starter = card('K', 'S'); // different suit
    expect(scoreFlush(hand, starter, true)).toBe(0);
  });

  it('crib: 5-card flush = 5 points', () => {
    const hand = [card('2', 'H'), card('5', 'H'), card('8', 'H'), card('J', 'H')];
    const starter = card('K', 'H'); // same suit
    expect(scoreFlush(hand, starter, true)).toBe(5);
  });

  it('starter matching 3-of-4 hand suit does not make flush', () => {
    const hand = [card('2', 'H'), card('5', 'H'), card('8', 'H'), card('J', 'S')];
    const starter = card('K', 'H');
    expect(scoreFlush(hand, starter, false)).toBe(0);
  });
});

describe('scoreNobs', () => {
  it('scores 1 point for Jack in hand matching starter suit', () => {
    const hand = [card('3', 'H'), card('J', 'S'), card('7', 'D'), card('9', 'C')];
    const starter = card('K', 'S'); // J of Spades matches starter Spades
    expect(scoreNobs(hand, starter)).toBe(1);
  });

  it('scores 0 when no Jack in hand', () => {
    const hand = [card('3', 'H'), card('5', 'S'), card('7', 'D'), card('9', 'C')];
    const starter = card('K', 'S');
    expect(scoreNobs(hand, starter)).toBe(0);
  });

  it('scores 0 when Jack suit does not match starter', () => {
    const hand = [card('3', 'H'), card('J', 'H'), card('7', 'D'), card('9', 'C')];
    const starter = card('K', 'S'); // J of Hearts != starter Spades
    expect(scoreNobs(hand, starter)).toBe(0);
  });

  it('scores 0 when Jack IS the starter (His Heels, not Nobs)', () => {
    const hand = [card('3', 'H'), card('5', 'S'), card('7', 'D'), card('9', 'C')];
    const starter = card('J', 'S'); // Jack as starter = His Heels, not Nobs
    expect(scoreNobs(hand, starter)).toBe(0);
  });

  it('scores 1 when one of multiple Jacks matches', () => {
    const hand = [card('J', 'H'), card('J', 'S'), card('7', 'D'), card('9', 'C')];
    const starter = card('K', 'S'); // J of Spades matches
    expect(scoreNobs(hand, starter)).toBe(1);
  });
});
