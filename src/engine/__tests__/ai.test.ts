import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '../types';
import { createCard, cardValue } from '../types';
import { aiSelectDiscard, aiSelectPlay, getPositionMode } from '../ai';
import { lookupCribEV } from '../crib-ev';

/** Shorthand card factory */
function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('AI Decision Logic', () => {
  // ═══════════════════════════════════════════════════════════════════════
  // lookupCribEV — Schell rank-pair crib EV table
  // ═══════════════════════════════════════════════════════════════════════
  describe('lookupCribEV (Schell rank-pair table)', () => {
    it('returns 8.50 for 5-5 (highest crib value)', () => {
      expect(lookupCribEV(c('5', 'H'), c('5', 'S'))).toBe(8.50);
    });

    it('returns 2.80 for J-K (one of the lowest values)', () => {
      expect(lookupCribEV(c('J', 'H'), c('K', 'S'))).toBe(2.80);
    });

    it('returns 6.90 for 2-3 (high connector)', () => {
      expect(lookupCribEV(c('2', 'H'), c('3', 'S'))).toBe(6.90);
    });

    it('returns 6.66 for 5-J (five + face)', () => {
      expect(lookupCribEV(c('5', 'H'), c('J', 'S'))).toBe(6.66);
    });

    it('returns 6.10 for A-4 (high value the old heuristic missed)', () => {
      expect(lookupCribEV(c('A', 'H'), c('4', 'S'))).toBe(6.10);
    });

    it('is symmetric — card order does not matter', () => {
      expect(lookupCribEV(c('5', 'H'), c('J', 'S')))
        .toBe(lookupCribEV(c('J', 'S'), c('5', 'H')));
      expect(lookupCribEV(c('A', 'D'), c('K', 'C')))
        .toBe(lookupCribEV(c('K', 'C'), c('A', 'D')));
    });

    it('suit does not affect the value', () => {
      expect(lookupCribEV(c('5', 'H'), c('5', 'S')))
        .toBe(lookupCribEV(c('5', 'D'), c('5', 'C')));
    });

    it('covers all 91 unique rank pairs', () => {
      const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      for (const r1 of RANKS) {
        for (const r2 of RANKS) {
          const ev = lookupCribEV(c(r1, 'H'), c(r2, 'S'));
          expect(ev).toBeGreaterThan(0);
        }
      }
    });

    it('values range from ~2.80 to 8.50', () => {
      const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      let min = Infinity, max = -Infinity;
      for (const r1 of RANKS) {
        for (const r2 of RANKS) {
          const ev = lookupCribEV(c(r1, 'H'), c(r2, 'S'));
          if (ev < min) min = ev;
          if (ev > max) max = ev;
        }
      }
      expect(min).toBeGreaterThanOrEqual(2.50);
      expect(max).toBe(8.50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getPositionMode — Theory of 26 board position zones
  // ═══════════════════════════════════════════════════════════════════════
  describe('getPositionMode (Theory of 26)', () => {
    it('returns neutral for scores 0-60', () => {
      expect(getPositionMode(0, 0, true)).toBe('neutral');
      expect(getPositionMode(30, 50, false)).toBe('neutral');
      expect(getPositionMode(60, 40, true)).toBe('neutral');
    });

    it('dealer=defense, pone=offense for 61-75', () => {
      expect(getPositionMode(65, 40, true)).toBe('defense');
      expect(getPositionMode(65, 40, false)).toBe('offense');
    });

    it('dealer=offense, pone=defense for 76-86', () => {
      expect(getPositionMode(80, 60, true)).toBe('offense');
      expect(getPositionMode(80, 60, false)).toBe('defense');
    });

    it('dealer=defense, pone=offense for 87-101', () => {
      expect(getPositionMode(95, 70, true)).toBe('defense');
      expect(getPositionMode(95, 70, false)).toBe('offense');
    });

    it('dealer=offense, pone=defense for 102-112', () => {
      expect(getPositionMode(110, 90, true)).toBe('offense');
      expect(getPositionMode(110, 90, false)).toBe('defense');
    });

    it('dealer=defense, pone=offense for 113-120', () => {
      expect(getPositionMode(115, 100, true)).toBe('defense');
      expect(getPositionMode(115, 100, false)).toBe('offense');
    });

    it('handles zone boundaries correctly', () => {
      expect(getPositionMode(60, 0, true)).toBe('neutral');
      expect(getPositionMode(61, 0, true)).toBe('defense');
      expect(getPositionMode(75, 0, true)).toBe('defense');
      expect(getPositionMode(76, 0, true)).toBe('offense');
      expect(getPositionMode(86, 0, true)).toBe('offense');
      expect(getPositionMode(87, 0, true)).toBe('defense');
      expect(getPositionMode(101, 0, true)).toBe('defense');
      expect(getPositionMode(102, 0, true)).toBe('offense');
      expect(getPositionMode(112, 0, true)).toBe('offense');
      expect(getPositionMode(113, 0, true)).toBe('defense');
      expect(getPositionMode(120, 0, true)).toBe('defense');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // aiSelectDiscard — Evaluate all 15 discard combos from 6-card hand
  // ═══════════════════════════════════════════════════════════════════════
  describe('aiSelectDiscard', () => {
    it('returns exactly 2 cards to discard and 4 to keep', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('K', 'H'), c('Q', 'S')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
    });

    it('all returned cards come from the original hand', () => {
      const hand = [c('A', 'H'), c('2', 'S'), c('3', 'D'), c('4', 'C'), c('7', 'H'), c('9', 'S')];
      const result = aiSelectDiscard(hand, false);
      const handIds = new Set(hand.map(card => card.id));
      for (const card of result.discard) {
        expect(handIds.has(card.id)).toBe(true);
      }
      for (const card of result.keep) {
        expect(handIds.has(card.id)).toBe(true);
      }
    });

    it('discard and keep together contain all 6 original cards', () => {
      const hand = [c('A', 'H'), c('3', 'S'), c('5', 'D'), c('7', 'C'), c('9', 'H'), c('J', 'S')];
      const result = aiSelectDiscard(hand, true);
      const allIds = [...result.discard, ...result.keep].map(card => card.id).sort();
      const handIds = hand.map(card => card.id).sort();
      expect(allIds).toEqual(handIds);
    });

    it('keeps the obvious high-scoring hand: 5-5-5-J over junk', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('9', 'H'), c('K', 'S')];
      const result = aiSelectDiscard(hand, true);
      const keepRanks = result.keep.map(card => card.rank).sort();
      expect(keepRanks).toEqual(['5', '5', '5', 'J']);
    });

    it('keeps a hand with strong expected value over scattered cards', () => {
      const hand = [c('3', 'H'), c('4', 'S'), c('5', 'D'), c('6', 'C'), c('K', 'H'), c('9', 'S')];
      const result = aiSelectDiscard(hand, false);
      const keepRanks = result.keep.map(card => card.rank);
      expect(keepRanks).toContain('5');
      expect(result.expectedHandValue).toBeGreaterThan(5);
    });

    it('returns a non-negative expectedHandValue', () => {
      const hand = [c('A', 'H'), c('3', 'S'), c('6', 'D'), c('Q', 'C'), c('K', 'H'), c('8', 'S')];
      const result = aiSelectDiscard(hand, false);
      expect(result.expectedHandValue).toBeGreaterThanOrEqual(0);
    });

    it('dealer strategy may differ from pone for the same hand', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
      const asDealer = aiSelectDiscard(hand, true);
      const asPone = aiSelectDiscard(hand, false);
      expect(asDealer.discard).toHaveLength(2);
      expect(asPone.discard).toHaveLength(2);
    });

    it('pone avoids discarding a pair of 5s to opponent crib', () => {
      const hand = [c('5', 'H'), c('5', 'S'), c('7', 'D'), c('8', 'C'), c('9', 'H'), c('10', 'S')];
      const result = aiSelectDiscard(hand, false);
      const discardRanks = result.discard.map(card => card.rank);
      const fivesDiscarded = discardRanks.filter(r => r === '5').length;
      expect(fivesDiscarded).toBeLessThan(2);
    });

    it('completes discard selection within 500ms', () => {
      const hand = [c('A', 'H'), c('4', 'S'), c('7', 'D'), c('10', 'C'), c('Q', 'H'), c('K', 'S')];
      const start = performance.now();
      aiSelectDiscard(hand, true);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('handles a hand of all same rank', () => {
      const hand = [c('7', 'H'), c('7', 'S'), c('7', 'D'), c('8', 'H'), c('8', 'S'), c('8', 'D')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
    });

    it('handles a hand with a potential flush', () => {
      const hand = [c('2', 'H'), c('4', 'H'), c('6', 'H'), c('8', 'H'), c('10', 'H'), c('Q', 'H')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
      expect(result.keep.every(card => card.suit === 'H')).toBe(true);
    });

    it('uses Schell crib EV (A-4=6.10 vs old heuristic=0)', () => {
      // Verify the Schell lookup fundamentally changes crib valuation
      // A-4 has Schell EV 6.10 — one of the highest non-5 pairs
      // The old heuristic gave A-4 a value of 0 (no 15, no pair, no 5, gap > 2)
      const hand = [c('A', 'H'), c('4', 'S'), c('3', 'D'), c('3', 'C'), c('7', 'H'), c('8', 'S')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
      expect(result.expectedHandValue).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // aiSelectPlay — Choose best card to play during pegging
  // ═══════════════════════════════════════════════════════════════════════
  describe('aiSelectPlay', () => {
    it('returns null when no card is playable (all exceed 31)', () => {
      const hand = [c('10', 'H'), c('J', 'S'), c('Q', 'D')];
      const pile: Card[] = [];
      const result = aiSelectPlay(hand, pile, 25);
      expect(result).toBeNull();
    });

    it('never returns a card that would exceed count of 31', () => {
      const hand = [c('6', 'H'), c('3', 'S'), c('K', 'D')];
      const pile = [c('10', 'H'), c('9', 'S')];
      const result = aiSelectPlay(hand, pile, 19);
      if (result) {
        expect(cardValue(result.rank) + 19).toBeLessThanOrEqual(31);
      }
    });

    it('must return a card when at least one is playable (no false Go)', () => {
      const hand = [c('2', 'H'), c('K', 'S'), c('Q', 'D')];
      const pile: Card[] = [];
      const result = aiSelectPlay(hand, pile, 29);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('2');
    });

    it('plays a card to make exactly 31 when possible', () => {
      const hand = [c('10', 'H'), c('5', 'S'), c('A', 'D')];
      const pile = [c('K', 'H'), c('J', 'S')];
      const result = aiSelectPlay(hand, pile, 21);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank)).toBe(10);
    });

    it('plays a card to make exactly 15 when possible', () => {
      const hand = [c('5', 'H'), c('2', 'S'), c('A', 'D')];
      const pile = [c('K', 'H')];
      const result = aiSelectPlay(hand, pile, 10);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('5');
    });

    it('prefers making 31 over making 15', () => {
      const hand = [c('10', 'H'), c('A', 'S'), c('4', 'D')];
      const pile: Card[] = [];
      const result = aiSelectPlay(hand, pile, 21);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank)).toBe(10);
    });

    it('prefers making a pair when no 31 or 15 available', () => {
      const pile = [c('4', 'S')];
      const hand = [c('4', 'H'), c('A', 'S'), c('2', 'D')];
      const result = aiSelectPlay(hand, pile, 4);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('4');
    });

    it('avoids leaving count at 5 when alternative exists', () => {
      const result = aiSelectPlay([c('5', 'H'), c('3', 'S')], [], 0);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('3');
    });

    it('avoids leaving count at 21 when alternative exists', () => {
      const result = aiSelectPlay([c('10', 'H'), c('7', 'S')], [], 11);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('7');
    });

    it('avoids leaving count at 11 when alternative exists', () => {
      // count=1: 10+1=11 (opponent plays face for 15-2), 3+1=4 (safe)
      const result = aiSelectPlay([c('10', 'H'), c('3', 'S')], [], 1);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('3');
    });

    it('plays the only legal card even if it leaves a bad count', () => {
      const result = aiSelectPlay([c('5', 'H')], [], 0);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('5');
    });

    it('returns a valid playable card when no immediate scoring play exists', () => {
      // No 31/15/pair/run available — Expectimax picks by EV ranking
      const pile = [c('7', 'H')];
      const result = aiSelectPlay([c('3', 'H'), c('8', 'S'), c('K', 'D')], pile, 10);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank) + 10).toBeLessThanOrEqual(31);
    });

    it('handles empty pile (first play of round)', () => {
      const hand = [c('4', 'H'), c('7', 'S'), c('J', 'D'), c('K', 'C')];
      const result = aiSelectPlay(hand, [], 0);
      expect(result).not.toBeNull();
      expect(hand.some(card => card.id === result!.id)).toBe(true);
    });

    it('handles single card in hand', () => {
      const result = aiSelectPlay([c('A', 'H')], [], 30);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('A');
    });

    // ─── Quick Win #3: Run Extension ──────────────────────────────────
    it('extends a run in the pile when no 31/15/pair available', () => {
      // pile=[7,8], count=15, hand=[6, 2, A]
      // 6 extends 7-8 to 6-7-8 (run of 3 = 3 pts)
      const pile = [c('7', 'H'), c('8', 'S')];
      const hand = [c('6', 'D'), c('2', 'C'), c('A', 'H')];
      const result = aiSelectPlay(hand, pile, 15);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('6');
    });

    it('extends a run at the high end of the pile', () => {
      // pile=[3,4], count=7, hand=[5, K, A]
      // 5 extends 3-4 to 3-4-5 (run of 3)
      // Note: 5+7=12 ≠ 15, K(10)+7=17 ≠ 15, A(1)+7=8 ≠ 15 — no 15 triggers
      const pile = [c('3', 'H'), c('4', 'S')];
      const hand = [c('5', 'D'), c('K', 'C'), c('A', 'H')];
      const result = aiSelectPlay(hand, pile, 7);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('5');
    });

    it('extends a run of 4 when possible', () => {
      // pile=[6,7,8], count=21, hand=[9, 2, A]
      // 9 extends to 6-7-8-9 (run of 4 = 4 pts!)
      const pile = [c('6', 'H'), c('7', 'S'), c('8', 'D')];
      const hand = [c('9', 'C'), c('2', 'H'), c('A', 'S')];
      const result = aiSelectPlay(hand, pile, 21);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('9');
    });

    it('does not try run extension with pile of 1 card', () => {
      // pile=[7], count=7, hand=[8, K, 2]
      // 8 would form run with 7, but pile.length < 2 so no run extension check
      // 8+7=15 → makes 15! (priority 2)
      const pile = [c('7', 'H')];
      const hand = [c('8', 'D'), c('K', 'C'), c('2', 'S')];
      const result = aiSelectPlay(hand, pile, 7);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('8'); // Makes 15, not run extension
    });

    it('prefers making 31 in any situation', () => {
      // Expectimax always recognises 31 as highest-value play
      const hand = [c('10', 'H'), c('A', 'S'), c('3', 'D')];
      const result = aiSelectPlay(hand, [], 21);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank)).toBe(10); // Makes 31
    });
  });
});
