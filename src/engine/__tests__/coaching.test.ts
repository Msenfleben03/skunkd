import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit, DecisionSnapshot } from '../types';
import { createCard } from '../types';
import { optimalDiscard } from '../optimal';
import {
  analyzeDecision,
  analyzeHand,
  analyzeGame,
} from '../coaching';

function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('analyzeDecision — discard', () => {
  it('returns excellent severity when player chose the optimal discard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [...opt.discard],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeLessThan(0.1);
    expect(annotation.severity).toBe('excellent');
    expect(annotation.decision).toBe('discard');
    expect(annotation.evActual).toBeCloseTo(annotation.evOptimal, 1);
  });

  it('returns positive EVL when player chose the worst discard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const worstOption = opt.allOptions[opt.allOptions.length - 1];
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [...worstOption.discard],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeGreaterThan(0);
    expect(annotation.evOptimal).toBeGreaterThan(annotation.evActual);
  });

  it('EVL is never negative', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    // Try all 15 options — none should produce negative EVL
    for (const option of opt.allOptions) {
      const snapshot: DecisionSnapshot = {
        type: 'discard',
        hand,
        playerChoice: [...option.discard],
        isDealer: false,
        handIndex: 0,
      };
      const annotation = analyzeDecision(snapshot);
      expect(annotation.evl).toBeGreaterThanOrEqual(0);
    }
  });

  it('identifies the optimal cards correctly', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [c('9','H'), c('K','S')],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    const optIds = new Set(opt.discard.map(card => card.id));
    const annotOptIds = new Set(annotation.optimal.map(card => card.id));
    expect([...optIds]).toEqual(expect.arrayContaining([...annotOptIds]));
  });

  it('includes reasoning string from optimalDiscard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [c('9','H'), c('K','S')],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(typeof annotation.reasoning).toBe('string');
    expect(annotation.reasoning.length).toBeGreaterThan(0);
  });
});

describe('analyzeDecision — pegging play', () => {
  it('returns excellent severity when player made the optimal pegging play', () => {
    // count=21 (K=10 + 7=7 + 4=4), playing 10 makes 31 — optimal and obvious
    // Pile has no Aces to avoid opponent Ace pair-royal bias in Expectimax rollouts
    const hand = [c('10','H'), c('5','S')];
    const pile = [c('K','H'), c('7','S'), c('4','C')]; // 10+7+4=21
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('10','H')],
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.severity).toBe('excellent');
    expect(annotation.evl).toBeLessThan(0.1);
    // With expectimax, evOptimal includes immediate score + rollout EV (>= 2 pts for 31)
    expect(annotation.evOptimal).toBeGreaterThanOrEqual(2);
  });

  it('returns positive EVL when player missed making 31', () => {
    // count=21 (K=10 + J=10 + A=1), optimal is to play 10 for 31, player played 2 instead
    // Pile must actually contain cards summing to 21 so Expectimax rollout sees correct count
    const pile = [c('K','C'), c('J','D'), c('A','S')]; // 10+10+1=21
    const hand = [c('10','H'), c('2','D')];
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('2','D')],  // plays 2 (count→23, 0 pts) instead of 10 (count→31, 2 pts)
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeGreaterThan(0);
  });

  it('handles no-play (all cards over 31) gracefully', () => {
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand: [c('10','H'), c('J','S')],
      playerChoice: [],  // Go — no play
      isDealer: false,
      pile: [],
      count: 25,
      handIndex: 0,
    };
    // Should not throw — Go is correct when no card is playable
    expect(() => analyzeDecision(snapshot)).not.toThrow();
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evActual).toBe(0);
    expect(annotation.evOptimal).toBe(0);
    expect(annotation.severity).toBe('excellent');
  });

  it('uses expectimax EV for pegging play analysis — EVL > 0 for clearly suboptimal play', () => {
    // count=21 (K=10 + J=10 + A=1), hand=[10H, 2D].
    // Playing 10H makes 31 (2 pts) — optimal.
    // Playing 2D makes count=23 (0 pts) — suboptimal.
    // Pile must contain real cards summing to 21 so Expectimax sees correct count.
    const pile = [c('K','C'), c('J','D'), c('A','S')]; // 10+10+1=21
    const hand = [c('10','H'), c('2','D')];
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('2','D')],  // plays 2 (count→23, 0 pts) instead of 10 (count→31, 2 pts)
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    // EVL must be positive — playing 2 when 10 makes 31 is clearly suboptimal
    expect(annotation.evl).toBeGreaterThan(0);
    // Optimal EV must be >= 2 (at least the immediate 31 points)
    expect(annotation.evOptimal).toBeGreaterThanOrEqual(2);
    // Severity should reflect a meaningful mistake
    expect(['minor', 'significant', 'major', 'critical']).toContain(annotation.severity);
  });

  it('uses expectimax EV — evActual and evOptimal are both non-negative', () => {
    // A general property: EV values from expectimax should never be negative
    const hand = [c('4','H'), c('7','S'), c('9','D')];
    const pile = [c('5','C'), c('6','H')]; // count = 11
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('4','H')],
      isDealer: true,
      pile,
      count: 11,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evActual).toBeGreaterThanOrEqual(0);
    expect(annotation.evOptimal).toBeGreaterThanOrEqual(0);
    expect(annotation.evl).toBeGreaterThanOrEqual(0);
  });

  it('uses expectimax EV — evOptimal is highest EV among all candidates', () => {
    // pile=[K, J, A] (count=21), hand=[10H, 5S, 2D].
    // Playing 10H makes 31 = 2 pts. Playing 5S → count=26 (0 pts). Playing 2D → count=23 (0 pts).
    // Expectimax EV of 10H = 2 + opponent future > 0 + opponent future (5S or 2D).
    // evOptimal must correspond to the highest-EV candidate (10H in this case).
    const pile = [c('K','C'), c('J','D'), c('A','S')]; // 10+10+1=21
    const hand = [c('10','H'), c('5','S'), c('2','D')];
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('10','H')],  // optimal: makes 31 for 2 pts
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    // evOptimal is >= evActual (10H is optimal, player chose it)
    expect(annotation.evOptimal).toBeGreaterThanOrEqual(annotation.evActual);
    // EVL should be near 0 since player made the optimal play
    expect(annotation.evl).toBeLessThan(0.1);
    // evOptimal should be at least 2 (the 31 points)
    expect(annotation.evOptimal).toBeGreaterThanOrEqual(2);
    // severity: making 31 is the best play → excellent
    expect(annotation.severity).toBe('excellent');
  });

  it('should return evl=0 when only one card is playable', () => {
    // count=25, hand=[6H, K], only 6H is playable (6+25=31), K would bust (10+25=35>31).
    // With only one legal play, evActual must equal evOptimal → evl=0, severity=excellent.
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand: [c('6','H'), c('K','S')],
      playerChoice: [c('6','H')],  // only playable card
      isDealer: false,
      pile: [c('10','C'), c('9','D'), c('6','S')], // 10+9+6=25
      count: 25,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    // When there's only one playable card, evl must be 0 — no alternative exists
    expect(annotation.evl).toBe(0);
    expect(annotation.severity).toBe('excellent');
  });
});

