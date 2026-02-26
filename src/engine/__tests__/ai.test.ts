import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '../types';
import { createCard, cardValue } from '../types';
import { aiSelectDiscard, aiSelectPlay } from '../ai';

/** Shorthand card factory */
function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('AI Decision Logic', () => {
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
      // 5-5-5-J is the core of a 29-point hand; AI must keep these 4
      const hand = [c('5', 'H'), c('5', 'S'), c('5', 'D'), c('J', 'C'), c('9', 'H'), c('K', 'S')];
      const result = aiSelectDiscard(hand, true);
      const keepRanks = result.keep.map(card => card.rank).sort();
      expect(keepRanks).toEqual(['5', '5', '5', 'J']);
    });

    it('keeps a hand with strong expected value over scattered cards', () => {
      // 3-4-5-6-K-9: AI should keep a set including the 5 and a run
      // (4-5-6-K scores higher than 3-4-5-6 due to K+5=15 in-hand)
      const hand = [c('3', 'H'), c('4', 'S'), c('5', 'D'), c('6', 'C'), c('K', 'H'), c('9', 'S')];
      const result = aiSelectDiscard(hand, false);
      const keepRanks = result.keep.map(card => card.rank);
      // Must keep the 5 (highest-value card for fifteens)
      expect(keepRanks).toContain('5');
      // Expected value should be well above average (4.77)
      expect(result.expectedHandValue).toBeGreaterThan(5);
    });

    it('returns a non-negative expectedHandValue', () => {
      const hand = [c('A', 'H'), c('3', 'S'), c('6', 'D'), c('Q', 'C'), c('K', 'H'), c('8', 'S')];
      const result = aiSelectDiscard(hand, false);
      expect(result.expectedHandValue).toBeGreaterThanOrEqual(0);
    });

    it('dealer strategy may differ from pone for the same hand', () => {
      // A hand where crib modifier could change the optimal discard
      // 5-5-6-7-K-Q: dealer might discard 5+K (5 to own crib), pone keeps 5s
      const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
      const asDealer = aiSelectDiscard(hand, true);
      const asPone = aiSelectDiscard(hand, false);
      // Results may or may not differ, but both must be valid
      expect(asDealer.discard).toHaveLength(2);
      expect(asPone.discard).toHaveLength(2);
      // The expectedHandValue should reflect the crib modifier
      // Dealer gets crib bonus, so total expected may differ
    });

    it('pone avoids discarding a pair of 5s to opponent crib', () => {
      // 5-5-7-8-9-10: keeping 7-8-9-10 (run of 4) is tempting,
      // but discarding 5-5 gives opponent's crib a pair + two-card fifteens
      // Pone should prefer keeping at least one 5
      const hand = [c('5', 'H'), c('5', 'S'), c('7', 'D'), c('8', 'C'), c('9', 'H'), c('10', 'S')];
      const result = aiSelectDiscard(hand, false);
      const discardRanks = result.discard.map(card => card.rank);
      // Should NOT discard both 5s to opponent's crib
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
      // 4 of each rank impossible in 6 cards, but 3+3 possible: 7-7-7-8-8-8
      const hand = [c('7', 'H'), c('7', 'S'), c('7', 'D'), c('8', 'H'), c('8', 'S'), c('8', 'D')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
    });

    it('handles a hand with a potential flush', () => {
      // All hearts: 2H 4H 6H 8H 10H QH — flush if keep 4 of same suit
      const hand = [c('2', 'H'), c('4', 'H'), c('6', 'H'), c('8', 'H'), c('10', 'H'), c('Q', 'H')];
      const result = aiSelectDiscard(hand, true);
      expect(result.discard).toHaveLength(2);
      expect(result.keep).toHaveLength(4);
      // All kept cards should be Hearts (preserving flush potential)
      expect(result.keep.every(card => card.suit === 'H')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // aiSelectPlay — Choose best card to play during pegging
  // ═══════════════════════════════════════════════════════════════════════
  describe('aiSelectPlay', () => {
    it('returns null when no card is playable (all exceed 31)', () => {
      const hand = [c('10', 'H'), c('J', 'S'), c('Q', 'D')];
      const pile: Card[] = [];
      // count=25, all cards are 10-value, 25+10=35 > 31
      const result = aiSelectPlay(hand, pile, 25);
      expect(result).toBeNull();
    });

    it('never returns a card that would exceed count of 31', () => {
      const hand = [c('6', 'H'), c('3', 'S'), c('K', 'D')];
      const pile = [c('10', 'H'), c('9', 'S')]; // count=19
      const result = aiSelectPlay(hand, pile, 19);
      // 6+19=25 OK, 3+19=22 OK, K(10)+19=29 OK — all valid
      if (result) {
        expect(cardValue(result.rank) + 19).toBeLessThanOrEqual(31);
      }
    });

    it('must return a card when at least one is playable (no false Go)', () => {
      const hand = [c('2', 'H'), c('K', 'S'), c('Q', 'D')];
      const pile: Card[] = [];
      // count=29: K(10)+29=39>31, Q(10)+29=39>31, 2+29=31 OK
      const result = aiSelectPlay(hand, pile, 29);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('2');
    });

    it('plays a card to make exactly 31 when possible', () => {
      const hand = [c('10', 'H'), c('5', 'S'), c('A', 'D')];
      const pile = [c('K', 'H'), c('J', 'S')]; // count=20 (just for reference)
      // count=21: 10+21=31 — should pick 10
      const result = aiSelectPlay(hand, pile, 21);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank)).toBe(10);
    });

    it('plays a card to make exactly 15 when possible', () => {
      const hand = [c('5', 'H'), c('2', 'S'), c('A', 'D')];
      const pile = [c('K', 'H')]; // count=10
      // count=10: 5+10=15 — should pick 5
      const result = aiSelectPlay(hand, pile, 10);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('5');
    });

    it('prefers making 31 over making 15', () => {
      // count=21: 10 makes 31 (2pts), A makes 22 (nothing), 4 makes 25 (nothing)
      // No card makes 15 from 21, so this tests 31 priority
      const hand = [c('10', 'H'), c('A', 'S'), c('4', 'D')];
      const pile: Card[] = [];
      const result = aiSelectPlay(hand, pile, 21);
      expect(result).not.toBeNull();
      expect(cardValue(result!.rank)).toBe(10); // makes 31
    });

    it('prefers making a pair when no 31 or 15 available', () => {
      // count=4, last card played was 4, hand=[4,A,2]
      // 4 makes pair (2pts), A makes 5 (bad), 2 makes 6 (nothing)
      // No 31, no 15 from count=4 with these cards
      const pile = [c('4', 'S')];
      const hand = [c('4', 'H'), c('A', 'S'), c('2', 'D')];
      const result = aiSelectPlay(hand, pile, 4);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('4'); // pair with pile
    });

    it('avoids leaving count at 5 when alternative exists', () => {
      // count=0, hand=[5,3]: 5 leaves count=5 (opponent plays 10 for 15)
      // 3 leaves count=3 (safer)
      const result = aiSelectPlay([c('5', 'H'), c('3', 'S')], [], 0);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('3');
    });

    it('avoids leaving count at 21 when alternative exists', () => {
      // count=11, hand=[10,7]: 10 leaves 21 (opponent plays 10 for 31)
      // 7 leaves 18 (safer)
      const result = aiSelectPlay([c('10', 'H'), c('7', 'S')], [], 11);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('7');
    });

    it('plays the only legal card even if it leaves a bad count', () => {
      // count=0, hand=[5] — only option is 5, even though it leaves count=5
      const result = aiSelectPlay([c('5', 'H')], [], 0);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('5');
    });

    it('falls back to lowest card when no priority matches', () => {
      // count=10, hand=[3,8,K]: no card makes 15/31, no pair in pile
      // 3+10=13, 8+10=18, K+10=20 — none are 15 or 31
      // Should play 3 (lowest value)
      const pile = [c('7', 'H')]; // 7 in pile, no pair for 3/8/K
      const result = aiSelectPlay([c('3', 'H'), c('8', 'S'), c('K', 'D')], pile, 10);
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('3');
    });

    it('handles empty pile (first play of round)', () => {
      const hand = [c('4', 'H'), c('7', 'S'), c('J', 'D'), c('K', 'C')];
      const result = aiSelectPlay(hand, [], 0);
      expect(result).not.toBeNull();
      // Should be a valid card from hand
      expect(hand.some(card => card.id === result!.id)).toBe(true);
    });

    it('handles single card in hand', () => {
      const result = aiSelectPlay([c('A', 'H')], [], 30);
      // A(1) + 30 = 31 — should play it (makes 31!)
      expect(result).not.toBeNull();
      expect(result!.rank).toBe('A');
    });
  });
});
