import { describe, it, expect } from 'vitest';
import type { Card, GameState, PlayerState, PeggingState } from '../types';
import { createCard } from '../types';
import { createGame, gameReducer } from '../gameState';

/** Helper to create cards concisely */
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return createCard(rank, suit);
}

/** Build a GameState with overrides for targeted testing */
function makeState(overrides: Partial<GameState>): GameState {
  const defaults: GameState = {
    phase: 'GAME_START',
    deck: [],
    players: [
      { hand: [], score: 0, pegFront: 0, pegBack: 0 },
      { hand: [], score: 0, pegFront: 0, pegBack: 0 },
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: {
      count: 0,
      pile: [],
      sequence: [],
      currentPlayerIndex: 1, // non-dealer plays first
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
  };
  return { ...defaults, ...overrides };
}

function makePlayer(overrides: Partial<PlayerState>): PlayerState {
  return { hand: [], score: 0, pegFront: 0, pegBack: 0, ...overrides };
}

function makePegging(overrides: Partial<PeggingState>): PeggingState {
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

describe('createGame', () => {
  it('initializes 2-player game in DEALING phase', () => {
    const state = createGame(2);
    expect(state.phase).toBe('DEALING');
    expect(state.players).toHaveLength(2);
    expect(state.deck).toHaveLength(52);
    expect(state.handNumber).toBe(1);
    expect(state.winner).toBeNull();
  });

  it('all players start at 0 score', () => {
    const state = createGame(2);
    for (const p of state.players) {
      expect(p.score).toBe(0);
      expect(p.hand).toHaveLength(0);
    }
  });
});

describe('gameReducer — DEAL', () => {
  it('deals 6 cards per player in 2-player game', () => {
    const state = createGame(2);
    const dealt = gameReducer(state, { type: 'DEAL' });
    expect(dealt.phase).toBe('DISCARD_TO_CRIB');
    expect(dealt.players[0].hand).toHaveLength(6);
    expect(dealt.players[1].hand).toHaveLength(6);
    expect(dealt.deck).toHaveLength(52 - 12);
  });

  it('throws if not in DEALING phase', () => {
    const state = makeState({ phase: 'PEGGING' });
    expect(() => gameReducer(state, { type: 'DEAL' })).toThrow();
  });
});

describe('gameReducer — DISCARD', () => {
  it('moves discarded cards from hand to crib', () => {
    const hand0 = [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H'), card('5', 'H'), card('6', 'H')];
    const hand1 = [card('7', 'S'), card('8', 'S'), card('9', 'S'), card('10', 'S'), card('J', 'S'), card('Q', 'S')];
    const state = makeState({
      phase: 'DISCARD_TO_CRIB',
      players: [makePlayer({ hand: hand0 }), makePlayer({ hand: hand1 })],
    });

    // Player 0 discards 2 cards
    const after0 = gameReducer(state, { type: 'DISCARD', playerIndex: 0, cardIds: ['5-H', '6-H'] });
    expect(after0.players[0].hand).toHaveLength(4);
    expect(after0.crib).toHaveLength(2);
    expect(after0.phase).toBe('DISCARD_TO_CRIB'); // still waiting for player 1

    // Player 1 discards 2 cards
    const after1 = gameReducer(after0, { type: 'DISCARD', playerIndex: 1, cardIds: ['J-S', 'Q-S'] });
    expect(after1.players[1].hand).toHaveLength(4);
    expect(after1.crib).toHaveLength(4);
    expect(after1.phase).toBe('CUT_STARTER'); // both done
  });

  it('throws on wrong number of discards', () => {
    const hand = [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H'), card('5', 'H'), card('6', 'H')];
    const state = makeState({
      phase: 'DISCARD_TO_CRIB',
      players: [makePlayer({ hand: hand }), makePlayer({ hand: [] })],
    });
    expect(() => gameReducer(state, { type: 'DISCARD', playerIndex: 0, cardIds: ['5-H'] })).toThrow();
  });

  it('throws on cards not in hand', () => {
    const hand = [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H'), card('5', 'H'), card('6', 'H')];
    const state = makeState({
      phase: 'DISCARD_TO_CRIB',
      players: [makePlayer({ hand: hand }), makePlayer({ hand: [] })],
    });
    expect(() => gameReducer(state, { type: 'DISCARD', playerIndex: 0, cardIds: ['K-S', 'Q-S'] })).toThrow();
  });
});

describe('gameReducer — CUT', () => {
  it('sets starter from deck and transitions to PEGGING', () => {
    const deck = [card('7', 'D'), card('8', 'C'), card('9', 'H')];
    const state = makeState({
      phase: 'CUT_STARTER',
      deck,
      players: [
        makePlayer({ hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')] }),
        makePlayer({ hand: [card('5', 'S'), card('6', 'S'), card('7', 'S'), card('8', 'S')] }),
      ],
    });

    const cut = gameReducer(state, { type: 'CUT' });
    expect(cut.starter).toEqual(card('7', 'D'));
    expect(cut.deck).toHaveLength(2);
    expect(cut.phase).toBe('PEGGING');
  });

  it('His Heels: Jack starter awards 2 points to dealer', () => {
    const deck = [card('J', 'D'), card('8', 'C')];
    const state = makeState({
      phase: 'CUT_STARTER',
      deck,
      dealerIndex: 0,
      players: [
        makePlayer({ hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')] }),
        makePlayer({ hand: [card('5', 'S'), card('6', 'S'), card('7', 'S'), card('8', 'S')] }),
      ],
    });

    const cut = gameReducer(state, { type: 'CUT' });
    expect(cut.starter!.rank).toBe('J');
    expect(cut.players[0].score).toBe(2); // dealer gets 2
    expect(cut.players[1].score).toBe(0);
  });

  it('non-Jack starter awards no His Heels points', () => {
    const deck = [card('K', 'D'), card('8', 'C')];
    const state = makeState({
      phase: 'CUT_STARTER',
      deck,
      dealerIndex: 0,
      players: [
        makePlayer({ hand: [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')] }),
        makePlayer({ hand: [card('5', 'S'), card('6', 'S'), card('7', 'S'), card('8', 'S')] }),
      ],
    });

    const cut = gameReducer(state, { type: 'CUT' });
    expect(cut.players[0].score).toBe(0);
    expect(cut.players[1].score).toBe(0);
  });
});

describe('gameReducer — PLAY_CARD', () => {
  it('non-dealer plays first', () => {
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      pegging: makePegging({
        currentPlayerIndex: 1, // non-dealer (dealer is 0)
        playerCards: [
          [card('A', 'H'), card('2', 'H'), card('3', 'H'), card('4', 'H')],
          [card('5', 'S'), card('6', 'S'), card('7', 'S'), card('8', 'S')],
        ],
      }),
    });

    // Player 1 (non-dealer) plays first — should succeed
    const played = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: '5-S' });
    expect(played.pegging.count).toBe(5);
    expect(played.pegging.pile).toHaveLength(1);
  });

  it('throws if wrong player tries to play', () => {
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      pegging: makePegging({
        currentPlayerIndex: 1,
        playerCards: [
          [card('A', 'H')],
          [card('5', 'S')],
        ],
      }),
    });

    // Player 0 tries to play but it's player 1's turn
    expect(() => gameReducer(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: 'A-H' })).toThrow();
  });

  it('throws if card would exceed 31', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 25,
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // 7 + 25 = 32 > 31
          [],
        ],
      }),
    });

    expect(() => gameReducer(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: '7-H' })).toThrow();
  });

  it('scores pegging points (fifteen)', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 8,
        pile: [card('8', 'D')],
        sequence: [card('8', 'D')],
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // 7 + 8 = 15 → 2 pts
          [card('3', 'S')], // other player still has cards (prevents last-card bonus)
        ],
      }),
    });

    const played = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 0, cardId: '7-H' });
    expect(played.pegging.count).toBe(15);
    expect(played.players[0].score).toBe(2); // fifteen only, no last card
  });

  it('transitions to SHOW_NONDEALER when all cards exhausted', () => {
    // Use cards that don't form runs/pairs/fifteens: 2, 8, then play A (count=11)
    const state = makeState({
      phase: 'PEGGING',
      dealerIndex: 0,
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 10,
        pile: [card('2', 'H'), card('8', 'S')],
        sequence: [card('2', 'H'), card('8', 'S')],
        currentPlayerIndex: 1,
        playerCards: [
          [], // dealer has no cards left
          [card('A', 'S')], // non-dealer plays last card (count=11, no fifteen/pairs/runs)
        ],
        lastCardPlayerIndex: 0,
      }),
    });

    const played = gameReducer(state, { type: 'PLAY_CARD', playerIndex: 1, cardId: 'A-S' });
    expect(played.phase).toBe('SHOW_NONDEALER');
    // Last card point (1pt) awarded, no pegging score from the play
    expect(played.players[1].score).toBe(1);
  });
});

