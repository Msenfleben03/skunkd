import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameState';
import { createCard } from '../types';
import type { GameState, Card } from '../types';

function makeStartState(scores: [number, number] = [0, 0]): GameState {
  return {
    phase: 'DEALING',
    deck: [],
    players: [
      { hand: [], score: scores[0], pegFront: scores[0], pegBack: 0 },
      { hand: [], score: scores[1], pegFront: scores[1], pegBack: 0 },
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: {
      count: 0, pile: [], sequence: [],
      currentPlayerIndex: 1,
      goState: [false, false],
      playerCards: [[], []],
      lastCardPlayerIndex: null,
    },
    handStats: [
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ],
    winner: null,
    decisionLog: [],
    handStatsHistory: [],
  };
}

const hand0: Card[] = [
  createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
  createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
];
const hand1: Card[] = [
  createCard('7', 'S'), createCard('8', 'S'), createCard('9', 'S'),
  createCard('10', 'S'), createCard('J', 'S'), createCard('Q', 'S'),
];
const starter = createCard('K', 'D');

describe('LOAD_ONLINE_DEAL', () => {
  it('sets both hands and transitions to DISCARD_TO_CRIB', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.phase).toBe('DISCARD_TO_CRIB');
    expect(result.players[0].hand).toEqual(hand0);
    expect(result.players[1].hand).toEqual(hand1);
  });

  it('sets deck to [starter] so CUT works', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.deck).toEqual([starter]);
    expect(result.starter).toBeNull(); // not revealed until CUT
  });

  it('preserves existing scores across hands', () => {
    const state = makeStartState([45, 32]);
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 1,
      handNumber: 2,
    });
    expect(result.players[0].score).toBe(45);
    expect(result.players[1].score).toBe(32);
    expect(result.dealerIndex).toBe(1);
    expect(result.handNumber).toBe(2);
  });

  it('resets crib, handStats, and pegging', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.crib).toEqual([]);
    expect(result.handStats).toEqual([
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ]);
    expect(result.pegging.count).toBe(0);
    // Non-dealer plays first in pegging
    expect(result.pegging.currentPlayerIndex).toBe(1); // dealer=0, so non-dealer=1
  });
});
