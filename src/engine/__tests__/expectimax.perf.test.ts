import { describe, it, expect } from 'vitest';
import { createCard } from '../types';
import type { Rank, Suit } from '../types';
import { expectimaxPeggingPlay } from '../expectimax';
import { optimalPeggingPlay } from '../optimal';
import { aiSelectPlay } from '../ai';
import { createGame } from '../gameState';

function c(rank: Rank, suit: Suit) {
  return createCard(rank, suit);
}

describe('Expectimax pegging performance', () => {
  // ── expectimaxPeggingPlay raw benchmarks ──────────────────────────────

  it('20 determinizations, depth 3 completes in <50ms', () => {
    const gameState = createGame(2);
    const start = performance.now();
    expectimaxPeggingPlay(gameState, 0, 0, 20, 3, 42);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('50 determinizations, depth 5 completes in <200ms', () => {
    const gameState = createGame(2);
    const start = performance.now();
    expectimaxPeggingPlay(gameState, 0, 0, 50, 5, 42);
    expect(performance.now() - start).toBeLessThan(200);
  });

  // ── optimalPeggingPlay (4-card hand, realistic mid-game) ──────────────

  it('optimalPeggingPlay with 4-card hand completes in <500ms', () => {
    const hand = [c('6', 'D'), c('2', 'C'), c('A', 'H'), c('K', 'C')];
    const pile = [c('7', 'H'), c('8', 'S')];
    const start = performance.now();
    optimalPeggingPlay(hand, pile, 15);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('optimalPeggingPlay with 1-card hand completes in <50ms', () => {
    const hand = [c('6', 'D')];
    const pile = [c('7', 'H'), c('8', 'S')];
    const start = performance.now();
    optimalPeggingPlay(hand, pile, 15);
    expect(performance.now() - start).toBeLessThan(50);
  });

  // ── aiSelectPlay end-to-end timing ────────────────────────────────────

  it('aiSelectPlay (Expectimax) completes in <500ms for a typical 4-card hand', () => {
    const hand = [c('5', 'H'), c('4', 'D'), c('J', 'C'), c('9', 'S')];
    const pile = [c('3', 'H')];
    const start = performance.now();
    aiSelectPlay(hand, pile, 3);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('aiSelectPlay with no playable cards returns null instantly (<5ms)', () => {
    const hand = [c('10', 'H'), c('J', 'S'), c('Q', 'D'), c('K', 'C')];
    const start = performance.now();
    const result = aiSelectPlay(hand, [], 25);
    const elapsed = performance.now() - start;
    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(5);
  });
});