describe('gameReducer — DECLARE_GO', () => {
  it('throws if player has a playable card', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 25,
        currentPlayerIndex: 0,
        playerCards: [
          [card('3', 'H')], // 3 + 25 = 28 ≤ 31, can play!
          [],
        ],
      }),
    });

    expect(() => gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 })).toThrow();
  });

  it('accepts Go when no playable card', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 25,
        currentPlayerIndex: 0,
        playerCards: [
          [card('7', 'H')], // 7 + 25 = 32 > 31, can't play
          [card('3', 'S')],
        ],
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 0 });
    expect(result.pegging.goState[0]).toBe(true);
    expect(result.pegging.currentPlayerIndex).toBe(1); // turn passes to other player
  });

  it('resets count when both players Go', () => {
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 29,
        sequence: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        pile: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
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
    // Last card point to the last player who played
    expect(result.players[0].score).toBe(1);
  });

  it('tracks last-card Go point in handStats when cards remain', () => {
    // Both players say Go, cards still remaining — last-card point must appear in handStats
    const state = makeState({
      phase: 'PEGGING',
      starter: card('K', 'D'),
      pegging: makePegging({
        count: 29,
        sequence: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        pile: [card('K', 'H'), card('Q', 'S'), card('9', 'D')],
        currentPlayerIndex: 1,
        goState: [true, false],
        playerCards: [
          [card('8', 'H')], // 8 + 29 = 37 > 31 — can't play
          [card('7', 'S')], // 7 + 29 = 36 > 31 — can't play
        ],
        lastCardPlayerIndex: 0, // player 0 played last
      }),
    });

    const result = gameReducer(state, { type: 'DECLARE_GO', playerIndex: 1 });
    // Player 0 scores 1 (last card) — tracked in handStats
    expect(result.handStats[0].pegging).toBe(1);
    expect(result.handStats[1].pegging).toBe(0);
  });
});

