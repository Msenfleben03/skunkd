import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import { recordGameResult, fetchStats } from '../statsApi';

describe('recordGameResult', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('calls supabase.rpc with correct params for a win', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await recordGameResult({
      won: true,
      playerScore: 121,
      opponentScore: 75,
    });

    expect(mockRpc).toHaveBeenCalledWith('record_game_result', {
      p_won: true,
      p_player_score: 121,
      p_opponent_score: 75,
    });
  });

  it('calls supabase.rpc with correct params for a loss', async () => {
    mockRpc.mockResolvedValueOnce({ error: null });

    await recordGameResult({
      won: false,
      playerScore: 80,
      opponentScore: 121,
    });

    expect(mockRpc).toHaveBeenCalledWith('record_game_result', expect.objectContaining({
      p_won: false,
    }));
  });

  it('throws when rpc returns an error', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'DB error' } });

    await expect(
      recordGameResult({ won: true, playerScore: 121, opponentScore: 90 })
    ).rejects.toThrow('Failed to record game result: DB error');
  });
});

describe('fetchStats', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns stats data when query succeeds', async () => {
    const mockStats = {
      user_id: 'user-123',
      games_played: 10,
      wins: 6,
      losses: 4,
      skunks_given: 2,
      skunks_received: 1,
      double_skunks_given: 0,
      double_skunks_received: 0,
      highest_hand: 24,
      best_streak: 3,
      current_streak: 1,
      avg_cribbage_grade: 0,
      updated_at: '2026-02-26T00:00:00Z',
    };

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({ data: mockStats, error: null }),
    };
    mockFrom.mockReturnValueOnce(mockChain);

    const result = await fetchStats('user-123');
    expect(result).toEqual(mockStats);
    expect(mockFrom).toHaveBeenCalledWith('stats');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('returns null when query fails', async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
    };
    mockFrom.mockReturnValueOnce(mockChain);

    const result = await fetchStats('user-123');
    expect(result).toBeNull();
  });
});
