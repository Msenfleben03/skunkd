import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScorePanel } from '../ScorePanel';
import { ActionBar } from '../ActionBar';
import { createCard } from '@/engine/types';
import type { PeggingState } from '@/engine/types';

// ── ScorePanel tests ─────────────────────────────────────────────────────────

describe('ScorePanel', () => {
  it('renders both player scores', () => {
    render(<ScorePanel playerScore={42} opponentScore={38} dealerIndex={0} />);
    expect(screen.getByLabelText(/Your score: 42/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent score: 38/)).toBeInTheDocument();
  });

  it('shows D badge on human when they are dealer', () => {
    render(
      <ScorePanel playerScore={10} opponentScore={5} dealerIndex={0} humanPlayerIndex={0} />,
    );
    const dBadges = screen.getAllByText('D');
    expect(dBadges.length).toBe(1);
    // The D appears near "You:"
    expect(screen.getByLabelText(/Your score/).textContent).toContain('You:');
  });

  it('shows D badge on opponent when they are dealer', () => {
    render(
      <ScorePanel playerScore={10} opponentScore={5} dealerIndex={1} humanPlayerIndex={0} />,
    );
    expect(screen.getAllByText('D')).toHaveLength(1);
  });

  it('calls onToggleBoard when clicked', () => {
    const onToggle = vi.fn();
    render(
      <ScorePanel
        playerScore={0}
        opponentScore={0}
        dealerIndex={0}
        onToggleBoard={onToggle}
        showBoard={false}
      />,
    );
    fireEvent.click(screen.getByTestId('score-panel'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows ▲ Board when board is visible', () => {
    render(
      <ScorePanel
        playerScore={0}
        opponentScore={0}
        dealerIndex={0}
        onToggleBoard={() => {}}
        showBoard={true}
      />,
    );
    expect(screen.getByText(/▲/)).toBeInTheDocument();
  });

  it('shows ▼ Board when board is hidden', () => {
    render(
      <ScorePanel
        playerScore={0}
        opponentScore={0}
        dealerIndex={0}
        onToggleBoard={() => {}}
        showBoard={false}
      />,
    );
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });
});

// ── ActionBar tests ──────────────────────────────────────────────────────────

const emptyPegging: PeggingState = {
  count: 0,
  pile: [],
  sequence: [],
  currentPlayerIndex: 0,
  goState: [false, false],
  playerCards: [[], []],
  lastCardPlayerIndex: null,
};

const noop = () => {};

function renderBar(
  phase: Parameters<typeof ActionBar>[0]['phase'],
  overrides: Partial<Parameters<typeof ActionBar>[0]> = {},
) {
  return render(
    <ActionBar
      phase={phase}
      selectedCardIds={[]}
      pegging={emptyPegging}
      humanPlayerIndex={0}
      onDiscard={noop}
      onPlay={noop}
      onGo={noop}
      onAdvance={noop}
      onNextHand={noop}
      onNewGame={noop}
      {...overrides}
    />,
  );
}

describe('ActionBar', () => {
  it('renders the action bar container', () => {
    renderBar('GAME_START');
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('shows "Deal Me In" in GAME_START', () => {
    renderBar('GAME_START');
    expect(screen.getByTestId('action-btn').textContent).toContain('Deal Me In');
  });

  it('disables and shows "Dealing…" in DEALING', () => {
    renderBar('DEALING');
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Dealing');
  });

  it('disables discard button when fewer than 2 cards selected', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H'] });
    expect(screen.getByTestId('action-btn')).toBeDisabled();
  });

  it('enables "Send to Crib" when exactly 2 cards selected', () => {
    const onDiscard = vi.fn();
    renderBar('DISCARD_TO_CRIB', {
      selectedCardIds: ['A-H', '2-S'],
      onDiscard,
    });
    const btn = screen.getByTestId('action-btn');
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toBe('Send to Crib');
    fireEvent.click(btn);
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('shows "Opponent thinking…" when it is not human turn during PEGGING', () => {
    renderBar('PEGGING', {
      pegging: { ...emptyPegging, currentPlayerIndex: 1 },
    });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Opponent thinking');
  });

  it('shows "Say Go!" when human cannot play any card', () => {
    const onGo = vi.fn();
    // Human has a 10, count is 25 → 25+10=35 > 31, cannot play
    const pegState: PeggingState = {
      ...emptyPegging,
      count: 25,
      currentPlayerIndex: 0,
      playerCards: [[createCard('10', 'H')], []],
    };
    renderBar('PEGGING', { pegging: pegState, onGo });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Go');
    fireEvent.click(btn);
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('shows "Play Card" when human has a card selected and can play', () => {
    const onPlay = vi.fn();
    const pegState: PeggingState = {
      ...emptyPegging,
      count: 10,
      currentPlayerIndex: 0,
      playerCards: [[createCard('5', 'H')], []],
    };
    renderBar('PEGGING', {
      pegging: pegState,
      selectedCardIds: ['5-H'],
      onPlay,
    });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toBe('Play Card');
    fireEvent.click(btn);
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('shows "Tap a card to play" when human can play but none selected', () => {
    const pegState: PeggingState = {
      ...emptyPegging,
      count: 10,
      currentPlayerIndex: 0,
      playerCards: [[createCard('5', 'H')], []],
    };
    renderBar('PEGGING', { pegging: pegState, selectedCardIds: [] });
    expect(screen.getByTestId('action-btn')).toBeDisabled();
    expect(screen.getByTestId('action-btn').textContent).toContain('Tap a card');
  });

  it('shows "Continue →" during SHOW phases', () => {
    for (const phase of ['SHOW_NONDEALER', 'SHOW_DEALER', 'SHOW_CRIB'] as const) {
      const { unmount } = renderBar(phase);
      expect(screen.getByTestId('action-btn').textContent).toContain('Continue');
      unmount();
    }
  });

  it('shows "Next Hand" in HAND_COMPLETE', () => {
    const onNextHand = vi.fn();
    renderBar('HAND_COMPLETE', { onNextHand });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Next Hand');
    fireEvent.click(btn);
    expect(onNextHand).toHaveBeenCalledOnce();
  });

  it('shows "Play Again" in GAME_OVER', () => {
    const onNewGame = vi.fn();
    renderBar('GAME_OVER', { onNewGame });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Play Again');
    fireEvent.click(btn);
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
