import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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
  // Hand performance fields (migration 008)
  total_pegging_points: 45,
  total_hand_points: 80,
  total_crib_points: 30,
  total_hands_played: 10,
  best_pegging: 12,
  best_hand_score: 24,
  best_crib_score: 17,
  optimal_discards: 7,
  total_discards: 10,
  total_ev_deficit: 3.5,
};

function renderStats() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>
  );
}

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', displayName: 'TestPlayer', isGuest: false },
      loading: false,
    });
  });

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

  it('hides guest nudge for authenticated user', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    expect(screen.queryByTestId('stats-guest-nudge')).toBeNull();
  });

  it('shows guest nudge when user is a guest', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', displayName: 'GuestPlayer', isGuest: true },
      loading: false,
    });
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    expect(screen.getByTestId('stats-guest-nudge')).toBeInTheDocument();
  });

  it('back button calls navigate("/")', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());
    screen.getByTestId('stats-back-btn').click();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('renders scoring averages when total_hands_played > 0', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());

    // Avg Pegging: 45 / 10 = 4.5
    expect(screen.getByTestId('stats-avg-pegging')).toHaveTextContent('4.5');
    expect(screen.getByTestId('stats-best-pegging')).toHaveTextContent('12');
    // Avg Hand: 80 / 10 = 8.0
    expect(screen.getByTestId('stats-avg-hand')).toHaveTextContent('8.0');
    expect(screen.getByTestId('stats-best-hand')).toHaveTextContent('24');
    // Avg Crib: 30 / ceil(10/2) = 30 / 5 = 6.0
    expect(screen.getByTestId('stats-avg-crib')).toHaveTextContent('6.0');
    expect(screen.getByTestId('stats-best-crib')).toHaveTextContent('17');
  });

  it('renders discard accuracy when total_discards > 0', async () => {
    mockFetchStats.mockResolvedValueOnce(mockStats);
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());

    // Strategic Rounds: round(7/10 * 100) = 70%
    expect(screen.getByTestId('stats-strategic-pct')).toHaveTextContent('70%');
    // Avg EV Deficit: 3.5 / 10 = 0.35 → toFixed(1) = '0.3' (banker's rounding)
    expect(screen.getByTestId('stats-ev-deficit')).toHaveTextContent('0.3');
  });

  it('hides scoring averages when total_hands_played is 0', async () => {
    mockFetchStats.mockResolvedValueOnce({
      ...mockStats,
      total_hands_played: 0,
      total_pegging_points: 0,
      total_hand_points: 0,
      total_crib_points: 0,
    });
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());

    expect(screen.queryByTestId('stats-avg-pegging')).toBeNull();
    expect(screen.queryByTestId('stats-avg-hand')).toBeNull();
    expect(screen.queryByTestId('stats-avg-crib')).toBeNull();
  });

  it('hides discard accuracy when total_discards is 0', async () => {
    mockFetchStats.mockResolvedValueOnce({
      ...mockStats,
      total_discards: 0,
      optimal_discards: 0,
      total_ev_deficit: 0,
    });
    renderStats();
    await waitFor(() => expect(screen.queryByTestId('stats-loading')).toBeNull());

    expect(screen.queryByTestId('stats-strategic-pct')).toBeNull();
    expect(screen.queryByTestId('stats-ev-deficit')).toBeNull();
  });
});
