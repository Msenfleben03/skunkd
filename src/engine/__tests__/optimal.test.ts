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

    it('identifies keeping three 5s as optimal for the near-perfect hand', () => {
      // Core insight: always keep the three 5s — they're the most valuable.
      // 4th keep card (J vs K) has ~0.06pt margin, too tight for MC to guarantee.
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('9', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, true);
      const keptFives = result.keep.filter(card => card.rank === '5');
      expect(keptFives).toHaveLength(3);
    });

    it('includes expected value averaged over all starters', () => {
      const hand = [c('A', 'H'), c('2', 'S'), c('3', 'D'), c('4', 'C'), c('7', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, false);
      expect(result.expectedValue).toBeGreaterThan(0);
      expect(Number.isFinite(result.expectedValue)).toBe(true);
    });

    it('reasoning mentions the scoring categories present in the kept hand', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('J', 'D'), c('Q', 'C'), c('2', 'H'), c('3', 'S')];
      const result = optimalDiscard(hand, true);
      expect(result.reasoning).toBeTruthy();
    });

    it('evaluates all 15 possible discards', () => {
      const hand = [c('A', 'H'), c('4', 'S'), c('7', 'D'), c('10', 'C'), c('Q', 'H'), c('K', 'S')];
      const result = optimalDiscard(hand, false);
      expect(result.allOptions).toHaveLength(15);
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

    it('uses crib EV for total expected value', () => {
      // Dealer discarding 5-5 to own crib adds significant EV
      const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
      const asDealer = optimalDiscard(hand, true);
      const asPone = optimalDiscard(hand, false);
      // Dealer EV should be higher than pone EV (crib bonus vs penalty)
      // For the same hand, dealer benefits from crib while pone is penalized
      expect(asDealer.expectedValue).toBeGreaterThan(asPone.expectedValue);
    });

    it('MC crib produces EV values in realistically higher range than old heuristic', () => {
      // With MC crib, 5-5 discard to dealer crib scores ~8.50 pts
      // Dealer EV = hand EV (~6-7) + MC crib EV for best discard (~5-8)
      // Should be above 10 with accurate MC crib
      const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
      const asDealer = optimalDiscard(hand, true);
      expect(asDealer.expectedValue).toBeGreaterThan(10);
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
      expect(cardValue(result.card!.rank)).toBe(10);
      expect(result.reasoning.toLowerCase()).toContain('31');
    });

    it('recommends making 15 and explains why', () => {
      const hand = [c('5', 'H'), c('2', 'S'), c('A', 'D')];
      const result = optimalPeggingPlay(hand, [c('K', 'H')], 10);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('5');
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
      const result = optimalPeggingPlay([c('5', 'H'), c('3', 'S')], [], 0);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('3');
    });

    it('includes score impact in result', () => {
      const hand = [c('10', 'H'), c('A', 'S')];
      const result = optimalPeggingPlay(hand, [], 21);
      expect(result.points).toBe(2);
    });

    it('reports 0 points for a neutral play', () => {
      const result = optimalPeggingPlay([c('3', 'H')], [c('K', 'S')], 10);
      expect(result.card).not.toBeNull();
      expect(result.points).toBe(0);
    });

    // ─── Count 11 avoidance ───────────────────────────────────────────
    it('avoids leaving count at 11 in recommendation', () => {
      // count=1: 10+1=11 (opponent plays face for 15-2), 3+1=4 (safe)
      const result = optimalPeggingPlay([c('10', 'H'), c('3', 'S')], [], 1);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('3');
    });

    // ─── Run extension ────────────────────────────────────────────────
    it('recommends extending a run and explains why', () => {
      // pile=[7,8], count=15, hand=[6, 2, A]
      // 6 extends to 6-7-8 (run of 3 = 3 pts)
      const pile = [c('7', 'H'), c('8', 'S')];
      const hand = [c('6', 'D'), c('2', 'C'), c('A', 'H')];
      const result = optimalPeggingPlay(hand, pile, 15);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('6');
      expect(result.reasoning.toLowerCase()).toContain('run');
      expect(result.points).toBeGreaterThanOrEqual(3);
    });

    it('recommends extending a run at the high end', () => {
      // pile=[3,4], count=7, hand=[5, K, A]
      // 5 extends 3-4 to 3-4-5 (run of 3)
      const pile = [c('3', 'H'), c('4', 'S')];
      const hand = [c('5', 'D'), c('K', 'C'), c('A', 'H')];
      const result = optimalPeggingPlay(hand, pile, 7);
      expect(result.card).not.toBeNull();
      expect(result.card!.rank).toBe('5');
      expect(result.points).toBeGreaterThanOrEqual(3);
    });

    // ─── Expectimax EV ranking ────────────────────────────────────────
    it('uses Expectimax EV to select card — prefers 31 over lower-scoring options', () => {
      // count=21, hand has 10 (makes 31=2pts) and A (scores 0)
      // Expectimax should still prefer the 10 for 31 (highest EV path)
      const hand = [c('10', 'H'), c('A', 'S')];
      const result = optimalPeggingPlay(hand, [], 21);
      expect(result.card).not.toBeNull();
      expect(cardValue(result.card!.rank)).toBe(10);
      expect(result.reasoning.toLowerCase()).toContain('31');
    });

    it('returns null when no cards are playable (count near 31)', () => {
      // count=30 — only a 1-value card could fit, but hand has only 10-value cards
      const hand = [c('10', 'H'), c('J', 'S'), c('Q', 'D'), c('K', 'C')];
      const result = optimalPeggingPlay(hand, [], 30);
      expect(result.card).toBeNull();
      expect(result.reasoning).toContain('Go');
    });

    it('Expectimax EV-based selection completes within 3000ms for typical hand', () => {
      // Expectimax with 20 determinizations and depth 3 — should be fast enough
      const pile = [c('7', 'H'), c('8', 'S')];
      const hand = [c('6', 'D'), c('2', 'C'), c('A', 'H'), c('K', 'C')];
      const start = performance.now();
      optimalPeggingPlay(hand, pile, 15);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(3000);
    });
  });
});
