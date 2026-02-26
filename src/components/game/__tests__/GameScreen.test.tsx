import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScreen } from '../GameScreen';

describe('GameScreen', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the start screen initially', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('deal-me-in-btn')).toBeInTheDocument();
    expect(screen.getByText("SKUNK'D")).toBeInTheDocument();
  });

  it('shows "Deal Me In" button on start screen', () => {
    render(<GameScreen />);
    expect(screen.getByTestId('deal-me-in-btn').textContent).toContain('Deal Me In');
  });

  it('transitions to game screen after clicking Deal Me In', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('deal-me-in-btn'));
    // After new game, we should see the game screen (score panel appears)
    expect(screen.getByTestId('score-panel')).toBeInTheDocument();
    expect(screen.getByTestId('action-bar')).toBeInTheDocument();
  });

  it('shows scores as 0-0 at game start', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('deal-me-in-btn'));
    expect(screen.getByLabelText(/Your score: 0/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Opponent score: 0/)).toBeInTheDocument();
  });

  it('shows and hides board on toggle', () => {
    render(<GameScreen />);
    fireEvent.click(screen.getByTestId('deal-me-in-btn'));
    // Board not shown initially
    expect(screen.queryByTestId('cribbage-board')).toBeNull();
    // Click score panel to toggle board
    fireEvent.click(screen.getByTestId('score-panel'));
    expect(screen.getByTestId('cribbage-board')).toBeInTheDocument();
    // Click again to hide
    fireEvent.click(screen.getByTestId('score-panel'));
    expect(screen.queryByTestId('cribbage-board')).toBeNull();
  });
});
