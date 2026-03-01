/**
 * useGame.test.ts
 *
 * Smoke tests for the useGame hook — the main game orchestration layer that
 * wraps the pure engine reducer and wires in AI auto-play, timers, and UI
 * selection state.
 *
 * These tests verify:
 *   - Initial state shape (GAME_START, no winner)
 *   - newGame() → DEALING → auto-deals after 1200 ms timer
 *   - toggleCardSelect add / remove / cap-enforcement
 *   - confirmDiscard with 2 selected cards (happy path, AI side-effect)
 *   - returnToMenu resets to GAME_START
 *   - humanPlayerIndex defaults to 0
 *   - localPlayerIndex option wires through to humanPlayerIndex
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../useGame';
import { createCard } from '@/engine/types';
import type { Card } from '@/engine/types';

// ── AI mocks ──────────────────────────────────────────────────────────────────
// Hoisted so the factory runs before the module imports are evaluated.
// aiSelectDiscard receives the real dealt hand and returns the first two cards
// from it — ensuring the card IDs always exist in the player's hand.

vi.mock('@/engine/ai', () => ({
  aiSelectDiscard: vi.fn((hand: Card[]) => ({
    discard: [hand[0], hand[1]] as [Card, Card],
    keep: hand.slice(2),
    expectedHandValue: 0,
  })),
  aiSelectPlay: vi.fn(() => null),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Hand helper available for future test expansion
// function makeHand6(): Card[] { ... }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGame — initial state', () => {
  it('starts in GAME_START phase', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.gameState.phase).toBe('GAME_START');
  });

  it('starts with no winner', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.gameState.winner).toBeNull();
  });

  it('starts with empty selectedCardIds', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.selectedCardIds.size).toBe(0);
  });

  it('starts with null showScoring', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.showScoring).toBeNull();
  });

  it('starts with null lastPeggingScore', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.lastPeggingScore).toBeNull();
  });

  it('exposes all required action functions', () => {
    const { result } = renderHook(() => useGame());
    const actions = [
      'newGame', 'returnToMenu', 'toggleCardSelect', 'confirmDiscard',
      'playSelectedCard', 'declareGo', 'advanceShow', 'nextHand',
      'dispatchRemoteAction',
    ] as const;
    for (const name of actions) {
      expect(typeof result.current[name]).toBe('function');
    }
  });
});

describe('useGame — humanPlayerIndex', () => {
  it('defaults humanPlayerIndex to 0 when no option provided', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.humanPlayerIndex).toBe(0);
  });

  it('reflects localPlayerIndex option when provided', () => {
    const { result } = renderHook(() => useGame({ localPlayerIndex: 1 }));
    expect(result.current.humanPlayerIndex).toBe(1);
  });
});

describe('useGame — newGame()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions from GAME_START to DEALING immediately after newGame()', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    expect(result.current.gameState.phase).toBe('DEALING');
  });

  it('auto-deals (transitions to DISCARD_TO_CRIB) after the 1200 ms timer', async () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    expect(result.current.gameState.phase).toBe('DEALING');

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.gameState.phase).toBe('DISCARD_TO_CRIB');
  });

  it('does NOT auto-deal before the 1200 ms timer fires', async () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000); // not enough
    });

    expect(result.current.gameState.phase).toBe('DEALING');
  });

  it('deals 6 cards to each player after the timer fires', async () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.gameState.players[0].hand).toHaveLength(6);
    expect(result.current.gameState.players[1].hand).toHaveLength(6);
  });

  it('clears selectedCardIds when newGame() is called', async () => {
    const { result } = renderHook(() => useGame());

    // Put something in selection first via a raw hack via toggleCardSelect
    // We have to be in a phase where selection is meaningful; just call it.
    act(() => {
      result.current.toggleCardSelect('A-H');
    });

    act(() => {
      result.current.newGame();
    });

    expect(result.current.selectedCardIds.size).toBe(0);
  });
});

describe('useGame — toggleCardSelect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getHookInDiscardPhase() {
    const hook = renderHook(() => useGame());

    act(() => {
      hook.result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    return hook;
  }

  it('adds a card ID to selectedCardIds', async () => {
    const { result } = await getHookInDiscardPhase();
    const firstCardId = result.current.gameState.players[0].hand[0].id;

    act(() => {
      result.current.toggleCardSelect(firstCardId);
    });

    expect(result.current.selectedCardIds.has(firstCardId)).toBe(true);
  });

  it('removes an already-selected card ID (toggle off)', async () => {
    const { result } = await getHookInDiscardPhase();
    const firstCardId = result.current.gameState.players[0].hand[0].id;

    act(() => {
      result.current.toggleCardSelect(firstCardId);
    });

    act(() => {
      result.current.toggleCardSelect(firstCardId);
    });

    expect(result.current.selectedCardIds.has(firstCardId)).toBe(false);
    expect(result.current.selectedCardIds.size).toBe(0);
  });

  it('allows selecting up to 2 cards during DISCARD_TO_CRIB', async () => {
    const { result } = await getHookInDiscardPhase();
    const hand = result.current.gameState.players[0].hand;

    act(() => {
      result.current.toggleCardSelect(hand[0].id);
      result.current.toggleCardSelect(hand[1].id);
    });

    expect(result.current.selectedCardIds.size).toBe(2);
  });

  it('does not exceed 2 selected cards during DISCARD_TO_CRIB', async () => {
    const { result } = await getHookInDiscardPhase();
    const hand = result.current.gameState.players[0].hand;

    act(() => {
      result.current.toggleCardSelect(hand[0].id);
      result.current.toggleCardSelect(hand[1].id);
      // Attempt to add a third — should be ignored
      result.current.toggleCardSelect(hand[2].id);
    });

    expect(result.current.selectedCardIds.size).toBe(2);
    expect(result.current.selectedCardIds.has(hand[2].id)).toBe(false);
  });

  it('clears selectedCardIds when phase changes (e.g., after phase transition)', async () => {
    const { result } = await getHookInDiscardPhase();
    const hand = result.current.gameState.players[0].hand;

    act(() => {
      result.current.toggleCardSelect(hand[0].id);
      result.current.toggleCardSelect(hand[1].id);
    });

    expect(result.current.selectedCardIds.size).toBe(2);

    // Confirm discard → clears selection explicitly inside confirmDiscard,
    // and the phase-change effect also clears it.
    await act(async () => {
      result.current.confirmDiscard();
      // Let AI discard timer fire so phase advances
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.selectedCardIds.size).toBe(0);
  });
});

describe('useGame — confirmDiscard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when fewer than 2 cards are selected', async () => {
    const hook = renderHook(() => useGame());

    act(() => {
      hook.result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    const phaseBefore = hook.result.current.gameState.phase;
    const hand = hook.result.current.gameState.players[0].hand;

    act(() => {
      hook.result.current.toggleCardSelect(hand[0].id); // only 1 selected
    });

    act(() => {
      hook.result.current.confirmDiscard();
    });

    // Phase must not change
    expect(hook.result.current.gameState.phase).toBe(phaseBefore);
    // Human player still has 6 cards
    expect(hook.result.current.gameState.players[0].hand).toHaveLength(6);
  });

  it('removes 2 cards from the human hand when confirmed with 2 selected', async () => {
    const hook = renderHook(() => useGame());

    act(() => {
      hook.result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    const hand = hook.result.current.gameState.players[0].hand;
    const id0 = hand[0].id;
    const id1 = hand[1].id;

    act(() => {
      hook.result.current.toggleCardSelect(id0);
      hook.result.current.toggleCardSelect(id1);
    });

    act(() => {
      hook.result.current.confirmDiscard();
    });

    expect(hook.result.current.gameState.players[0].hand).toHaveLength(4);
  });

  it('clears selectedCardIds after confirming discard', async () => {
    const hook = renderHook(() => useGame());

    act(() => {
      hook.result.current.newGame();
    });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    const hand = hook.result.current.gameState.players[0].hand;

    act(() => {
      hook.result.current.toggleCardSelect(hand[0].id);
      hook.result.current.toggleCardSelect(hand[1].id);
    });

    act(() => {
      hook.result.current.confirmDiscard();
    });

    expect(hook.result.current.selectedCardIds.size).toBe(0);
  });

  it('AI discards and phase advances to CUT_STARTER after both players discard', async () => {
    const hook = renderHook(() => useGame());

    act(() => {
      hook.result.current.newGame();
    });

    // Auto-deal fires
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    const hand = hook.result.current.gameState.players[0].hand;

    act(() => {
      hook.result.current.toggleCardSelect(hand[0].id);
      hook.result.current.toggleCardSelect(hand[1].id);
    });

    // Human discards
    act(() => {
      hook.result.current.confirmDiscard();
    });

    // AI discard timer (350 ms) + CUT timer (1200 ms)
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // After AI discards, phase should move to CUT_STARTER then auto-cut to PEGGING
    // At minimum it should have advanced past DISCARD_TO_CRIB
    expect(hook.result.current.gameState.phase).not.toBe('DISCARD_TO_CRIB');
  });
});

describe('useGame — returnToMenu', () => {
  it('resets phase to GAME_START', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    expect(result.current.gameState.phase).toBe('DEALING');

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.gameState.phase).toBe('GAME_START');
  });

  it('clears selectedCardIds', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.toggleCardSelect('A-H');
    });

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.selectedCardIds.size).toBe(0);
  });

  it('clears showScoring', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.showScoring).toBeNull();
  });

  it('clears lastPeggingScore', () => {
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.lastPeggingScore).toBeNull();
  });

  it('resets winner to null', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame());

    act(() => {
      result.current.newGame();
    });

    await act(async () => { vi.advanceTimersByTime(1500); });

    act(() => {
      result.current.returnToMenu();
    });

    expect(result.current.gameState.winner).toBeNull();
    vi.useRealTimers();
  });

  it('can call returnToMenu from GAME_START without error', () => {
    const { result } = renderHook(() => useGame());

    expect(() => {
      act(() => {
        result.current.returnToMenu();
      });
    }).not.toThrow();

    expect(result.current.gameState.phase).toBe('GAME_START');
  });
});

describe('useGame — show phase labels use localPlayerIndex not hardcoded seat 0', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('labels SHOW_NONDEALER as "Your Hand" when localPlayerIndex matches the non-dealer', async () => {
    // dealer=0, so non-dealer=1. With localPlayerIndex=1, non-dealer show = "Your Hand".
    const { result } = renderHook(() => useGame({ isOnline: true, localPlayerIndex: 1 }));

    const hand0 = [
      createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
      createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
    ];
    const hand1 = [
      createCard('A', 'S'), createCard('2', 'S'), createCard('3', 'S'),
      createCard('4', 'S'), createCard('5', 'S'), createCard('6', 'S'),
    ];

    // Load deal: both get 6 cards, dealer=0
    act(() => {
      result.current.dispatchRemoteAction({
        type: 'LOAD_ONLINE_DEAL',
        hands: [hand0, hand1],
        starter: createCard('K', 'D'),
        dealerIndex: 0,
        handNumber: 1,
      });
    });

    // Both players discard cards 4+5 (5-x, 6-x), keeping A,2,3,4
    act(() => {
      result.current.dispatchRemoteAction({ type: 'DISCARD', playerIndex: 0, cardIds: ['5-H', '6-H'] });
      result.current.dispatchRemoteAction({ type: 'DISCARD', playerIndex: 1, cardIds: ['5-S', '6-S'] });
    });

    // CUT_STARTER: auto-cut fires after 1200ms
    await act(async () => { vi.advanceTimersByTime(1500); });

    // PEGGING: non-dealer (P1) plays first, alternate through all 4 cards each
    act(() => {
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: 'A-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: 'A-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '2-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '2-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '3-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '3-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '4-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '4-H' });
    });

    // All cards exhausted → SHOW_NONDEALER
    expect(result.current.gameState.phase).toBe('SHOW_NONDEALER');
    // Non-dealer (1) === localPlayerIndex (1) → should be "Your Hand"
    expect(result.current.showScoring?.label).toBe('Your Hand');
  });

  it('labels SHOW_NONDEALER as "Opponent\'s Hand" when localPlayerIndex is the dealer (seat 0)', async () => {
    // dealer=0, non-dealer=1. With localPlayerIndex=0, non-dealer show = "Opponent's Hand".
    const { result } = renderHook(() => useGame({ isOnline: true, localPlayerIndex: 0 }));

    const hand0 = [
      createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
      createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
    ];
    const hand1 = [
      createCard('A', 'S'), createCard('2', 'S'), createCard('3', 'S'),
      createCard('4', 'S'), createCard('5', 'S'), createCard('6', 'S'),
    ];

    act(() => {
      result.current.dispatchRemoteAction({
        type: 'LOAD_ONLINE_DEAL',
        hands: [hand0, hand1],
        starter: createCard('K', 'D'),
        dealerIndex: 0,
        handNumber: 1,
      });
    });

    act(() => {
      result.current.dispatchRemoteAction({ type: 'DISCARD', playerIndex: 0, cardIds: ['5-H', '6-H'] });
      result.current.dispatchRemoteAction({ type: 'DISCARD', playerIndex: 1, cardIds: ['5-S', '6-S'] });
    });

    await act(async () => { vi.advanceTimersByTime(1500); });

    act(() => {
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: 'A-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: 'A-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '2-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '2-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '3-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '3-H' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 1, cardId: '4-S' });
      result.current.dispatchRemoteAction({ type: 'PLAY_CARD', playerIndex: 0, cardId: '4-H' });
    });

    expect(result.current.gameState.phase).toBe('SHOW_NONDEALER');
    // Non-dealer (1) !== localPlayerIndex (0) → "Opponent's Hand"
    expect(result.current.showScoring?.label).toBe("Opponent's Hand");
  });
});

describe('useGame — dispatchRemoteAction', () => {
  it('is exposed as a function', () => {
    const { result } = renderHook(() => useGame());
    expect(typeof result.current.dispatchRemoteAction).toBe('function');
  });

  it('applies a LOAD_ONLINE_DEAL action to the game state', () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));

    const hand0: Card[] = [
      createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
      createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
    ];
    const hand1: Card[] = [
      createCard('7', 'S'), createCard('8', 'S'), createCard('9', 'S'),
      createCard('10', 'S'), createCard('J', 'S'), createCard('Q', 'S'),
    ];

    act(() => {
      result.current.dispatchRemoteAction({
        type: 'LOAD_ONLINE_DEAL',
        hands: [hand0, hand1],
        starter: createCard('K', 'D'),
        dealerIndex: 0,
        handNumber: 1,
      });
    });

    expect(result.current.gameState.phase).toBe('DISCARD_TO_CRIB');
    expect(result.current.gameState.players[0].hand).toEqual(hand0);
    expect(result.current.gameState.players[1].hand).toEqual(hand1);
  });
});

describe('useGame — online mode guard', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('does not auto-deal in DEALING phase when isOnline is true', async () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));

    act(() => {
      result.current.newGame();
    });

    expect(result.current.gameState.phase).toBe('DEALING');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Still waiting — online mode does not auto-deal
    expect(result.current.gameState.phase).toBe('DEALING');
  });
});
