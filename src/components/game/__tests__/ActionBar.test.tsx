/**
 * ActionBar.test.tsx
 *
 * Focused tests for ActionBar phase behavior not already covered by
 * ScorePanelActionBar.test.tsx. Specifically tests:
 *   - DISCARD_TO_CRIB phase button states and callback wiring
 *   - PEGGING phase: Play Card, Go, Opponent thinking permutations
 *   - Go button behavior and callback
 *   - SHOW phase Continue button
 *   - Accessibility: aria-label on discard button reflects selection count
 *
 * Tests here complement — and do not duplicate — ScorePanelActionBar.test.tsx.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionBar } from '../ActionBar';
import { createCard } from '@/engine/types';
import type { PeggingState } from '@/engine/types';

// ── Shared fixtures ───────────────────────────────────────────────────────────

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

/** Render helper: returns the rendered result with sane defaults. */
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

// ── Bug fix: DISCARD_TO_CRIB waiting state ────────────────────────────────────

describe('ActionBar — DISCARD_TO_CRIB waiting state', () => {
  it('shows disabled "Waiting for opponent…" when player has already discarded', () => {
    renderBar('DISCARD_TO_CRIB', { hasDiscarded: true });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toHaveTextContent('Waiting for opponent');
    expect(btn).toBeDisabled();
  });

  it('still shows normal discard UI when hasDiscarded is false', () => {
    renderBar('DISCARD_TO_CRIB', { hasDiscarded: false });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toHaveTextContent('Select cards');
  });
});

// ── Container presence ────────────────────────────────────────────────────────

describe('ActionBar — container', () => {
  it('renders the action-bar container in every phase', () => {
    const phases: Parameters<typeof ActionBar>[0]['phase'][] = [
      'GAME_START', 'DEALING', 'DISCARD_TO_CRIB', 'CUT_STARTER',
      'PEGGING', 'SHOW_NONDEALER', 'SHOW_DEALER', 'SHOW_CRIB',
      'HAND_COMPLETE', 'GAME_OVER',
    ];
    phases.forEach(phase => {
      const { unmount } = renderBar(phase);
      expect(screen.getByTestId('action-bar')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders exactly one action button at all times', () => {
    renderBar('DISCARD_TO_CRIB');
    expect(screen.getAllByTestId('action-btn')).toHaveLength(1);
  });
});

// ── DISCARD_TO_CRIB phase ─────────────────────────────────────────────────────

describe('ActionBar — DISCARD_TO_CRIB phase', () => {
  it('shows "Select cards (0/2)" and is disabled with no cards selected', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: [] });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('0/2');
  });

  it('shows "Select cards (1/2)" and is disabled with one card selected', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H'] });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('1/2');
  });

  it('shows "Send to Crib" and is enabled with two cards selected', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H', '2-S'] });
    const btn = screen.getByTestId('action-btn');
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toBe('Send to Crib');
  });

  it('calls onDiscard when "Send to Crib" is clicked', () => {
    const onDiscard = vi.fn();
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H', '2-S'], onDiscard });
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it('does not call onDiscard when button is clicked with fewer than 2 selected', () => {
    const onDiscard = vi.fn();
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H'], onDiscard });
    // Disabled button click should not fire onDiscard
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('aria-label on discard button reflects selection count', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H'] });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toHaveAttribute('aria-label', 'Send to crib (1 of 2 selected)');
  });

  it('aria-label reflects "2 of 2" when both cards are selected', () => {
    renderBar('DISCARD_TO_CRIB', { selectedCardIds: ['A-H', '2-S'] });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toHaveAttribute('aria-label', 'Send to crib (2 of 2 selected)');
  });
});

// ── PEGGING phase — human turn with playable card ─────────────────────────────

describe('ActionBar — PEGGING phase, human turn, card playable', () => {
  function pegStateWithCard(count: number, rank: Parameters<typeof createCard>[0] = '5') {
    return {
      ...emptyPegging,
      count,
      currentPlayerIndex: 0,
      playerCards: [[createCard(rank, 'H')], []],
    };
  }

  it('shows disabled "Tap a card to play" when no card is selected', () => {
    renderBar('PEGGING', {
      pegging: pegStateWithCard(10),
      selectedCardIds: [],
    });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Tap a card');
  });

  it('shows enabled "Play Card" when a card is selected and count allows it', () => {
    renderBar('PEGGING', {
      pegging: pegStateWithCard(10),
      selectedCardIds: ['5-H'],
    });
    const btn = screen.getByTestId('action-btn');
    expect(btn).not.toBeDisabled();
    expect(btn.textContent).toBe('Play Card');
  });

  it('calls onPlay when "Play Card" is clicked', () => {
    const onPlay = vi.fn();
    renderBar('PEGGING', {
      pegging: pegStateWithCard(10),
      selectedCardIds: ['5-H'],
      onPlay,
    });
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(onPlay).toHaveBeenCalledOnce();
  });
});

// ── PEGGING phase — Go button ─────────────────────────────────────────────────

describe('ActionBar — PEGGING phase, human cannot play any card ("Go")', () => {
  // Human has a 10, count is 25 → 25+10=35 > 31, cannot play
  const cannotPlayPegging: PeggingState = {
    ...emptyPegging,
    count: 25,
    currentPlayerIndex: 0,
    playerCards: [[createCard('10', 'H')], []],
  };

  it('shows the Go button when human cannot play any card', () => {
    renderBar('PEGGING', { pegging: cannotPlayPegging });
    expect(screen.getByTestId('action-btn').textContent).toContain('Go');
  });

  it('Go button is enabled (not disabled) when human cannot play', () => {
    renderBar('PEGGING', { pegging: cannotPlayPegging });
    expect(screen.getByTestId('action-btn')).not.toBeDisabled();
  });

  it('calls onGo when the Go button is clicked', () => {
    const onGo = vi.fn();
    renderBar('PEGGING', { pegging: cannotPlayPegging, onGo });
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(onGo).toHaveBeenCalledOnce();
  });

  it('does not show Go button when human CAN play a card', () => {
    // Human has a 2, count is 25 → 25+2=27 <= 31, can still play
    const canPlayPegging: PeggingState = {
      ...emptyPegging,
      count: 25,
      currentPlayerIndex: 0,
      playerCards: [[createCard('2', 'H')], []],
    };
    renderBar('PEGGING', { pegging: canPlayPegging });
    expect(screen.getByTestId('action-btn').textContent).not.toContain('Go');
  });

  it('boundary: card value exactly reaching 31 is NOT playable (Go shows)', () => {
    // Human has a 6, count is 25 → 25+6=31 exactly: should be playable
    const exactPegging: PeggingState = {
      ...emptyPegging,
      count: 25,
      currentPlayerIndex: 0,
      playerCards: [[createCard('6', 'H')], []],
    };
    // 25+6=31 <= 31, so can play — Go should NOT appear
    renderBar('PEGGING', { pegging: exactPegging });
    expect(screen.getByTestId('action-btn').textContent).not.toContain('Go');
  });

  it('shows Go when card would push count past 31', () => {
    // Human has a 7, count is 25 → 25+7=32 > 31: cannot play
    const overPegging: PeggingState = {
      ...emptyPegging,
      count: 25,
      currentPlayerIndex: 0,
      playerCards: [[createCard('7', 'H')], []],
    };
    renderBar('PEGGING', { pegging: overPegging });
    expect(screen.getByTestId('action-btn').textContent).toContain('Go');
  });
});

// ── PEGGING phase — opponent's turn ──────────────────────────────────────────

describe('ActionBar — PEGGING phase, opponent turn', () => {
  const opponentTurnPegging: PeggingState = {
    ...emptyPegging,
    currentPlayerIndex: 1, // opponent (index 1) is playing; human is index 0
  };

  it('shows disabled "Opponent thinking…" when it is not the human\'s turn', () => {
    renderBar('PEGGING', { pegging: opponentTurnPegging });
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Opponent thinking');
  });

  it('does not show "Play Card" or "Go" on opponent turn', () => {
    renderBar('PEGGING', { pegging: opponentTurnPegging, selectedCardIds: ['5-H'] });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).not.toContain('Play Card');
    expect(btn.textContent).not.toContain('Go');
  });
});