describe('analyzeHand', () => {
  function makeOptimalDiscardSnapshot(hand: Card[], isDealer: boolean, handIndex: number): DecisionSnapshot {
    const opt = optimalDiscard(hand, isDealer);
    return {
      type: 'discard',
      hand,
      playerChoice: [...opt.discard],
      isDealer,
      handIndex,
    };
  }

  it('returns zero totalEVL when all decisions were optimal', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const snapshots: DecisionSnapshot[] = [
      makeOptimalDiscardSnapshot(hand, true, 0),
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.totalEVL).toBeLessThan(0.1);
    expect(summary.handIndex).toBe(0);
    expect(summary.annotations).toHaveLength(1);
  });

  it('identifies the worst decision in the hand', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const worst = opt.allOptions[opt.allOptions.length - 1];
    const snapshots: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...worst.discard], isDealer: true, handIndex: 0 },
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.worstDecision).not.toBeNull();
    expect(summary.worstDecision!.evl).toBeGreaterThan(0);
  });

  it('aggregates EVL from multiple decisions', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worstOpt = opt.allOptions[opt.allOptions.length - 1];
    // Two suboptimal decisions
    const snapshots: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...worstOpt.discard], isDealer: false, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...worstOpt.discard], isDealer: false, handIndex: 0 },
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.annotations).toHaveLength(2);
    expect(summary.totalEVL).toBeGreaterThan(0);
  });

  it('handles empty snapshots for a hand', () => {
    const summary = analyzeHand([], 2);
    expect(summary.handIndex).toBe(2);
    expect(summary.totalEVL).toBe(0);
    expect(summary.annotations).toHaveLength(0);
    expect(summary.worstDecision).toBeNull();
  });
});

describe('analyzeGame', () => {
  it('returns A+ grade for all-optimal decisions', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
    ];
    const summary = analyzeGame(log);
    expect(summary.grade).toBe('A+');
    expect(summary.totalDecisions).toBe(1);
    expect(summary.excellentCount).toBe(1);
  });

  it('returns poor grade for consistently poor decisions', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worst = opt.allOptions[opt.allOptions.length - 1];
    // Simulate many bad decisions
    const log: DecisionSnapshot[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'discard' as const,
      hand,
      playerChoice: [...worst.discard],
      isDealer: false,
      handIndex: i,
    }));
    const summary = analyzeGame(log);
    // Should be a poor grade (not A+)
    expect(summary.grade).not.toBe('A+');
    expect(summary.totalDecisions).toBe(5);
  });

  it('aggregates totalEVL across all hands', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worst = opt.allOptions[opt.allOptions.length - 1];
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...worst.discard], isDealer: false, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...worst.discard], isDealer: false, handIndex: 1 },
    ];
    const summary = analyzeGame(log);
    expect(summary.hands).toHaveLength(2); // grouped by handIndex
    expect(summary.totalEVL).toBeGreaterThan(0);
    expect(summary.totalDecisions).toBe(2);
  });

  it('groups decisions by handIndex into hands', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 1 },
    ];
    const summary = analyzeGame(log);
    expect(summary.hands).toHaveLength(2);
    expect(summary.hands[0].annotations).toHaveLength(2);
    expect(summary.hands[1].annotations).toHaveLength(1);
  });

  it('handles empty decisionLog', () => {
    const summary = analyzeGame([]);
    expect(summary.totalEVL).toBe(0);
    expect(summary.totalDecisions).toBe(0);
    expect(summary.hands).toHaveLength(0);
    expect(summary.grade).toBe('A+'); // no mistakes = perfect grade
  });
});
