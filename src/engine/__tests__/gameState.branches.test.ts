/**
 * gameState.branches.test.ts
 *
 * Branch-gap coverage for the game state reducer. The main gameState.test.ts
 * covers the happy-path flow. These tests target edge branches that were not
 * exercised there:
 *
 *   - GAME_OVER triggered during PLAY_CARD (pegging score tips player over 121)
 *   - GAME_OVER triggered during PLAY_CARD via last-card bonus
 *   - GAME_OVER triggered during DECLARE_GO (last-card bonus tips winner)
 *   - GAME_OVER triggered during ADVANCE_SHOW for all three show sub-phases
 *   - LOAD_ONLINE_DEAL: full state setup and idempotency edge cases
 *   - DECLARE_GO: single-go pass, all-go reset, all-go when all cards exhausted
 *   - NEXT_HAND: dealer rotation, score preservation, clean slate
 */

import { describe, it, expect } from 'vitest';
import type { Card, GameState, PlayerState, PeggingState } from '../types';
import { createCard } from '../types';
import { gameReducer } from '../gameState';

// ── Helpers ──────────────────────────────────────────────────────────────────

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return createCard(rank, suit);
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return { hand: [], score: 0, pegFront: 0, pegBack: 0, ...overrides };
}

function makePegging(overrides: Partial<PeggingState> = {}): PeggingState {
  return {
    count: 0,
    pile: [],
    sequence: [],
    currentPlayerIndex: 1,
    goState: [false, false],
    playerCards: [[], []],
    lastCardPlayerIndex: null,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const defaults: GameState = {
    phase: 'GAME_START',
    deck: [],
    players: [
      makePlayer(),
      makePlayer(),
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: makePegging(),
    handStats: [
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ],
    winner: null,
    decisionLog: [],
    handStatsHistory: [],
  };
  return { ...defaults, ...overrides };
}

// ── GAME_OVER detection — PLAY_CARD ──────────────────────────────────────────

describe('GAME_OVER detection during PLAY_CARD', () => {
  it('triggers GAME_OVER immediately when a pegging score tips player to 121', () => {
    // Player 0 is at 119. Playing a card that scores a pair (2 pts) wins the game.
    // pile: [5-H, 5-D] — playing 5-S creates three-of-a-kind (6 pts), plenty to win
    // but let's use a simpler fifteen: count=8, play 7 → fifteen (2 pts) → 119+2=121
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 1,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 119 }),
        makePlayer({ score: 80 }),
      ],
      pegging: makePegging({
        count: 8,
        pile: [card('8', 'D')],
        sequence: [card('8', 'D')],
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // 7 + 8 = 15 → 2 pts → 119 + 2 = 121
          [card('3', 'S')],
        ],
      }),
    });

    const result = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: '7-H' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(0);
    expect(result.players[0].score).toBe(121);
    // Opponent score is untouched
    expect(result.players[1].score).toBe(80);
  });

  it('triggers GAME_OVER when last-card bonus (1 pt) pushes player to exactly 121', () => {
    // Player 1 (non-dealer) is at 120. They play the very last card in the game.
    // The play itself scores 0 (no fifteen/pair/run). The last-card bonus (1 pt)
    // pushes them to 121, which must win immediately.
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 90 }),
        makePlayer({ score: 120 }),
      ],
      pegging: makePegging({
        count: 2,
        pile: [card('2', 'H')],
        sequence: [card('2', 'H')],
        currentPlayerIndex: 1,
        playerCards: [
          [], // dealer has no cards left
          [card('A', 'S')], // A + 2 = 3, no scoring combination → just last-card 1 pt
        ],
        lastCardPlayerIndex: 0,
      }),
    });

    const result = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: 'A-S' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(1);
    expect(result.players[1].score).toBe(121);
  });

  it('does NOT trigger GAME_OVER when score stays below 121', () => {
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 1,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 100 }),
        makePlayer({ score: 50 }),
      ],
      pegging: makePegging({
        count: 8,
        pile: [card('8', 'D')],
        sequence: [card('8', 'D')],
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // fifteen → 2 pts → 100 + 2 = 102, still under 121
          [card('3', 'S')],
        ],
      }),
    });

    const result = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: '7-H' });

    expect(result.phase).toBe('PEGGING');
    expect(result.winner).toBeNull();
    expect(result.players[0].score).toBe(102);
  });

  it('sets winner to the correct player index when GAME_OVER via pegging', () => {
    // Player 1 wins via pegging, not player 0
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 50 }),
        makePlayer({ score: 119 }),
      ],
      pegging: makePegging({
        count: 8,
        pile: [card('8', 'D')],
        sequence: [card('8', 'D')],
        currentPlayerIndex: 1,
        playerCards: [
          [card('3', 'S')],
          [card('7', 'H')], // fifteen → 2 pts → 119 + 2 = 121
        ],
      }),
    });

    const result = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: '7-H' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(1);
  });
});

