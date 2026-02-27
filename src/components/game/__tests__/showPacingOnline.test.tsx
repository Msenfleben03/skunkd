import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandSummary } from '../HandSummary';

const baseStats = { pegging: 2, hand: 6, crib: 4 };

describe('HandSummary waiting state', () => {
  it('shows "Next Hand" when not waiting', () => {
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={vi.fn()}
      />
    );
    const btn = screen.getByTestId('next-hand-btn');
    expect(btn).toHaveTextContent('Next Hand');
    expect(btn).not.toBeDisabled();
  });

  it('shows "Waiting for opponent..." when waitingForOpponent is true', () => {
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={vi.fn()}
        waitingForOpponent
      />
    );
    const btn = screen.getByTestId('next-hand-btn');
    expect(btn).toHaveTextContent('Waiting for opponent...');
    expect(btn).toBeDisabled();
  });

  it('does not call onNextHand when disabled', () => {
    const onNextHand = vi.fn();
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={onNextHand}
        waitingForOpponent
      />
    );
    fireEvent.click(screen.getByTestId('next-hand-btn'));
    expect(onNextHand).not.toHaveBeenCalled();
  });
});
