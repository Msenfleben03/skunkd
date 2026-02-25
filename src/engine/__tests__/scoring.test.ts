import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import { createCard } from '../types';
import { scoreFifteens } from '../scoring';

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