// ── GAME_OVER detection — DECLARE_GO ─────────────────────────────────────────

describe('GAME_OVER detection during DECLARE_GO', () => {
  it('triggers GAME_OVER when last-card Go point puts winner at 121', () => {
    // Both players declare Go. The last card played belongs to player 0 who sits at 120.
    // The 1-pt Go bonus → 121 → immediate win.
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 1,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 120 }),
        makePlayer({ score: 80 }),
      ],
      pegging: makePegging({
        count: 28,
        pile: [card('K', 'H'), card('Q', 'S'), card('8', 'D')],
        sequence: [card('K', 'H'), card('Q', 'S'), card('8', 'D')],
        currentPlayerIndex: 1,
        goState: [true, false], // player 0 already said Go
        playerCards: [
          [card('4', 'H')], // 4 + 28 = 32 > 31, can't play
          [card('5', 'S')], // 5 + 28 = 33 > 31, can't play
        ],
        lastCardPlayerIndex: 0, // player 0 played last
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 1 });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(0);
    expect(result.players[0].score).toBe(121);
  });

  it('triggers GAME_OVER via Go when lastCardPlayerIndex is player 1', () => {
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 80 }),
        makePlayer({ score: 120 }),
      ],
      pegging: makePegging({
        count: 28,
        pile: [card('K', 'H'), card('8', 'D')],
        sequence: [card('K', 'H'), card('8', 'D')],
        currentPlayerIndex: 0,
        goState: [false, true], // player 1 already said Go
        playerCards: [
          [card('4', 'H')], // 4 + 28 = 32 > 31
          [card('5', 'S')], // 5 + 28 = 33 > 31
        ],
        lastCardPlayerIndex: 1, // player 1 played last
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(1);
    expect(result.players[1].score).toBe(121);
  });
});

// ── GAME_OVER detection — ADVANCE_SHOW ───────────────────────────────────────

