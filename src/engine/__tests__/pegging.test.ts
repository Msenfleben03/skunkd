import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import { createCard } from '../types';
import { scorePeggingPlay } from '../pegging';

/** Helper to create cards concisely */
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return createCard(rank, suit);
}

describe('scorePeggingPlay', () => {
  // --- Fifteens ---
  it('scores 2 points when count hits exactly 15', () => {
    // 7 + 8 = 15
    const pile = [card('7', 'H'), card('8', 'S')];
    expect(scorePeggingPlay(pile).fifteen).toBe(2);
  });

  it('scores 0 for fifteen when count is not 15', () => {
    // 7 + 3 = 10
    const pile = [card('7', 'H'), card('3', 'S')];
    expect(scorePeggingPlay(pile).fifteen).toBe(0);
  });

  // --- Thirty-one ---
  it('scores 2 points when count hits exactly 31', () => {
    // 10 + 10 + 10 + A = 31
    const pile = [card('K', 'H'), card('Q', 'S'), card('J', 'D'), card('A', 'C')];
    expect(scorePeggingPlay(pile).thirtyone).toBe(2);
  });

  it('scores 0 for thirtyone when count is not 31', () => {
    // 10 + 10 + 10 = 30
    const pile = [card('K', 'H'), card('Q', 'S'), card('J', 'D')];
    expect(scorePeggingPlay(pile).thirtyone).toBe(0);
  });

  // --- Pairs ---
  it('scores a pair (2 points) for two consecutive same-rank cards', () => {
    const pile = [card('5', 'H'), card('5', 'S')];
    expect(scorePeggingPlay(pile).pairs).toBe(2);
  });

  it('scores pair royal (6 points) for three consecutive same-rank', () => {
    const pile = [card('5', 'H'), card('5', 'S'), card('5', 'D')];
    expect(scorePeggingPlay(pile).pairs).toBe(6);
  });

  it('scores double pair royal (12 points) for four consecutive same-rank', () => {
    const pile = [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('5', 'C')];
    expect(scorePeggingPlay(pile).pairs).toBe(12);
  });

  it('consecutive pairs broken by different rank scores 0', () => {
    // 5, 5, 7, 5 — the 7 breaks it, so last card (5) only pairs with... nothing consecutively
    const pile = [card('5', 'H'), card('5', 'S'), card('7', 'D'), card('5', 'C')];
    expect(scorePeggingPlay(pile).pairs).toBe(0);
  });

  it('scores pair only from end of pile', () => {
    // 3, 5, 5 — last two are a pair
    const pile = [card('3', 'H'), card('5', 'S'), card('5', 'D')];
    expect(scorePeggingPlay(pile).pairs).toBe(2);
  });

  // --- Runs ---
  it('scores a run of 3 from consecutive plays', () => {
    // 3, 4, 5 — sorted: 3,4,5 — run of 3
    const pile = [card('3', 'H'), card('4', 'S'), card('5', 'D')];
    expect(scorePeggingPlay(pile).runs).toBe(3);
  });

  it('scores a run of 3 played out of order', () => {
    // 5, 3, 4 — sorted: 3,4,5 — run of 3
    const pile = [card('5', 'H'), card('3', 'S'), card('4', 'D')];
    expect(scorePeggingPlay(pile).runs).toBe(3);
  });

  it('run detection considers all consecutive plays from end', () => {
    // Play sequence: 3, 7, 4, 5, 6 — sorted: 3,4,5,6,7 — run of 5
    const pile = [card('3', 'H'), card('7', 'S'), card('4', 'D'), card('5', 'C'), card('6', 'H')];
    expect(scorePeggingPlay(pile).runs).toBe(5);
  });

  it('broken sequence has no run', () => {
    // Play sequence: 3, 7, K, 5, 6 — K breaks it, no run
    const pile = [card('3', 'H'), card('7', 'S'), card('K', 'D'), card('5', 'C'), card('6', 'H')];
    expect(scorePeggingPlay(pile).runs).toBe(0);
  });

  it('scores run of 4 when non-run card is at start', () => {
    // K, 4, 5, 6, 7 — last 4: 4,5,6,7 → run of 4. All 5: K,4,5,6,7 → not consecutive (K=13)
    const pile = [card('K', 'H'), card('4', 'S'), card('5', 'D'), card('6', 'C'), card('7', 'H')];
    expect(scorePeggingPlay(pile).runs).toBe(4);
  });

  it('no run for only 2 consecutive ranks', () => {
    const pile = [card('3', 'H'), card('4', 'S')];
    expect(scorePeggingPlay(pile).runs).toBe(0);
  });

  it('scores run with face cards', () => {
    // J(11), Q(12), K(13) — run of 3
    const pile = [card('J', 'H'), card('Q', 'S'), card('K', 'D')];
    expect(scorePeggingPlay(pile).runs).toBe(3);
  });

  // --- Combined scoring ---
  it('scores fifteen + pair simultaneously', () => {
    // 7, 8 → count=15 → fifteen(2) + pair? No, different ranks. Just fifteen.
    // Let's use: 5, 5, 5 → count=15, pair royal(6), fifteen(2)
    const pile = [card('5', 'H'), card('5', 'S'), card('5', 'D')];
    const result = scorePeggingPlay(pile);
    expect(result.fifteen).toBe(2);
    expect(result.pairs).toBe(6);
    expect(result.total).toBe(8);
  });

  it('total sums all scoring categories', () => {
    // 7, 8 → count=15 → fifteen(2), no pairs, no runs
    const pile = [card('7', 'H'), card('8', 'S')];
    const result = scorePeggingPlay(pile);
    expect(result.total).toBe(result.fifteen + result.thirtyone + result.pairs + result.runs);
  });

  // --- Single card (first play) ---
  it('single card scores nothing', () => {
    const pile = [card('5', 'H')];
    const result = scorePeggingPlay(pile);
    expect(result.total).toBe(0);
  });

  // --- Empty pile ---
  it('empty pile scores nothing', () => {
    const result = scorePeggingPlay([]);
    expect(result.total).toBe(0);
  });
});
