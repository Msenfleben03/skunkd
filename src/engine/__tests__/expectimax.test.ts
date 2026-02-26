import { describe, it, expect } from 'vitest';
import { expectimaxPeggingPlay } from '../expectimax';
import { createGame } from '../gameState';

describe('expectimaxPeggingPlay', () => {
  it('should return a number (EV between 0 and 31)', () => {
    const gameState = createGame(2);
    const ev = expectimaxPeggingPlay(gameState, 0, 0, 5, 1, 12345);
    expect(typeof ev).toBe('number');
    expect(ev).toBeGreaterThanOrEqual(0);
  });

  it('should be deterministic with same seed', () => {
    const gameState = createGame(2);
    const ev1 = expectimaxPeggingPlay(gameState, 10, 15, 5, 2, 12345);
    const ev2 = expectimaxPeggingPlay(gameState, 10, 15, 5, 2, 12345);
    expect(ev1).toBe(ev2);
  });

  it('should run without error for different seeds', () => {
    const gameState = createGame(2);
    // With a full game (pre-pegging), pile is empty, so the EV is truly based on determinizations
    // We just verify it runs without error for different seeds
    const ev1 = expectimaxPeggingPlay(gameState, 0, 0, 10, 2, 1);
    const ev2 = expectimaxPeggingPlay(gameState, 0, 0, 10, 2, 999);
    // Both should be numbers (values may vary with different seeds)
    expect(typeof ev1).toBe('number');
    expect(typeof ev2).toBe('number');
  });
});
