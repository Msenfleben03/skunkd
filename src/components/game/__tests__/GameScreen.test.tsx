import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScreen } from '../GameScreen';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null, pathname: '/', search: '', hash: '', key: 'default' }),
}));

// Mock Supabase-dependent auth context so tests run without env vars
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: null,
    loading: false,
    error: null,
    signInAsGuest: vi.fn().mockResolvedValue(undefined),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    signOut: vi.fn(),
    upgradeGuestAccount: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// Mock gemini so LLM components don't import supabase in tests
vi.mock('@/lib/gemini', () => ({
  callLLM: vi.fn().mockResolvedValue({ text: 'Mock LLM response' }),
  parseLLMJson: vi.fn((_, fallback) => fallback),
}));

// Mock statsApi so recordGameResult doesn't hit Supabase in tests
vi.mock('@/lib/statsApi', () => ({
  recordGameResult: vi.fn().mockResolvedValue(undefined),
}));

// Mock gameApi so createGame doesn't hit Supabase in tests
vi.mock('@/lib/gameApi', () => ({
  createGame: vi.fn().mockResolvedValue({
    game: { id: 'test-game-id', invite_code: 'ABC123', mode: 'vs_human', status: 'waiting', created_by: 'user-1', is_async: false, created_at: '' },
    players: [],
  }),
  joinGame: vi.fn().mockResolvedValue({ game: {}, players: [] }),
  dealHand: vi.fn().mockResolvedValue({ hand_id: 'h1', your_cards: [], starter_card: null }),
  updateGameStatus: vi.fn().mockResolvedValue(undefined),
}));

// Mock useGameChannel so GameScreen doesn't connect to Supabase Realtime
vi.mock('@/hooks/useGameChannel', () => ({
  useGameChannel: () => ({
    isConnected: false,
    opponentPresence: 'offline',
    broadcastAction: vi.fn(),
    onRemoteAction: vi.fn(),
  }),
}));

// Mock supabase client used directly in GameScreen for postgres_changes
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }),
  },
}));

describe('GameScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the start screen initially', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('deal-me-in-btn')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /SKUNK'D/i })).toBeInTheDocument();
  });

  it('shows "Deal Me In" button on start screen', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('deal-me-in-btn').textContent).toContain('Deal Me In');
  });

  it('transitions to game screen after clicking Deal Me In', async () => {
    render(<GameScreen />);
    await act(async () => { fireEvent.click(screen.getByTestId('deal-me-in-btn')); });
    expect(screen.getByTestId('score-panel')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('shows scores as 0-0 at game start', async () => {
    render(<GameScreen />);
    await act(async () => { fireEvent.click(screen.getByTestId('deal-me-in-btn')); });
    expect(screen.getByLabelText(/Your score: 0/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent score: 0/)).toBeInTheDocument();
  });

  it('always renders cribbage board during gameplay', async () => {
    render(<GameScreen />);
    await act(async () => { fireEvent.click(screen.getByTestId('deal-me-in-btn')); });
    expect(screen.getByTestId('cribbage-board')).toBeInTheDocument();
  });

  it('shows Play Online button on start screen', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('play-online-btn')).toBeInTheDocument();
  });

  it('navigates to online menu when Play Online is clicked', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('play-online-btn'));
    expect(screen.getByTestId('create-game-btn')).toBeInTheDocument();
  });

  it('does not call recordGameResult during normal gameplay', async () => {
    const { recordGameResult } = await import('@/lib/statsApi');
    render(<GameScreen />);
    await act(async () => { fireEvent.click(screen.getByTestId('deal-me-in-btn')); });
    // After clicking deal, we're in DEALING/DISCARD phase — not GAME_OVER
    expect(recordGameResult).not.toHaveBeenCalled();
  });

  it('shows My Stats button on start screen', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('stats-btn')).toBeInTheDocument();
  });

  it('navigates to /stats when My Stats button is clicked', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('stats-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/stats');
  });
});
