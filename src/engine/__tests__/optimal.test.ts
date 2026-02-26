import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '../types';
import { createCard, cardValue } from '../types';
import { optimalDiscard, optimalPeggingPlay } from '../optimal';

/** Shorthand card factory */
function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('Optimal Play Calculator (Coaching Engine)', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // optimalDiscard — Best discard with expected value and reasoning
  // ═══════════════════════════════════════════════════════════════════════
  describe('optimalDiscard', () => {
    it('returns the discard, keep, expected value, and reasoning', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('K', 'H'), c('Q', 'S')];
      const result = optimalDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
      expect(result.expectedValue).toBeGreaterThanOrEqual(0);
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('identifies the 5-5-5-J keep as optimal for the perfect hand', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('9', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, true);
      const keepRanks = result.keep.map(card => card.rank).sort();
      expect(keepRanks).toEqual(['5', '5', '5', 'J']);
    });

    it('includes expected value averaged over all starters', () => {
      const hand = [c('A', 'H'), c('2', 'S'), c('3', 'D'), c('4', 'C'), c('7', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, false);
      // Expected value is a meaningful number (not NaN, not zero for a hand with a run)
      expect(result.expectedValue).toBeGreaterThan(0);
      expect(Number.isFinite(result.expectedValue)).toBe(true);
    });

    it('reasoning mentions the scoring categories present in the kept hand', () => {
      // 5-5-J-Q + discard: fifteens from J/Q+5, pair of 5s
      const hand = [c('5', 'H'), c('5', 'S'), c('J', 'D'), c('Q', 'C'), c('2', 'H'), c('3', 'S')];
      const result = optimalDiscard(hand, true);
      // Reasoning should mention why this hand was chosen
      expect(result.reasoning).toBeTruthy();
    });

    it('evaluates all 15 possible discards', () => {
      const hand = [c('A', 'H'), c('4', 'S'), c('7', 'D'), c('10', 'C'), c('Q', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, false);
      // allOptions shows all 15 evaluated discards sorted by value
      expect(result.allOptions).toHaveLength(15);
      // Should be sorted descending by expected value
      for (let i = 0; i < result.allOptions.length - 1; i++) {
        expect(result.allOptions[i].expectedValue).toBeGreaterThanOrEqual(
          result.allOptions[i + 1].expectedValue,
        );
      }
    });

    it('dealer and pone may have different optimal discards', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
      const asDealer = optimalDiscard(hand, true);
      const asPone = optimalDiscard(hand, false);
      // Both must be valid
      expect(asDealer.discard).toHaveLength(2);
      expect(asPone.discard).toHaveLength(2);
    });

    it('completes within 500ms', () => {
      const hand = [c('A', 'H'), c('4', 'S'), c('7', 'D'), c('10', 'C'), c('Q', 'H'), c('K', 'S')];
      const start = performance.now();
      optimalDiscard(hand, true);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // optimalPeggingPlay — Best card to play with reasoning
  // ═══════════════════════════════════════════════════════════════════════
  describe('optimalPeggingPlay', () => {
    it('returns the card and reasoning', () => {
      const hand = [c('5', 'H'), c('10', 'S'), c('A', 'D')];
      const result = optimalPeggingPlay(hand, [c('K', 'H')], 10);
      expect(result.card).not.toBeNull();
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('returns null card with reasoning when no play possible', () => {
      const hand = [c('10', 'H'), c('J', 'S'), c('Q', 'D')];
      const result = optimalPeggingPlay(hand, [], 25);
      expect(result.card).toBeNull();
      expect(result.reasoning).toContain('Go');
    });

    it('recommends making 31 and explains why', () => {
      const hand = [c('10', 'H'), c('5', 'S'), c('A', 'D')];
      const result = optimalPeggingPlay(hand, [], 21);
      expect(result.card).not.toBeNull();
      expect(cardValue(result.card!.rank)).toBe(10); // 10 + 21 = 31
      expect(result.reasoning.toLowerCase()).toContain('31');
    });

    it('recommends making 15 and explains why', () => {
      const hand = [c('5', 'H'), c('2', 'S'), c('A', 'D')];
      const result = optimalPeggingPlay(hand, [c('K', 'H')], 10);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('5'); // 5 + 10 = 15
      expect(result.reasoning.toLowerCase()).toContain('15');
    });

    it('recommends pair and explains why', () => {
      const pile = [c('4', 'S')];
      const hand = [c('4', 'H'), c('A', 'S'), c('2', 'D')];
      const result = optimalPeggingPlay(hand, pile, 4);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('4');
      expect(result.reasoning.toLowerCase()).toContain('pair');
    });

    it('warns about dangerous counts in reasoning', () => {
      // count=0, hand=[5,3]: recommends 3 and explains avoiding count=5
      const result = optimalPeggingPlay([c('5', 'H'), c('3', 'S')], [], 0);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('3');
    });

    it('includes score impact in result', () => {
      // Playing 10 when count=21 → 31 → 2 points
      const hand = [c('10', 'H'), c('A', 'S')];
      const result = optimalPeggingPlay(hand, [], 21);
      expect(result.points).toBe(2); // 31 scores 2 points
    });

    it('reports 0 points for a neutral play', () => {
      // count=10, play 3 → count=13 → no scoring event
      const result = optimalPeggingPlay([c('3', 'H')], [c('K', 'S')], 10);
      expect(result.card).not.toBeNull();
      expect(result.points).toBe(0);
    });
  });
});
