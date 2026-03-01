import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { GameHistoryItem } from '@/lib/gameApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuth(),
}));

const mockFetchGameHistory = vi.fn();
vi.mock('@/lib/gameApi', () => ({
  fetchGameHistory: (...args: unknown[]) => mockFetchGameHistory(...args),
}));

import { HistoryPage } from '../HistoryPage';

const sampleGame: GameHistoryItem = {
  gameId: 'game-1',
  playedAt: '2026-02-28T12:00:00Z',
  myScore: 121,
  iWon: true,
  opponentId: 'opp-1',
  opponentName: 'Alice',
  opponentAvatar: null,
  opponentScore: 95,
  opponentIsAi: false,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  );
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', displayName: 'TestPlayer', isGuest: false },
      loading: false,
    });
  });

  it('shows loading state initially', () => {
    mockFetchGameHistory.mockReturnValueOnce(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('history-loading')).toBeInTheDocument();
  });

  it('shows empty state when no games', async () => {
    mockFetchGameHistory.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('history-empty')).toBeInTheDocument()
    );
  });

  it('renders a game card for each result', async () => {
    mockFetchGameHistory.mockResolvedValueOnce([sampleGame]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('game-card-game-1')).toBeInTheDocument()
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('121')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('shows Win badge for won games', async () => {
    mockFetchGameHistory.mockResolvedValueOnce([sampleGame]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('result-badge-game-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('result-badge-game-1')).toHaveTextContent('Win');
  });

  it('shows Loss badge for lost games', async () => {
    const lostGame: GameHistoryItem = {
      ...sampleGame,
      iWon: false,
      myScore: 85,
      opponentScore: 121,
    };
    mockFetchGameHistory.mockResolvedValueOnce([lostGame]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('result-badge-game-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('result-badge-game-1')).toHaveTextContent('Loss');
  });

  it('shows sign-in prompt when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderPage();
    expect(screen.getByTestId('history-unauthenticated')).toBeInTheDocument();
  });

  it('calls fetchGameHistory with user id', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-abc' },
      loading: false,
    });
    mockFetchGameHistory.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId('history-empty')).toBeInTheDocument()
    );
    expect(mockFetchGameHistory).toHaveBeenCalledWith('user-abc');
  });
});
