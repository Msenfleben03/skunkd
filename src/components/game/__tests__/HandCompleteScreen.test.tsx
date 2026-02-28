import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HandCompleteScreen } from '../HandCompleteScreen';
import type { HandCompleteScreenProps } from '../HandCompleteScreen';
import type { HandStats } from '@/engine/types';

// Mock LLM dependency used by HandReview — prevents Supabase/gemini imports
vi.mock('@/lib/gemini', () => ({
  callLLM: vi.fn().mockResolvedValue({ text: 'Mock LLM response' }),
  parseLLMJson: vi.fn((_prompt: unknown, fallback: unknown) => fallback),
}));

// ── Shared test data ──────────────────────────────────────────────────────────

const playerStats: HandStats = { pegging: 4, hand: 8, crib: 0 };
const opponentStats: HandStats = { pegging: 2, hand: 6, crib: 5 };

function buildProps(overrides: Partial<HandCompleteScreenProps> = {}): HandCompleteScreenProps {
  return {
    handNumber: 1,
    humanPlayerIndex: 0,
    opponentPlayerIndex: 1,
    handStats: [playerStats, opponentStats],
    playerScore: 42,
    opponentScore: 37,
    onNextHand: vi.fn(),
    waitingForOpponent: false,
    ...overrides,
  };
}

// ── HandCompleteScreen tests ──────────────────────────────────────────────────

describe('HandCompleteScreen', () => {
  it('renders the hand summary section', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByTestId('hand-summary')).toBeInTheDocument();
  });

  it('displays the correct hand number', () => {
    render(<HandCompleteScreen {...buildProps({ handNumber: 3 })} />);
    // HandSummary renders the round number in a heading — aria-label contains it
    expect(screen.getByLabelText(/Hand 3 summary/i)).toBeInTheDocument();
  });

  it('shows the player total score', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Your total score: 42/i)).toBeInTheDocument();
  });

  it('shows the opponent total score', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Opponent total score: 37/i)).toBeInTheDocument();
  });

  it('renders the "Next Hand" button', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByTestId('next-hand-btn')).toBeInTheDocument();
  });

  it('"Next Hand" button reads "Next Hand" when not waiting for opponent', () => {
    render(<HandCompleteScreen {...buildProps({ waitingForOpponent: false })} />);
    expect(screen.getByTestId('next-hand-btn').textContent).toContain('Next Hand');
  });

  it('calls onNextHand when "Next Hand" button is clicked', () => {
    const onNextHand = vi.fn();
    render(<HandCompleteScreen {...buildProps({ onNextHand })} />);
    fireEvent.click(screen.getByTestId('next-hand-btn'));
    expect(onNextHand).toHaveBeenCalledOnce();
  });

  it('disables "Next Hand" button when waitingForOpponent is true', () => {
    render(<HandCompleteScreen {...buildProps({ waitingForOpponent: true })} />);
    expect(screen.getByTestId('next-hand-btn')).toBeDisabled();
  });

  it('shows "Waiting for opponent..." label when waitingForOpponent is true', () => {
    render(<HandCompleteScreen {...buildProps({ waitingForOpponent: true })} />);
    expect(screen.getByTestId('next-hand-btn').textContent).toContain('Waiting for opponent');
  });

  it('renders per-category scoring breakdown rows', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    // HandSummary renders StatRows with these category labels
    expect(screen.getByText('Pegging')).toBeInTheDocument();
    expect(screen.getAllByText(/Hand/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Crib')).toBeInTheDocument();
  });

  it('shows the player pegging score in the breakdown', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Your Pegging: 4/i)).toBeInTheDocument();
  });

  it('shows the player hand score in the breakdown', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Your Hand: 8/i)).toBeInTheDocument();
  });

  it('shows the opponent hand score in the breakdown', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Opponent Hand: 6/i)).toBeInTheDocument();
  });

  it('renders the "Review My Plays" LLM coaching button', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByTestId('review-hand-btn')).toBeInTheDocument();
  });

  it('"Review My Plays" button reads "Review My Plays" in its initial state', () => {
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByTestId('review-hand-btn').textContent).toContain('Review My Plays');
  });

  it('uses player stats at humanPlayerIndex and opponent stats at opponentPlayerIndex', () => {
    // Swap indices — humanPlayerIndex=1 means handStats[1] is the player
    const stats: readonly HandStats[] = [
      { pegging: 0, hand: 0, crib: 0 }, // index 0 — opponent when humanPlayerIndex=1
      { pegging: 9, hand: 12, crib: 3 }, // index 1 — the human player
    ];
    render(
      <HandCompleteScreen
        {...buildProps({
          humanPlayerIndex: 1,
          opponentPlayerIndex: 0,
          handStats: stats,
          playerScore: 24,
          opponentScore: 0,
        })}
      />,
    );
    // Player's pegging should be 9 (from index 1)
    expect(screen.getByLabelText(/Your Pegging: 9/i)).toBeInTheDocument();
  });

  it('renders the correct "This Hand" totals', () => {
    // playerHandTotal = pegging(4) + hand(8) + crib(0) = 12
    render(<HandCompleteScreen {...buildProps()} />);
    expect(screen.getByLabelText(/Your This Hand: 12/i)).toBeInTheDocument();
  });
});
