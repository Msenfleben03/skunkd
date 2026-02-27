import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../useGame';
import { createCard } from '@/engine/types';
import type { Card } from '@/engine/types';

const hand0: Card[] = [
  createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
  createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
];
const hand1: Card[] = [
  createCard('7', 'S'), createCard('8', 'S'), createCard('9', 'S'),
  createCard('10', 'S'), createCard('J', 'S'), createCard('Q', 'S'),
];
const starter = createCard('K', 'D');

describe('useGame online mode', () => {
  it('exposes dispatchRemoteAction when isOnline is true', () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));
    expect(result.current.dispatchRemoteAction).toBeDefined();
    expect(typeof result.current.dispatchRemoteAction).toBe('function');
  });

  it('does not auto-deal in DEALING phase when isOnline', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame({ isOnline: true }));

    // Start a new game — enters DEALING phase
    act(() => result.current.newGame());
    expect(result.current.gameState.phase).toBe('DEALING');

    // Advance past the 1200ms auto-deal timer
    await act(async () => { vi.advanceTimersByTime(2000); });
    // Phase should still be DEALING (not DISCARD_TO_CRIB)
    expect(result.current.gameState.phase).toBe('DEALING');

    vi.useRealTimers();
  });

  it('accepts LOAD_ONLINE_DEAL via dispatchRemoteAction', () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));

    act(() => {
      result.current.dispatchRemoteAction({
        type: 'LOAD_ONLINE_DEAL',
        hands: [hand0, hand1],
        starter,
        dealerIndex: 0,
        handNumber: 1,
      });
    });

    expect(result.current.gameState.phase).toBe('DISCARD_TO_CRIB');
    expect(result.current.gameState.players[0].hand).toEqual(hand0);
  });

  it('still auto-deals when isOnline is false (default)', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGame());

    act(() => result.current.newGame());
    expect(result.current.gameState.phase).toBe('DEALING');

    // Advance past the 1200ms auto-deal timer
    await act(async () => { vi.advanceTimersByTime(1500); });
    expect(result.current.gameState.phase).toBe('DISCARD_TO_CRIB');

    vi.useRealTimers();
  });
});
