import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '../types';
import { createCard } from '../types';
import { monteCartoCribEV } from '../crib-ev';

function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('monteCartoCribEV (Monte Carlo crib simulation)', () => {
  it('returns a value in the plausible crib EV range (2.0 - 10.0)', () => {
    const ev = monteCartoCribEV([c('5', 'H'), c('5', 'S')], [c('5', 'H'), c('5', 'S')]);
    expect(ev).toBeGreaterThan(2.0);
    expect(ev).toBeLessThan(10.0);
  });

  it('5-5 approximates Schell value of 8.50 (within 1.5)', () => {
    const ev = monteCartoCribEV(
      [c('5', 'H'), c('5', 'S')],
      [c('5', 'H'), c('5', 'S')],
      500,
    );
    expect(ev).toBeGreaterThan(7.0);
    expect(ev).toBeLessThan(10.0);
  });

  it('J-K produces low-to-mid crib EV with uniform sampling', () => {
    // Schell value is 2.80 (strategic opponents avoid good crib cards).
    // Uniform MC sampling gives higher values since it samples unrestricted —
    // opponents may "accidentally" throw high-value combos. Range: ~1.3 - 6.0.
    const ev = monteCartoCribEV(
      [c('J', 'H'), c('K', 'S')],
      [c('J', 'H'), c('K', 'S')],
      500,
    );
    expect(ev).toBeGreaterThan(1.3);
    expect(ev).toBeLessThan(6.0);
  });

  it('high-value pair (5-5) has higher EV than low-value pair (J-K)', () => {
    const evHigh = monteCartoCribEV(
      [c('5', 'H'), c('5', 'S')],
      [c('5', 'H'), c('5', 'S')],
      300,
    );
    const evLow = monteCartoCribEV(
      [c('J', 'H'), c('K', 'S')],
      [c('J', 'H'), c('K', 'S')],
      300,
    );
    expect(evHigh).toBeGreaterThan(evLow);
  });

  it('uses knownCards to exclude them from sampling', () => {
    // With more known cards, fewer cards available as opponent discards/starter
    // Result should still be a valid crib EV
    const knownMany = [
      c('5', 'H'), c('5', 'S'),
      c('A', 'H'), c('2', 'H'), c('3', 'H'), c('4', 'H'),
      c('6', 'H'), c('7', 'H'), c('8', 'H'), c('9', 'H'),
    ];
    const ev = monteCartoCribEV([c('5', 'H'), c('5', 'S')], knownMany, 100);
    expect(ev).toBeGreaterThan(0);
    expect(ev).toBeLessThan(30);
  });

  it('completes 500 samples within 200ms', () => {
    const start = performance.now();
    monteCartoCribEV(
      [c('5', 'H'), c('J', 'S')],
      [c('5', 'H'), c('J', 'S')],
      500,
    );
    expect(performance.now() - start).toBeLessThan(200);
  });
});
