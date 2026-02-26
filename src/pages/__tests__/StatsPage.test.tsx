import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'user-123', displayName: 'TestPlayer', isGuest: false },
    loading: false,
  }),
}));

const mockFetchStats = vi.fn();
vi.mock('@/lib/statsApi', () => ({
  fetchStats: (...args: unknown[]) => mockFetchStats(...args),
}));

import { StatsPage } from '../StatsPage';

const mockStats = {
  user_id: 'user-123',
  games_played: 10,
  wins: 6,
  losses: 4,
  skunks_given: 2,
  skunks_received: 1,
  double_skunks_given: 1,
  double_skunks_received: 0,
  highest_hand: 24,
  best_streak: 4,
  current_streak: 2,
  avg_cribbage_grade: 0,
  updated_at: '2026-02-26T00:00:00Z',
};

function renderStats() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>
  );
}

describe('StatsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading state initially', () => {
    mockFetchStats.mockReturnValueOnce(new Promise(() => {}));
    renderStats();
    expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
  });

  it('renders all stat fields after loading', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());

    expect(screen.getByTestId('stats-games-played')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-wins')).toHaveTextContent('6');
    expect(screen.getByTestId('stats-losses')).toHaveTextContent('4');
    expect(screen.getByTestId('stats-win-rate')).toHaveTextContent('60%');
    expect(screen.getByTestId('stats-current-streak')).toHaveTextContent('2');
    expect(screen.getByTestId('stats-best-streak')).toHaveTextContent('4');
    expect(screen.getByTestId('stats-skunks-given')).toHaveTextContent('2');
    expect(screen.getByTestId('stats-skunks-received')).toHaveTextContent('1');
    expect(screen.getByTestId('stats-double-skunks-given')).toHaveTextContent('1');
    expect(screen.getByTestId('stats-double-skunks-received')).toHaveTextContent('0');
  });

  it('shows empty state when games_played is 0', async () => {
    mockFetchStats.mockResolvedValueOnce({ ...mockStats, games_played: 0, wins: 0, losses: 0 });
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    expect(screen.getByTestId('stats-empty')).toBeInTheDocument();
  });

  it('shows error state when fetch returns null', async () => {
    mockFetchStats.mockResolvedValueOnce(null);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    expect(screen.getByTestId('stats-error')).toBeInTheDocument();
  });

  it('shows guest nudge when user is a guest', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    // Guest nudge is NOT shown for non-guest user (isGuest: false in mock)
    expect(screen.queryByTestId('stats-guest-nudge')).toBeNull();
  });

  it('back button calls navigate("/")', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    screen.getByTestId('stats-back-btn').click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