describe('GAME_OVER detection during ADVANCE_SHOW', () => {
  it('triggers GAME_OVER in SHOW_NONDEALER when non-dealer reaches 121', () => {
    // Non-dealer (player 1) is at 115. Hand scores 29 → 115 + 29 = 144 ≥ 121.
    const state = makeState({
      phase: 'SHOW_NONDEALER',
      dealerIndex: 0,
      starter: card('5', 'C'),
      players: [
        makePlayer({ score: 100, hand: [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('Q', 'C')] }),
        makePlayer({ score: 115, hand: [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('J', 'C')] }),
      ],
      crib: [card('2', 'H'), card('4', 'S'), card('8', 'D'), card('9', 'C')],
    });

    const result = gameReducer(state, { type: 'ADVANCE_SHOW' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(1);
    expect(result.players[1].score).toBeGreaterThanOrEqual(121);
    // Dealer score must NOT be updated — game stops immediately
    expect(result.players[0].score).toBe(100);
  });

  it('triggers GAME_OVER in SHOW_DEALER when dealer reaches 121', () => {
    // Dealer (player 0) scores 29 from hand → 115 + 29 = 144 ≥ 121.
    // Non-dealer survived their show phase (score < 121).
    const state = makeState({
      phase: 'SHOW_DEALER',
      dealerIndex: 0,
      starter: card('5', 'C'),
      players: [
        makePlayer({ score: 115, hand: [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('J', 'C')] }),
        makePlayer({ score: 80, hand: [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('Q', 'C')] }),
      ],
      crib: [card('2', 'H'), card('4', 'S'), card('8', 'D'), card('9', 'C')],
    });

    const result = gameReducer(state, { type: 'ADVANCE_SHOW' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(0);
    expect(result.players[0].score).toBeGreaterThanOrEqual(121);
    // Crib must NOT be scored — game stops immediately
    expect(result.players[1].score).toBe(80);
  });

  it('triggers GAME_OVER in SHOW_CRIB when dealer reaches 121 via crib', () => {
    // Dealer (player 0) is at 118. Crib contains 5-5-5-J with starter 5 = 29 pts.
    // 118 + any crib score that produces ≥ 3 wins.
    // Use a simple crib: 5H 10S AS KD with starter 5C → 5+10=15, 5+A=... use known crib
    // Simpler: dealer at 119, crib has one fifteen (2 pts) → 119+2=121
    // Crib: 5-H, 10-S, 2-D, 3-C + starter K-D
    // 5+10=15 (2pts) → 2 pts from crib is enough
    const state = makeState({
      phase: 'SHOW_CRIB',
      dealerIndex: 0,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 119, hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')] }),
        makePlayer({ score: 80, hand: [card('6', 'S'), card('7', 'S'), card('8', 'S'), card('9', 'S')] }),
      ],
      crib: [card('5', 'H'), card('10', 'S'), card('2', 'D'), card('3', 'C')],
    });

    const result = gameReducer(state, { type: 'ADVANCE_SHOW' });

    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(0);
    expect(result.players[0].score).toBeGreaterThanOrEqual(121);
  });

  it('does NOT trigger GAME_OVER when show score stays below 121', () => {
    const state = makeState({
      phase: 'SHOW_NONDEALER',
      dealerIndex: 0,
      starter: card('2', 'C'),
      players: [
        makePlayer({ score: 50, hand: [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('Q', 'C')] }),
        makePlayer({ score: 40, hand: [card('9', 'H'), card('J', 'S'), card('Q', 'D'), card('K', 'C')] }),
      ],
      crib: [card('2', 'H'), card('4', 'S'), card('8', 'D'), card('7', 'C')],
    });

    const result = gameReducer(state, { type: 'ADVANCE_SHOW' });

    expect(result.phase).toBe('SHOW_DEALER');
    expect(result.winner).toBeNull();
  });
});

// ── LOAD_ONLINE_DEAL ──────────────────────────────────────────────────────────

describe('LOAD_ONLINE_DEAL', () => {
  const hand0: Card[] = [
    card('A', 'H'), card('2', 'H'), card('3', 'H'),
    card('4', 'H'), card('5', 'H'), card('6', 'H'),
  ];
  const hand1: Card[] = [
    card('7', 'S'), card('8', 'S'), card('9', 'S'),
    card('10', 'S'), card('J', 'S'), card('Q', 'S'),
  ];
  const starterCard = card('K', 'D');

  it('transitions phase from DEALING to DISCARD_TO_CRIB', () => {
    const state = makeState({ phase: 'DEALING' });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.phase).toBe('DISCARD_TO_CRIB');
  });

  it('sets each player hand correctly', () => {
    const state = makeState({ phase: 'DEALING' });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.players[0].hand).toEqual(hand0);
    expect(result.players[1].hand).toEqual(hand1);
  });

  it('stores starter in deck (not in starter field yet)', () => {
    // starter card is stored in deck[0]; starter field stays null until CUT
    const state = makeState({ phase: 'DEALING' });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.deck).toEqual([starterCard]);
    expect(result.starter).toBeNull();
  });

  it('sets dealerIndex from the action', () => {
    const state = makeState({ phase: 'DEALING', dealerIndex: 0 });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 1,
      handNumber: 3,
    });

    expect(result.dealerIndex).toBe(1);
  });

  it('sets handNumber from the action', () => {
    const state = makeState({ phase: 'DEALING' });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 5,
    });

    expect(result.handNumber).toBe(5);
  });

  it('resets crib to empty', () => {
    const state = makeState({
      phase: 'DEALING',
      crib: [card('2', 'D'), card('3', 'D')],
    });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.crib).toHaveLength(0);
  });

  it('preserves existing decisionLog entries when loading online deal', () => {
    const prior = makeState({
      phase: 'DEALING',
      decisionLog: [
        {
          type: 'discard',
          hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H'), card('5', 'H'), card('6', 'H')],
          playerChoice: [card('A', 'H'), card('2', 'H')],
          isDealer: false,
          handIndex: 0,
        },
      ],
    });
    const newHand0: Card[] = [
      card('3', 'H'), card('4', 'H'), card('5', 'H'),
      card('6', 'H'), card('7', 'H'), card('8', 'H'),
    ];
    const newHand1: Card[] = [
      card('9', 'S'), card('10', 'S'), card('J', 'S'),
      card('Q', 'S'), card('K', 'S'), card('A', 'S'),
    ];
    const next = gameReducer(prior, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [newHand0, newHand1],
      starter: card('2', 'D'),
      dealerIndex: 0,
      handNumber: 2,
    });
    expect(next.decisionLog).toHaveLength(1);
    expect(next.decisionLog[0].type).toBe('discard');
  });

  it('resets handStats to zero for all players', () => {
    const state = makeState({
      phase: 'DEALING',
      handStats: [
        { pegging: 5, hand: 10, crib: 3 },
        { pegging: 2, hand: 8, crib: 0 },
      ],
    });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.handStats[0]).toEqual({ pegging: 0, hand: 0, crib: 0 });
    expect(result.handStats[1]).toEqual({ pegging: 0, hand: 0, crib: 0 });
  });

  it('clears winner field', () => {
    const state = makeState({ phase: 'DEALING', winner: 0 });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    expect(result.winner).toBeNull();
  });

  it('initialises pegging with non-dealer leading (dealerIndex=0)', () => {
    const state = makeState({ phase: 'DEALING', dealerIndex: 0 });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 1,
    });

    // Non-dealer is player 1 when dealer is player 0
    expect(result.pegging.currentPlayerIndex).toBe(1);
    expect(result.pegging.count).toBe(0);
    expect(result.pegging.goState).toEqual([false, false]);
  });

  it('initialises pegging with non-dealer leading (dealerIndex=1)', () => {
    const state = makeState({ phase: 'DEALING', dealerIndex: 1 });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 1,
      handNumber: 1,
    });

    // Non-dealer is player 0 when dealer is player 1
    expect(result.pegging.currentPlayerIndex).toBe(0);
  });

  it('preserves existing player scores across hands', () => {
    const state = makeState({
      phase: 'DEALING',
      players: [
        makePlayer({ score: 42 }),
        makePlayer({ score: 37 }),
      ],
    });

    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter: starterCard,
      dealerIndex: 0,
      handNumber: 2,
    });

    expect(result.players[0].score).toBe(42);
    expect(result.players[1].score).toBe(37);
  });
});

