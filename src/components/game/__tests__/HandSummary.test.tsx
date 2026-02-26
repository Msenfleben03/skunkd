import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HandSummary } from '../HandSummary';
import type { HandStats } from '@/engine/types';

const playerStats: HandStats = { pegging: 6, hand: 12, crib: 0 };
const opponentStats: HandStats = { pegging: 4, hand: 8, crib: 4 };

const defaultProps = {
  handNumber: 3,
  playerStats,
  opponentStats,
  playerTotalScore: 42,
  opponentTotalScore: 38,
  onNextHand: vi.fn(),
};

describe('HandSummary', () => {
  it('renders the hand number', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Round')).toBeInTheDocument();
  });

  it('shows the total scores prominently', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByLabelText('Your total score: 42')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent total score: 38')).toBeInTheDocument();
  });

  it('shows pegging stats', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByLabelText('Your Pegging: 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent Pegging: 4')).toBeInTheDocument();
  });

  it('shows hand stats', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByLabelText('Your Hand: 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent Hand: 8')).toBeInTheDocument();
  });

  it('shows crib stats', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByLabelText('Your Crib: 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent Crib: 4')).toBeInTheDocument();
  });

  it('shows "This Hand" totals (pegging + hand + crib)', () => {
    render(<HandSummary {...defaultProps} />);
    // player: 6+12+0=18, opponent: 4+8+4=16
    expect(screen.getByLabelText('Your This Hand: 18')).toBeInTheDocument();
    expect(screen.getByLabelText('Opponent This Hand: 16')).toBeInTheDocument();
  });

  it('calls onNextHand when "Next Hand" is clicked', () => {
    const onNextHand = vi.fn();
    render(<HandSummary {...defaultProps} onNextHand={onNextHand} />);
    fireEvent.click(screen.getByTestId('next-hand-btn'));
    expect(onNextHand).toHaveBeenCalledOnce();
  });

  it('does not render New Game button when onNewGame not provided', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.queryByTestId('new-game-btn')).toBeNull();
  });

  it('renders New Game button when onNewGame is provided', () => {
    const onNewGame = vi.fn();
    render(<HandSummary {...defaultProps} onNewGame={onNewGame} />);
    expect(screen.getByTestId('new-game-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('new-game-btn'));
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it('has accessible container label', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByLabelText('Hand 3 summary')).toBeInTheDocument();
  });

  it('renders column headers You / Opp', () => {
    render(<HandSummary {...defaultProps} />);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Opp')).toBeInTheDocument();
  });

  it('renders proportion bars', () => {
    const { container } = render(<HandSummary {...defaultProps} />);
    // ProportionBar renders a div with h-1.5 and overflow-hidden
    const bars = container.querySelectorAll('.h-1\\.5.rounded-full');
    // 4 stat rows = 4 proportion bars
    expect(bars.length).toBeGreaterThanOrEqual(4);
  });

  it('handles all-zero stats without crashing', () => {
    const zeros: HandStats = { pegging: 0, hand: 0, crib: 0 };
    expect(() =>
      render(
        <HandSummary
          handNumber={1}
          playerStats={zeros}
          opponentStats={zeros}
          playerTotalScore={0}
          opponentTotalScore={0}
          onNextHand={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
