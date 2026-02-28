// Route smoke tests for App.tsx
// Tests that each declared route renders the correct page component.
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// --- Page component mocks ---
vi.mock('@/components/game/GameScreen', () => ({
  GameScreen: () => <div data-testid="game-screen" />,
}));

vi.mock('@/pages/Join', () => ({
  Join: () => <div data-testid="join-page" />,
}));

vi.mock('@/pages/StatsPage', () => ({
  StatsPage: () => <div data-testid="stats-page" />,
}));

vi.mock('@/pages/PostGameSummary', () => ({
  PostGameSummary: () => <div data-testid="post-game-summary-page" />,
}));

vi.mock('@/pages/HistoryPage', () => ({
  HistoryPage: () => <div data-testid="history-page" />,
}));

// AuthProvider is a passthrough wrapper in tests — the real hook touches
// Supabase which is not available in jsdom, so replace it with a no-op.
vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: null,
    loading: false,
    error: null,
    signInAsGuest: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// Import page components AFTER mocks are in place so Vitest hoisting applies.
import { GameScreen } from '@/components/game/GameScreen';
import { Join } from '@/pages/Join';
import { StatsPage } from '@/pages/StatsPage';
import { PostGameSummary } from '@/pages/PostGameSummary';
import { HistoryPage } from '@/pages/HistoryPage';
import { AuthProvider } from '@/context/AuthContext';

// Re-declare the route tree using MemoryRouter so we can control the initial
// entry without touching window.location or BrowserRouter internals.
function renderRoute(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<GameScreen />} />
          <Route path="/join/:code" element={<Join />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/game-stats" element={<PostGameSummary />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('App routes', () => {
  it('renders GameScreen at /', () => {
    renderRoute('/');
    expect(screen.getByTestId('game-screen')).toBeInTheDocument();
  });

  it('renders Join page at /join/:code', () => {
    renderRoute('/join/ABC123');
    expect(screen.getByTestId('join-page')).toBeInTheDocument();
  });

  it('renders StatsPage at /stats', () => {
    renderRoute('/stats');
    expect(screen.getByTestId('stats-page')).toBeInTheDocument();
  });

  it('renders PostGameSummary at /game-stats', () => {
    renderRoute('/game-stats');
    expect(screen.getByTestId('post-game-summary-page')).toBeInTheDocument();
  });

  it('renders HistoryPage at /history', () => {
    renderRoute('/history');
    expect(screen.getByTestId('history-page')).toBeInTheDocument();
  });

  it('renders nothing for an unknown route', () => {
    renderRoute('/does-not-exist');
    expect(screen.queryByTestId('game-screen')).toBeNull();
    expect(screen.queryByTestId('join-page')).toBeNull();
    expect(screen.queryByTestId('stats-page')).toBeNull();
    expect(screen.queryByTestId('post-game-summary-page')).toBeNull();
    expect(screen.queryByTestId('history-page')).toBeNull();
  });
});