// ── DECLARE_GO branches ───────────────────────────────────────────────────────

describe('DECLARE_GO branches', () => {
  it('updates goState for the declaring player without resetting count', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 26,
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // 7 + 26 = 33 > 31, cannot play
          [card('3', 'S')], // 3 + 26 = 29 ≤ 31, other player CAN play
        ],
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 });

    expect(result.pegging.goState[0]).toBe(true);
    expect(result.pegging.goState[1]).toBe(false);
    // Count must NOT reset — only one player has gone
    expect(result.pegging.count).toBe(26);
    // Turn passes to the other player
    expect(result.pegging.currentPlayerIndex).toBe(1);
  });

  it('passes the turn to the other player when only one player has declared Go', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 26,
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // cannot play (33 > 31)
          [card('3', 'S')], // can play
        ],
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 });

    expect(result.pegging.currentPlayerIndex).toBe(1);
  });

  it('resets count and sequence when both players declare Go with cards remaining', () => {
    // Both players have unplayable cards, cards still remain in hands.
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 1,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 10 }),
        makePlayer({ score: 15 }),
      ],
      pegging: makePegging({
        count: 29,
        pile: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        sequence: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        currentPlayerIndex: 1,
        goState: [true, false], // player 0 already said Go
        playerCards: [
          [card('8', 'H')], // 8 + 29 = 37 > 31
          [card('7', 'S')], // 7 + 29 = 36 > 31
        ],
        lastCardPlayerIndex: 0,
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 1 });

    expect(result.pegging.count).toBe(0);
    expect(result.pegging.sequence).toHaveLength(0);
    expect(result.pegging.goState).toEqual([false, false]);
  });

  it('awards last-card point to lastCardPlayerIndex when both Go', () => {
    // lastCardPlayerIndex = 0, player 0 is at 50 → should reach 51
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 1,
      starter: card('K', 'D'),
      players: [
        makePlayer({ score: 50 }),
        makePlayer({ score: 60 }),
      ],
      pegging: makePegging({
        count: 29,
        pile: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        sequence: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        currentPlayerIndex: 1,
        goState: [true, false],
        playerCards: [
          [card('8', 'H')],
          [card('7', 'S')],
        ],
        lastCardPlayerIndex: 0,
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 1 });

    expect(result.players[0].score).toBe(51);
    expect(result.players[1].score).toBe(60); // unchanged
  });

  it('transitions to SHOW_NONDEALER when both Go and all cards are exhausted', () => {
    // Both players declare Go and there are no cards left in playerCards.
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 25,
        pile: [card('K', 'H'), card('Q', 'S'), card('5', 'D')],
        sequence: [card('K', 'H'), card('Q', 'S'), card('5', 'D')],
        currentPlayerIndex: 1,
        goState: [true, false],
        playerCards: [
          [], // no cards left
          [], // no cards left
        ],
        lastCardPlayerIndex: 0,
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 1 });

    expect(result.phase).toBe('SHOW_NONDEALER');
  });

  it('throws when declaring Go out of turn', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 26,
        currentPlayerIndex: 1, // it is player 1's turn
        playerCards: [
          [card('7', 'H')], // player 0's card (not their turn)
          [card('8', 'S')], // 8 + 26 = 34 > 31, cannot play
        ],
      }),
    });

    expect(() => gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 })).toThrow();
  });

  it('throws when player has a card they can legally play', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 20,
        currentPlayerIndex: 0,
        playerCards: [
          [card('4', 'H')], // 4 + 20 = 24 ≤ 31, CAN play
          [card('3', 'S')],
        ],
      }),
    });

    expect(() => gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 })).toThrow();
  });
});