describe('gameReducer — ADVANCE_SHOW', () => {
  it('scores non-dealer hand first, then dealer, then crib', () => {
    // Set up a state with known hands for predictable scoring
    // Non-dealer (player 1): 5H, 5S, 5D, JC + starter 5C = 29 points
    // Dealer (player 0): A,3,6,Q = 0 points with starter K
    // For simpler verification, use a hand where scoring is known
    const state = makeState({
      phase: 'SHOW_NONDEALER',
      dealerIndex: 0,
      starter: card('5', 'C'),
      players: [
        makePlayer({ hand: [card('A', 'H'), card('3', 'S'), card('6', 'D'), card('Q', 'C')] }),
        makePlayer({ hand: [card('5', 'H'), card('5', 'S'), card('5', 'D'), card('J', 'C')] }),
      ],
      crib: [card('2', 'H'), card('4', 'S'), card('8', 'D'), card('9', 'C')],
    });

    // Score non-dealer (player 1) hand: 29 points
    const afterNonDealer = gameReducer(state, { type: 'ADVANCE_SHOW' });
    expect(afterNonDealer.phase).toBe('SHOW_DEALER');
    expect(afterNonDealer.players[1].score).toBe(29);

    // Score dealer (player 0) hand
    const afterDealer = gameReducer(afterNonDealer, { type: 'ADVANCE_SHOW' });
    expect(afterDealer.phase).toBe('SHOW_CRIB');
    // A(1)+3+6+Q(10)+5 starter — fifteens: A+3+6+5=15 (2pts) + Q+5=15 (2pts) = 4pts
    expect(afterDealer.players[0].score).toBe(4);

    // Score crib (for dealer, player 0)
    const afterCrib = gameReducer(afterDealer, { type: 'ADVANCE_SHOW' });
    expect(afterCrib.phase).toBe('HAND_COMPLETE');
  });

  it('game ends immediately when player hits 121 during show', () => {
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

    // Non-dealer scores 29 → 115 + 29 = 144 ≥ 121 → GAME_OVER
    const result = gameReducer(state, { type: 'ADVANCE_SHOW' });
    expect(result.phase).toBe('GAME_OVER');
    expect(result.winner).toBe(1);
    // Dealer hand and crib are NEVER scored
    expect(result.players[0].score).toBe(100); // unchanged
  });
});

