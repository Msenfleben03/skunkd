import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameOver } from '../GameOver';

const noop = () => {};

describe('GameOver', () => {
  it('renders the game over screen', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={95} onPlayAgain={noop} />);
    expect(screen.getByTestId('game-over')).toBeInTheDocument();
  });

  it('shows "You Win!" when human player (index 0) wins', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={95} onPlayAgain={noop} />);
    expect(screen.getByLabelText('You win')).toBeInTheDocument();
    expect(screen.getByText('You Win!')).toBeInTheDocument();
  });

  it('shows "SKUNK\'D!" when opponent wins', () => {
    render(<GameOver winnerIndex={1} playerScore={80} opponentScore={121} onPlayAgain={noop} />);
    expect(screen.getByLabelText('You lost')).toBeInTheDocument();
    expect(screen.getByText("SKUNK'D!")).toBeInTheDocument();
  });

  it('shows final scores', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={95} onPlayAgain={noop} />);
    expect(screen.getByLabelText(/Final score: you 121, opponent 95/)).toBeInTheDocument();
  });

  it('shows no skunk banner when loser scored >= 91', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={95} onPlayAgain={noop} />);
    expect(screen.queryByTestId('skunk-banner')).toBeNull();
    expect(screen.queryByTestId('double-skunk-banner')).toBeNull();
  });

  it('shows single skunk banner when loser scored 61–90', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={75} onPlayAgain={noop} />);
    expect(screen.getByTestId('skunk-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('double-skunk-banner')).toBeNull();
  });

  it('shows double skunk banner when loser scored < 61', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={55} onPlayAgain={noop} />);
    expect(screen.getByTestId('double-skunk-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('skunk-banner')).toBeNull();
  });

  it('shows double skunk when player loses badly', () => {
    render(<GameOver winnerIndex={1} playerScore={40} opponentScore={121} onPlayAgain={noop} />);
    expect(screen.getByTestId('double-skunk-banner')).toBeInTheDocument();
  });

  it('calls onPlayAgain when "Play Again" clicked', () => {
    const onPlayAgain = vi.fn();
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={95} onPlayAgain={onPlayAgain} />);
    fireEvent.click(screen.getByTestId('play-again-btn'));
    expect(onPlayAgain).toHaveBeenCalledOnce();
  });

  it('boundary: loser at exactly 91 = no skunk', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={91} onPlayAgain={noop} />);
    expect(screen.queryByTestId('skunk-banner')).toBeNull();
    expect(screen.queryByTestId('double-skunk-banner')).toBeNull();
  });

  it('boundary: loser at exactly 61 = single skunk (not double)', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={61} onPlayAgain={noop} />);
    expect(screen.getByTestId('skunk-banner')).toBeInTheDocument();
  });

  it('boundary: loser at 60 = double skunk', () => {
    render(<GameOver winnerIndex={0} playerScore={121} opponentScore={60} onPlayAgain={noop} />);
    expect(screen.getByTestId('double-skunk-banner')).toBeInTheDocument();
  });
});
