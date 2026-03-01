import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: mockFrom,
  },
}));

import { fetchGameHistory, joinGame } from '../gameApi';

// ── Chain builder helpers ──────────────────────────────────────────────────────
// Each helper returns a mock chain object shaped for the terminal method used
// in that specific DB call. All non-terminal methods use mockReturnThis().

/** Chain that ends with .single() — used for `from('games').select().eq().in().single()` */
function makeSingleChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return chain;
}

/** Chain where .eq() is the terminal — used for the existing-players check */
function makeEqTerminalChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error }),
  };
}

/** Chain where .order() is the terminal — used for getGamePlayers */
function makeOrderChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
}

/** Chain where .insert() is the terminal */
function makeInsertChain(error: unknown = null) {
  return { insert: vi.fn().mockResolvedValue({ error }) };
}

/** Chain where .update().eq() is the terminal */
function makeUpdateChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  };
}

/** Fallback catch-all chain — prevents TypeError on unexpected from() calls */
function makeFallbackChain() {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: 'unexpected call' } }),
  };
}

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

// ── joinGame ───────────────────────────────────────────────────────────────────

const activeGame = { id: 'g1', status: 'active', invite_code: 'ABC123' };
const waitingGame = { id: 'g2', status: 'waiting', invite_code: 'DEF456' };

describe('joinGame — reconnect / idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fall back to catch-all so unexpected calls don't TypeError
    mockFrom.mockReturnValue(makeFallbackChain());
  });

  it('returns localSeat 0 when the caller is already seat 0 (creator reconnects)', async () => {
    const creatorRow = { user_id: 'u1', seat: 0 };
    mockFrom
      .mockReturnValueOnce(makeSingleChain(activeGame))           // games lookup
      .mockReturnValueOnce(makeEqTerminalChain([creatorRow]))     // existing players check
      .mockReturnValueOnce(makeOrderChain([creatorRow]));         // getGamePlayers

    const result = await joinGame('ABC123');

    expect(result.localSeat).toBe(0);
  });

  it('returns localSeat 1 when the caller is already seat 1 (joiner reconnects)', async () => {
    const seat0Row = { user_id: 'other-user', seat: 0 };
    const seat1Row = { user_id: 'u1', seat: 1 };
    mockFrom
      .mockReturnValueOnce(makeSingleChain(activeGame))
      .mockReturnValueOnce(makeEqTerminalChain([seat0Row, seat1Row]))
      .mockReturnValueOnce(makeOrderChain([seat0Row, seat1Row]));

    const result = await joinGame('ABC123');

    expect(result.localSeat).toBe(1);
  });

  it('throws "Game already in progress" when a non-player tries to join an active game', async () => {
    const otherRow = { user_id: 'stranger', seat: 0 };
    mockFrom
      .mockReturnValueOnce(makeSingleChain(activeGame))
      .mockReturnValueOnce(makeEqTerminalChain([otherRow])); // caller u1 not in list

    await expect(joinGame('ABC123')).rejects.toThrow('Game already in progress');
  });

  it('returns localSeat 1 when a new player successfully joins a waiting game', async () => {
    const newPlayerRow = { user_id: 'u1', seat: 1 };
    mockFrom
      .mockReturnValueOnce(makeSingleChain(waitingGame))        // games lookup
      .mockReturnValueOnce(makeEqTerminalChain([]))             // no existing players
      .mockReturnValueOnce(makeInsertChain())                   // insert as seat 1
      .mockReturnValueOnce(makeUpdateChain())                   // update game to active
      .mockReturnValueOnce(makeOrderChain([newPlayerRow]));     // getGamePlayers

    const result = await joinGame('DEF456');

    expect(result.localSeat).toBe(1);
  });
});
