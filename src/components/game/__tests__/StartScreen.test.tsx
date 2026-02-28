import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StartScreen } from '../StartScreen';
import type { StartScreenProps } from '../StartScreen';

// Mock AuthModal — it imports Supabase; we do not need its internals here
vi.mock('@/components/auth/AuthModal', () => ({
  AuthModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="auth-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock ShareLink — used in the 'waiting' step
vi.mock('@/components/game/ShareLink', () => ({
  ShareLink: ({ inviteCode }: { inviteCode: string }) => (
    <div data-testid="share-link">{inviteCode}</div>
  ),
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

// ── Default props factory ─────────────────────────────────────────────────────

function buildProps(overrides: Partial<StartScreenProps> = {}): StartScreenProps {
  return {
    onlineStep: null,
    setOnlineStep: vi.fn(),
    pendingGame: null,
    setPendingGame: vi.fn(),
    joinCode: '',
    setJoinCode: vi.fn(),
    onlineError: null,
    showAuthModal: false,
    setShowAuthModal: vi.fn(),
    authUser: null,
    authLoading: false,
    onStartVsAI: vi.fn(),
    onCreateOnlineGame: vi.fn(),
    onJoinWithCode: vi.fn(),
    onNavigateStats: vi.fn(),
    onNavigateHistory: vi.fn(),
    ...overrides,
  };
}

// ── Main start screen tests ───────────────────────────────────────────────────

describe('StartScreen — main screen (onlineStep: null)', () => {
  it('renders the SKUNK\'D logo image with accessible alt text', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByRole('img', { name: /SKUNK'D/i })).toBeInTheDocument();
  });

  it('renders the primary vs-AI button', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByTestId('deal-me-in-btn')).toBeInTheDocument();
  });

  it('primary button label contains solo / quick game text', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByTestId('deal-me-in-btn').textContent).toContain("How 'Bout a Quick Game?");
  });

  it('renders the multiplayer button', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByTestId('play-online-btn')).toBeInTheDocument();
  });

  it('renders the My Stats navigation button', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByTestId('stats-btn')).toBeInTheDocument();
  });

  it('renders the History navigation button', () => {
    render(<StartScreen {...buildProps()} />);
    expect(screen.getByTestId('history-btn')).toBeInTheDocument();
  });

  it('calls onStartVsAI when the primary button is clicked', () => {
    const onStartVsAI = vi.fn();
    render(<StartScreen {...buildProps({ onStartVsAI })} />);
    fireEvent.click(screen.getByTestId('deal-me-in-btn'));
    expect(onStartVsAI).toHaveBeenCalledOnce();
  });

  it('calls setOnlineStep("menu") when multiplayer button is clicked', () => {
    const setOnlineStep = vi.fn();
    render(<StartScreen {...buildProps({ setOnlineStep })} />);
    fireEvent.click(screen.getByTestId('play-online-btn'));
    expect(setOnlineStep).toHaveBeenCalledWith('menu');
  });

  it('calls onNavigateStats when stats button is clicked', () => {
    const onNavigateStats = vi.fn();
    render(<StartScreen {...buildProps({ onNavigateStats })} />);
    fireEvent.click(screen.getByTestId('stats-btn'));
    expect(onNavigateStats).toHaveBeenCalledOnce();
  });

  it('calls onNavigateHistory when history button is clicked', () => {
    const onNavigateHistory = vi.fn();
    render(<StartScreen {...buildProps({ onNavigateHistory })} />);
    fireEvent.click(screen.getByTestId('history-btn'));
    expect(onNavigateHistory).toHaveBeenCalledOnce();
  });

  it('disables the primary button while auth is loading', () => {
    render(<StartScreen {...buildProps({ authLoading: true })} />);
    expect(screen.getByTestId('deal-me-in-btn')).toBeDisabled();
  });

  it('shows "Loading…" label inside button when auth is loading', () => {
    render(<StartScreen {...buildProps({ authLoading: true })} />);
    expect(screen.getByTestId('deal-me-in-btn').textContent).toContain('Loading');
  });

  it('shows Sign In button when authUser is null (not signed in)', () => {
    render(<StartScreen {...buildProps({ authUser: null })} />);
    expect(screen.getByTestId('sign-in-btn')).toBeInTheDocument();
  });

  it('shows Sign In button when authUser is a guest', () => {
    render(
      <StartScreen
        {...buildProps({ authUser: { displayName: 'Guest', isGuest: true } })}
      />,
    );
    expect(screen.getByTestId('sign-in-btn')).toBeInTheDocument();
  });

  it('shows signed-in display name and hides Sign In button when authenticated', () => {
    render(
      <StartScreen
        {...buildProps({ authUser: { displayName: 'Alice', isGuest: false } })}
      />,
    );
    expect(screen.queryByTestId('sign-in-btn')).not.toBeInTheDocument();
    expect(screen.getByText(/Signed in as Alice/)).toBeInTheDocument();
  });

  it('calls setShowAuthModal(true) when Sign In button is clicked', () => {
    const setShowAuthModal = vi.fn();
    render(<StartScreen {...buildProps({ setShowAuthModal })} />);
    fireEvent.click(screen.getByTestId('sign-in-btn'));
    expect(setShowAuthModal).toHaveBeenCalledWith(true);
  });

  it('does not render the auth modal when showAuthModal is false', () => {
    render(<StartScreen {...buildProps({ showAuthModal: false })} />);
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
  });

  it('renders the auth modal overlay when showAuthModal is true', () => {
    render(<StartScreen {...buildProps({ showAuthModal: true })} />);
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });
});

