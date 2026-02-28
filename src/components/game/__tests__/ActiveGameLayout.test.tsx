import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActiveGameLayout } from '../ActiveGameLayout';
import type { ActiveGameLayoutProps } from '../ActiveGameLayout';
import type { GameState, PeggingState } from '@/engine/types';
import { createCard } from '@/engine/types';

// ── Mock heavy/networked child components ────────────────────────────────────
//
// ActiveGameLayout is a layout orchestrator. We verify it mounts the right
// structural regions and delegates to the correct child slots; we do not
// re-test child logic here.

vi.mock('@/lib/gemini', () => ({
  callLLM: vi.fn().mockResolvedValue({ text: 'mock' }),
  parseLLMJson: vi.fn((_p: unknown, fb: unknown) => fb),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    // channel().on().subscribe() used by ChatPanel; unsubscribe() called on cleanup
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    // Chain covers: select → eq → order → limit → then (used by ChatPanel history fetch)
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      then: vi.fn(),
    }),
  },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({
    user: null,
    loading: false,
    error: null,
    signInAsGuest: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// ── Shared fixture builders ───────────────────────────────────────────────────

const emptyPegging: PeggingState = {
  count: 0,
  pile: [],
  sequence: [],
  currentPlayerIndex: 0,
  goState: [false, false],
  playerCards: [[], []],
  lastCardPlayerIndex: null,
};

function buildGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'DISCARD_TO_CRIB',
    deck: [],
    players: [
      { hand: [createCard('A', 'H'), createCard('2', 'D'), createCard('3', 'S'), createCard('4', 'C'), createCard('5', 'H'), createCard('6', 'D')], score: 0, pegFront: 0, pegBack: 0 },
      { hand: [], score: 0, pegFront: 0, pegBack: 0 },
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: emptyPegging,
    handStats: [{ pegging: 0, hand: 0, crib: 0 }, { pegging: 0, hand: 0, crib: 0 }],
    winner: null,
    decisionLog: [],
    handStatsHistory: [],
    ...overrides,
  };
}

const noop = () => {};

function buildProps(overrides: Partial<ActiveGameLayoutProps> = {}): ActiveGameLayoutProps {
  return {
    gameState: buildGameState(),
    selectedCardIds: new Set<string>(),
    showScoring: null,
    lastPeggingScore: null,
    humanPlayerIndex: 0,
    onDiscard: noop,
    onPlay: noop,
    onGo: noop,
    onAdvance: noop,
    onNextHand: noop,
    onNewGame: noop,
    onReturnToMenu: noop,
    toggleCardSelect: noop,
    onViewStats: noop,
    gameMode: 'local',
    opponentPresence: 'online',
    activeOnlineGameId: null,
    authUser: null,
    chatOpen: false,
    setChatOpen: vi.fn(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ActiveGameLayout — structural regions', () => {
  it('renders the outer game-screen container', () => {
    render(<ActiveGameLayout {...buildProps()} />);
    expect(screen.getByTestId('game-screen')).toBeInTheDocument();
  });

  it('renders the score panel header area', () => {
    render(<ActiveGameLayout {...buildProps()} />);
    // ScorePanel exposes aria-labels for scores
    expect(screen.getByLabelText(/Your score: 0/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent score: 0/i)).toBeInTheDocument();
  });

  it('renders the action bar', () => {
    render(<ActiveGameLayout {...buildProps()} />);
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('renders the cribbage board strip', () => {
    render(<ActiveGameLayout {...buildProps()} />);
    expect(screen.getByTestId('cribbage-board')).toBeInTheDocument();
  });

  it('reflects updated player scores in the score panel', () => {
    const gameState = buildGameState({
      players: [
        { hand: [], score: 55, pegFront: 55, pegBack: 0 },
        { hand: [], score: 72, pegFront: 72, pegBack: 0 },
      ],
    });
    render(<ActiveGameLayout {...buildProps({ gameState })} />);
    expect(screen.getByLabelText(/Your score: 55/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent score: 72/i)).toBeInTheDocument();
  });
});

describe('ActiveGameLayout — player hand area', () => {
  it('renders the player hand during DISCARD_TO_CRIB phase when cards are present', () => {
    render(<ActiveGameLayout {...buildProps()} />);
    // PlayerHand uses aria-label="Player hand" (no data-testid)
    expect(screen.getByLabelText(/Player hand/i)).toBeInTheDocument();
  });

  it('does not render the player hand during CUT_STARTER phase', () => {
    const gameState = buildGameState({
      phase: 'CUT_STARTER',
      players: [
        { hand: [], score: 0, pegFront: 0, pegBack: 0 },
        { hand: [], score: 0, pegFront: 0, pegBack: 0 },
      ],
    });
    render(<ActiveGameLayout {...buildProps({ gameState })} />);
    // Hand is only visible when HAND_VISIBLE_PHASES contains the phase AND cards exist
    expect(screen.queryByLabelText(/Player hand/i)).not.toBeInTheDocument();
  });

  it('shows the player hand during PEGGING phase when human has cards', () => {
    const hand = [createCard('7', 'H'), createCard('8', 'S')];
    const gameState = buildGameState({
      phase: 'PEGGING',
      pegging: {
        ...emptyPegging,
        currentPlayerIndex: 0,
        playerCards: [hand, []],
      },
    });
    render(<ActiveGameLayout {...buildProps({ gameState })} />);
    expect(screen.getByLabelText(/Player hand/i)).toBeInTheDocument();
  });
});

describe('ActiveGameLayout — action bar phase delegation', () => {
  it('action bar shows "Send to Crib" label area during DISCARD_TO_CRIB with 2 selected', () => {
    const selectedCardIds = new Set(['A-H', '2-D']);
    render(<ActiveGameLayout {...buildProps({ selectedCardIds })} />);
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toBe('Send to Crib');
  });

  it('action bar shows "Continue →" during a SHOW phase', () => {
    const gameState = buildGameState({ phase: 'SHOW_NONDEALER' });
    render(<ActiveGameLayout {...buildProps({ gameState })} />);
    expect(screen.getByTestId('action-btn').textContent).toContain('Continue');
  });

  it('action bar shows "Next Hand" during HAND_COMPLETE', () => {
    const gameState = buildGameState({ phase: 'HAND_COMPLETE' });
    render(<ActiveGameLayout {...buildProps({ gameState })} />);
    expect(screen.getByTestId('action-btn').textContent).toContain('Next Hand');
  });
});

describe('ActiveGameLayout — online mode elements', () => {
  it('does not render the chat toggle when activeOnlineGameId is null', () => {
    render(<ActiveGameLayout {...buildProps({ activeOnlineGameId: null })} />);
    expect(screen.queryByTestId('chat-toggle-btn')).not.toBeInTheDocument();
  });

  it('renders the chat toggle button when game is online and user is authenticated', () => {
    render(
      <ActiveGameLayout
        {...buildProps({
          activeOnlineGameId: 'game-abc',
          authUser: { id: 'user-1', displayName: 'Alice' },
          gameMode: 'online',
        })}
      />,
    );
    expect(screen.getByTestId('chat-toggle-btn')).toBeInTheDocument();
  });

  it('does not show the disconnect overlay when opponent is online', () => {
    const gameState = buildGameState({ phase: 'PEGGING' });
    render(
      <ActiveGameLayout
        {...buildProps({
          gameState,
          gameMode: 'online',
          opponentPresence: 'online',
        })}
      />,
    );
    expect(screen.queryByText(/Opponent Disconnected/i)).not.toBeInTheDocument();
  });

  it('shows the disconnect overlay when opponent is offline during an online game', () => {
    const gameState = buildGameState({ phase: 'PEGGING' });
    render(
      <ActiveGameLayout
        {...buildProps({
          gameState,
          gameMode: 'online',
          opponentPresence: 'offline',
        })}
      />,
    );
    expect(screen.getByText(/Opponent Disconnected/i)).toBeInTheDocument();
  });

  it('does not show disconnect overlay on GAME_OVER even if opponent is offline', () => {
    const gameState = buildGameState({
      phase: 'GAME_OVER',
      winner: 0,
    });
    render(
      <ActiveGameLayout
        {...buildProps({
          gameState,
          gameMode: 'online',
          opponentPresence: 'offline',
        })}
      />,
    );
    expect(screen.queryByText(/Opponent Disconnected/i)).not.toBeInTheDocument();
  });
});

describe('ActiveGameLayout — show scoring overlay', () => {
  const starter = createCard('5', 'H');
  const cards = [createCard('A', 'S'), createCard('2', 'C'), createCard('3', 'D'), createCard('9', 'H')];
  const scoring = { total: 4, fifteens: 2, pairs: 0, runs: 2, flush: 0, nobs: 0 };

  it('renders ShowScoring overlay during a SHOW phase when showScoring data is present', () => {
    const gameState = buildGameState({ phase: 'SHOW_NONDEALER', starter });
    render(
      <ActiveGameLayout
        {...buildProps({
          gameState,
          showScoring: { label: 'Non-dealer hand', cards, starter, scoring },
        })}
      />,
    );
    // ShowScoring should render a label — check for the heading text
    expect(screen.getByText(/Non-dealer hand/i)).toBeInTheDocument();
  });

  it('does not render ShowScoring overlay during a non-SHOW phase', () => {
    const gameState = buildGameState({ phase: 'PEGGING' });
    render(
      <ActiveGameLayout
        {...buildProps({
          gameState,
          showScoring: { label: 'Non-dealer hand', cards, starter, scoring },
        })}
      />,
    );
    // Label should not appear since phase is PEGGING, not a SHOW phase
    expect(screen.queryByText(/Non-dealer hand/i)).not.toBeInTheDocument();
  });
});
