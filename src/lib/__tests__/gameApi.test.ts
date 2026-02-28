import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(),
  },
}));

import { fetchGameHistory } from '../gameApi';

const sampleRow = {
  game_id: 'game-1',
  played_at: '2026-02-28T12:00:00Z',
  my_score: 121,
  my_winner: true,
  opponent_id: 'opp-1',
  opponent_name: 'Alice',
  opponent_avatar: null,
  opponent_score: 95,
  opponent_is_ai: false,
};

describe('fetchGameHistory', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns mapped GameHistoryItem array on success', async () => {
    mockRpc.mockResolvedValueOnce({ data: [sampleRow], error: null });

    const result = await fetchGameHistory('user-123');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      gameId: 'game-1',
      playedAt: '2026-02-28T12:00:00Z',
      myScore: 121,
      iWon: true,
      opponentId: 'opp-1',
      opponentName: 'Alice',
      opponentAvatar: null,
      opponentScore: 95,
      opponentIsAi: false,
    });
    expect(mockRpc).toHaveBeenCalledWith('get_game_history', {
      p_user_id: 'user-123',
      p_limit: 50,
    });
  });

  it('returns empty array when no games', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const result = await fetchGameHistory('user-123');
    expect(result).toEqual([]);
  });

  it('returns empty array on RPC error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    const result = await fetchGameHistory('user-123');
    expect(result).toEqual([]);
  });
});