// ── SHOW phases ───────────────────────────────────────────────────────────────

describe('ActionBar — SHOW phases', () => {
  it.each(['SHOW_NONDEALER', 'SHOW_DEALER', 'SHOW_CRIB'] as const)(
    'shows enabled "Continue →" button in %s',
    (phase) => {
      renderBar(phase);
      const btn = screen.getByTestId('action-btn');
      expect(btn).not.toBeDisabled();
      expect(btn.textContent).toContain('Continue');
    },
  );

  it('calls onAdvance when Continue is clicked', () => {
    const onAdvance = vi.fn();
    renderBar('SHOW_NONDEALER', { onAdvance });
    fireEvent.click(screen.getByTestId('action-btn'));
    expect(onAdvance).toHaveBeenCalledOnce();
  });
});

// ── Static / lifecycle phases ─────────────────────────────────────────────────

describe('ActionBar — static phases', () => {
  it('shows "Deal Me In" in GAME_START and calls onNewGame on click', () => {
    const onNewGame = vi.fn();
    renderBar('GAME_START', { onNewGame });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Deal Me In');
    fireEvent.click(btn);
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it('shows disabled "Dealing…" in DEALING', () => {
    renderBar('DEALING');
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Dealing');
  });

  it('shows disabled "Cutting starter…" in CUT_STARTER', () => {
    renderBar('CUT_STARTER');
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Cutting starter');
  });

  it('shows "Next Hand" in HAND_COMPLETE and calls onNextHand on click', () => {
    const onNextHand = vi.fn();
    renderBar('HAND_COMPLETE', { onNextHand });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Next Hand');
    fireEvent.click(btn);
    expect(onNextHand).toHaveBeenCalledOnce();
  });

  it('shows "Play Again" in GAME_OVER and calls onNewGame on click', () => {
    const onNewGame = vi.fn();
    renderBar('GAME_OVER', { onNewGame });
    const btn = screen.getByTestId('action-btn');
    expect(btn.textContent).toContain('Play Again');
    fireEvent.click(btn);
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
