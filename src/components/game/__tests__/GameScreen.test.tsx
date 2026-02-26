import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScreen } from '../GameScreen';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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
  callLLM: vi.fn().mockResolvedValue({ text: 'Mock STINKY response' }),
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

  it('shows and hides board on toggle', async () => {
    render(<GameScreen />);
    await act(async () => { fireEvent.click(screen.getByTestId('deal-me-in-btn')); });
    // Board not shown initially
    expect(screen.queryByTestId('cribbage-board')).toBeNull();
    // Click score panel to toggle board
    fireEvent.click(screen.getByTestId('score-panel'));
    expect(screen.getByTestId('cribbage-board')).toBeInTheDocument();
    // Click again to hide
    fireEvent.click(screen.getByTestId('score-panel'));
    expect(screen.queryByTestId('cribbage-board')).toBeNull();
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