// ── NEXT_HAND ─────────────────────────────────────────────────────────────────

describe('NEXT_HAND', () => {
  it('transitions to DEALING phase', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.phase).toBe('DEALING');
  });

  it('rotates dealer from 0 to 1 in a 2-player game', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.dealerIndex).toBe(1);
  });

  it('rotates dealer from 1 back to 0 in a 2-player game', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 1,
      handNumber: 2,
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.dealerIndex).toBe(0);
  });

  it('increments handNumber', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 3,
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.handNumber).toBe(4);
  });

  it('deals a fresh 52-card deck', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      deck: [card('A', 'H')], // stale deck from previous hand
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.deck).toHaveLength(52);
  });

  it('preserves player scores', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      players: [
        makePlayer({ score: 45 }),
        makePlayer({ score: 72 }),
      ],
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.players[0].score).toBe(45);
    expect(result.players[1].score).toBe(72);
  });

  it('clears player hands', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      players: [
        makePlayer({ hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')] }),
        makePlayer({ hand: [card('5', 'S'), card('6', 'S'), card('7', 'S'), card('8', 'S')] }),
      ],
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.players[0].hand).toHaveLength(0);
    expect(result.players[1].hand).toHaveLength(0);
  });

  it('clears crib', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      crib: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')],
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.crib).toHaveLength(0);
  });

  it('clears starter', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      starter: card('K', 'D'),
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.starter).toBeNull();
  });

  it('resets handStats to zero for all players', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      handStats: [
        { pegging: 6, hand: 12, crib: 4 },
        { pegging: 3, hand: 8, crib: 0 },
      ],
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.handStats[0]).toEqual({ pegging: 0, hand: 0, crib: 0 });
    expect(result.handStats[1]).toEqual({ pegging: 0, hand: 0, crib: 0 });
  });

  it('initialises pegging so the new non-dealer leads (new dealer is 1)', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0, // dealer was 0, so after rotation dealer becomes 1
      handNumber: 1,
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    // New dealer = 1, so new non-dealer (who leads pegging) = 0
    expect(result.pegging.currentPlayerIndex).toBe(0);
    expect(result.pegging.count).toBe(0);
    expect(result.pegging.pile).toHaveLength(0);
    expect(result.pegging.goState).toEqual([false, false]);
  });

  it('preserves handStatsHistory across NEXT_HAND', () => {
    const snapshot = {
      handNumber: 1,
      dealerIndex: 0,
      stats: [
        { pegging: 2, hand: 6, crib: 0 },
        { pegging: 1, hand: 4, crib: 0 },
      ],
      starterCard: card('K', 'D'),
    };

    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      handStatsHistory: [snapshot],
    });

    const result = gameReducer(state, { type: 'NEXT_HAND' });

    expect(result.handStatsHistory).toHaveLength(1);
    expect(result.handStatsHistory[0]).toEqual(snapshot);
  });

  it('throws when called from a phase other than HAND_COMPLETE', () => {
    const state = makeState({ phase: 'PEGGING' });

    expect(() => gameReducer(state, { type: 'NEXT_HAND' })).toThrow();
  });
});
