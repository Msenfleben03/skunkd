// Smoke tests for Join.tsx — the /join/:code invite landing page.
// The component auto-joins on mount (after auth.loading resolves), so most
// tests need to keep auth.loading=true to freeze the component in idle state
// before the join side-effect fires.
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// --- Router mocks ---
const mockNavigate = vi.fn();
const mockParams = vi.hoisted(() => ({ value: { code: 'ABC123' } as { code?: string } }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams.value,
  };
});

// --- AuthContext mock ---
const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuth(),
}));

// --- gameApi mock ---
const mockJoinGame = vi.fn();
vi.mock('@/lib/gameApi', () => ({
  joinGame: (...args: unknown[]) => mockJoinGame(...args),
}));

// --- Supabase client mock ---
// Join.tsx imports joinGame (which internally calls supabase), but since
// joinGame itself is mocked the supabase module is never exercised.
// Still mock it to prevent the "Missing Supabase env vars" guard from
// throwing during module evaluation.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

import { Join } from '../Join';

// Shared auth fixture — loading=true prevents the auto-join useEffect from
// firing so we can assert on the idle UI without triggering joinGame.
const authLoading = {
  user: null,
  loading: true,
  error: null,
  signInAsGuest: vi.fn().mockResolvedValue(true),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

const authReady = {
  user: { id: 'user-42', displayName: 'TestPlayer', isGuest: false },
  loading: false,
  error: null,
  signInAsGuest: vi.fn().mockResolvedValue(true),
  signOut: vi.fn(),
  clearError: vi.fn(),
};

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={['/join/ABC123']}>
      <Join />
    </MemoryRouter>
  );
}

describe('Join page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.value = { code: 'ABC123' };
    mockUseAuth.mockReturnValue(authLoading);
  });

  // --- Static UI ---

  it('renders the invite code from URL params in the badge', () => {
    renderJoin();
    // The badge renders code.toUpperCase() — ABC123 is already upper.
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('renders the page heading', () => {
    renderJoin();
    expect(
      screen.getByRole('heading', { name: /you've been challenged/i })
    ).toBeInTheDocument();
  });

  it('renders the Accept Challenge button in idle state', () => {
    renderJoin();
    expect(screen.getByTestId('join-game-btn')).toBeInTheDocument();
    expect(screen.getByTestId('join-game-btn')).toHaveTextContent(/accept challenge/i);
  });

  it('shows the invite code in the status text', () => {
    renderJoin();
    expect(screen.getByText(/joining game abc123/i)).toBeInTheDocument();
  });

  // --- Join flow ---

  it('disables the join button while auth is loading', () => {
    renderJoin();
    expect(screen.getByTestId('join-game-btn')).toBeDisabled();
  });

  it('transitions to joining state when auth is ready', async () => {
    // Use a never-resolving promise to freeze the joining state so the
    // button stays in its "Joining..." disabled form for the assertion.
    mockJoinGame.mockReturnValue(new Promise(() => {}));
    // auth.loading=false triggers the auto-join useEffect immediately.
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    // The useEffect fires synchronously after mount; waitFor handles the
    // React state update that sets status to 'joining'.
    await waitFor(() =>
      expect(screen.getByTestId('join-game-btn')).toHaveTextContent(/joining/i)
    );
  });

  it('navigates to / with joinedGame state on successful join', async () => {
    const gameSummary = { game: { id: 'game-1', invite_code: 'ABC123' }, players: [] };
    mockJoinGame.mockResolvedValue(gameSummary);
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { state: { joinedGame: gameSummary } })
    );
  });

  it('calls joinGame with the invite code from URL params', async () => {
    mockJoinGame.mockResolvedValue({ game: { id: 'g1' }, players: [] });
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    await waitFor(() => expect(mockJoinGame).toHaveBeenCalledWith('ABC123'));
  });

  // --- Error state ---

  it('shows error heading and message when join fails', async () => {
    mockJoinGame.mockRejectedValue(new Error('Game not found or no longer available'));
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /oops/i })).toBeInTheDocument()
    );
    expect(screen.getByText(/game not found or no longer available/i)).toBeInTheDocument();
  });

  it('renders Try Again and Back to Home buttons in error state', async () => {
    mockJoinGame.mockRejectedValue(new Error('Failed'));
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
  });

  it('Back to Home navigates to /', async () => {
    mockJoinGame.mockRejectedValue(new Error('Failed'));
    mockUseAuth.mockReturnValue(authReady);

    renderJoin();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // --- Missing code edge case ---

  it('shows an error when no code is present in the URL', async () => {
    mockParams.value = { code: undefined };
    // auth.loading=false triggers the effect which detects missing code.
    mockUseAuth.mockReturnValue({ ...authReady });

    renderJoin();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /oops/i })).toBeInTheDocument()
    );
    expect(screen.getByText(/invalid invite link/i)).toBeInTheDocument();
  });
});