describe('gameReducer — NEXT_HAND', () => {
  it('alternates dealer and resets to DEALING', () => {
    const state = makeState({
      phase: 'HAND_COMPLETE',
      dealerIndex: 0,
      handNumber: 1,
      players: [makePlayer({ score: 30 }), makePlayer({ score: 25 })],
    });

    const next = gameReducer(state, { type: 'NEXT_HAND' });
    expect(next.phase).toBe('DEALING');
    expect(next.dealerIndex).toBe(1); // rotated
    expect(next.handNumber).toBe(2);
    expect(next.deck).toHaveLength(52); // fresh deck
    expect(next.crib).toHaveLength(0);
    expect(next.starter).toBeNull();
    // Scores preserved
    expect(next.players[0].score).toBe(30);
    expect(next.players[1].score).toBe(25);
  });
});

describe('decisionLog initialization', () => {
  it('starts with empty decisionLog', () => {
    const game = createGame(2);
    expect(game.decisionLog).toEqual([]);
  });

  it('decisionLog persists through DEAL', () => {
    const game = gameReducer(createGame(2), { type: 'DEAL' });
    expect(game.decisionLog).toEqual([]);
  });
});

describe('decisionLog snapshot recording', () => {
  it('records a discard snapshot when player discards', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const hand = g.players[0].hand;
    const cardIds = [hand[0].id, hand[1].id];
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds });

    expect(g.decisionLog).toHaveLength(1);
    const snap = g.decisionLog[0];
    expect(snap.type).toBe('discard');
    expect(snap.hand).toHaveLength(6); // full 6-card hand before discard
    expect(snap.playerChoice).toHaveLength(2);
    expect(snap.playerChoice.map(c => c.id)).toEqual(cardIds);
    expect(snap.handIndex).toBe(0); // first hand (0-based)
  });

  it('records correct isDealer flag for discard', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    // Player 0 is dealer (dealerIndex=0 in createGame)
    const hand0 = g.players[0].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [hand0[0].id, hand0[1].id] });
    expect(g.decisionLog[0].isDealer).toBe(true);

    const hand1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [hand1[0].id, hand1[1].id] });
    expect(g.decisionLog[1].isDealer).toBe(false);
  });

  it('records a pegging play snapshot when PLAY_CARD', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    g = gameReducer(g, { type: 'CUT' });

    // Non-dealer plays first in pegging
    const firstPlayer = g.pegging.currentPlayerIndex;
    const firstCard = g.pegging.playerCards[firstPlayer][0];
    const snapshotsBefore = g.decisionLog.length;
    g = gameReducer(g, { type: 'PLAY_CARD', playerIndex: firstPlayer, cardId: firstCard.id });

    expect(g.decisionLog.length).toBe(snapshotsBefore + 1);
    const snap = g.decisionLog[g.decisionLog.length - 1];
    expect(snap.type).toBe('pegging_play');
    expect(snap.playerChoice).toHaveLength(1);
    expect(snap.playerChoice[0].id).toBe(firstCard.id);
    expect(snap.pile).toBeDefined();
    expect(snap.count).toBeDefined();
  });

  it('pegging snapshot captures pile and count BEFORE the play', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    g = gameReducer(g, { type: 'CUT' });

    // First play — pile should be empty, count=0 in snapshot
    const firstPlayer = g.pegging.currentPlayerIndex;
    const firstCard = g.pegging.playerCards[firstPlayer][0];
    g = gameReducer(g, { type: 'PLAY_CARD', playerIndex: firstPlayer, cardId: firstCard.id });

    const snap = g.decisionLog[g.decisionLog.length - 1];
    expect(snap.pile).toHaveLength(0); // pile was empty before this play
    expect(snap.count).toBe(0); // count was 0 before this play
  });

  it('decisionLog accumulates across multiple decisions', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    expect(g.decisionLog).toHaveLength(2); // 2 discard decisions
  });
});