// ── Online menu step tests ────────────────────────────────────────────────────

describe('StartScreen — online menu step (onlineStep: "menu")', () => {
  it('renders the "Play Online" heading', () => {
    render(<StartScreen {...buildProps({ onlineStep: 'menu' })} />);
    expect(screen.getByText(/Play Online/i)).toBeInTheDocument();
  });

  it('shows the Create Game button', () => {
    render(<StartScreen {...buildProps({ onlineStep: 'menu' })} />);
    expect(screen.getByTestId('create-game-btn')).toBeInTheDocument();
  });

  it('calls onCreateOnlineGame when Create Game button is clicked', () => {
    const onCreateOnlineGame = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'menu', onCreateOnlineGame })}
      />,
    );
    fireEvent.click(screen.getByTestId('create-game-btn'));
    expect(onCreateOnlineGame).toHaveBeenCalledOnce();
  });

  it('shows "Join a Game" button that transitions to join-input step', () => {
    const setOnlineStep = vi.fn();
    render(<StartScreen {...buildProps({ onlineStep: 'menu', setOnlineStep })} />);
    fireEvent.click(screen.getByText(/Join a Game/i));
    expect(setOnlineStep).toHaveBeenCalledWith('join-input');
  });

  it('shows "Back" button that resets step to null', () => {
    const setOnlineStep = vi.fn();
    render(<StartScreen {...buildProps({ onlineStep: 'menu', setOnlineStep })} />);
    fireEvent.click(screen.getByText(/← Back/i));
    expect(setOnlineStep).toHaveBeenCalledWith(null);
  });

  it('displays an error message when onlineError is set', () => {
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'menu', onlineError: 'Connection failed' })}
      />,
    );
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
  });

  it('disables and shows "Creating…" when onlineStep is "creating"', () => {
    render(<StartScreen {...buildProps({ onlineStep: 'creating' })} />);
    const btn = screen.getByTestId('create-game-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Creating');
  });
});

// ── Waiting for opponent step tests ───────────────────────────────────────────

describe('StartScreen — waiting step (onlineStep: "waiting")', () => {
  const pendingGame = { gameId: 'game-1', inviteCode: 'XYZ789' };

  it('renders the "Waiting for Opponent" heading', () => {
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'waiting', pendingGame })}
      />,
    );
    expect(screen.getByText(/Waiting for Opponent/i)).toBeInTheDocument();
  });

  it('renders the ShareLink with the invite code', () => {
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'waiting', pendingGame })}
      />,
    );
    expect(screen.getByTestId('share-link').textContent).toBe('XYZ789');
  });

  it('calls setOnlineStep(null) and setPendingGame(null) when Cancel is clicked', () => {
    const setOnlineStep = vi.fn();
    const setPendingGame = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'waiting', pendingGame, setOnlineStep, setPendingGame })}
      />,
    );
    fireEvent.click(screen.getByText(/Cancel/i));
    expect(setOnlineStep).toHaveBeenCalledWith(null);
    expect(setPendingGame).toHaveBeenCalledWith(null);
  });
});

// ── Join by code step tests ───────────────────────────────────────────────────

describe('StartScreen — join-input step (onlineStep: "join-input")', () => {
  it('renders the "Enter Game Code" heading', () => {
    render(<StartScreen {...buildProps({ onlineStep: 'join-input' })} />);
    expect(screen.getByText(/Enter Game Code/i)).toBeInTheDocument();
  });

  it('renders the join code input field', () => {
    render(<StartScreen {...buildProps({ onlineStep: 'join-input' })} />);
    expect(screen.getByTestId('join-code-input')).toBeInTheDocument();
  });

  it('calls setJoinCode with uppercased value on input change', () => {
    const setJoinCode = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'join-input', setJoinCode })}
      />,
    );
    fireEvent.change(screen.getByTestId('join-code-input'), {
      target: { value: 'abc123' },
    });
    expect(setJoinCode).toHaveBeenCalledWith('ABC123');
  });

  it('disables Join Game button when joinCode is shorter than 4 chars', () => {
    render(
      <StartScreen {...buildProps({ onlineStep: 'join-input', joinCode: 'AB' })} />,
    );
    expect(screen.getByText(/Join Game/i)).toBeDisabled();
  });

  it('enables Join Game button when joinCode is 4+ chars', () => {
    render(
      <StartScreen {...buildProps({ onlineStep: 'join-input', joinCode: 'ABCD' })} />,
    );
    expect(screen.getByText(/Join Game/i)).not.toBeDisabled();
  });

  it('calls onJoinWithCode when Join Game is clicked with valid code', () => {
    const onJoinWithCode = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'join-input', joinCode: 'ABCD12', onJoinWithCode })}
      />,
    );
    fireEvent.click(screen.getByText(/Join Game/i));
    expect(onJoinWithCode).toHaveBeenCalledOnce();
  });

  it('calls onJoinWithCode when Enter key is pressed in the input', () => {
    const onJoinWithCode = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'join-input', joinCode: 'ABCD12', onJoinWithCode })}
      />,
    );
    fireEvent.keyDown(screen.getByTestId('join-code-input'), { key: 'Enter' });
    expect(onJoinWithCode).toHaveBeenCalledOnce();
  });

  it('navigates back to "menu" step when Back is clicked', () => {
    const setOnlineStep = vi.fn();
    render(
      <StartScreen
        {...buildProps({ onlineStep: 'join-input', setOnlineStep })}
      />,
    );
    fireEvent.click(screen.getByText(/← Back/i));
    expect(setOnlineStep).toHaveBeenCalledWith('menu');
  });
});
