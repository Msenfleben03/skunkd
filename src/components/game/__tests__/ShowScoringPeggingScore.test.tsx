import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShowScoring } from '../ShowScoring';
import { PeggingScore } from '../PeggingScore';
import { createCard } from '@/engine/types';
import type { ScoreBreakdown } from '@/engine/types';
import type { PeggingPlayScore } from '@/engine/pegging';

// ── ShowScoring tests ─────────────────────────────────────────────────────────

const hand = [
  createCard('5', 'H'),
  createCard('5', 'S'),
  createCard('5', 'D'),
  createCard('J', 'C'),
];
const starter = createCard('5', 'C');

const perfectScore: ScoreBreakdown = {
  total: 29,
  fifteens: 16,
  pairs: 12,
  runs: 0,
  flush: 0,
  nobs: 1,
};

const zeroScore: ScoreBreakdown = {
  total: 0,
  fifteens: 0,
  pairs: 0,
  runs: 0,
  flush: 0,
  nobs: 0,
};

describe('ShowScoring', () => {
  it('renders the label', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByText('Your Hand')).toBeInTheDocument();
  });

  it('renders all 4 hand cards + starter', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    // 5H, 5S, 5D, JC face-up + 5C starter
    expect(screen.getAllByLabelText(/5 of/).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByLabelText('J of C')).toBeInTheDocument();
  });

  it('renders non-zero score rows', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByText('Fifteens')).toBeInTheDocument();
    expect(screen.getByText('Pairs')).toBeInTheDocument();
    expect(screen.getByText('Nobs')).toBeInTheDocument();
    // Runs and Flush are zero so should not appear
    expect(screen.queryByText('Runs')).toBeNull();
    expect(screen.queryByText('Flush')).toBeNull();
  });

  it('shows correct point values for each row', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByLabelText('Fifteens: 16 points')).toBeInTheDocument();
    expect(screen.getByLabelText('Pairs: 12 points')).toBeInTheDocument();
    expect(screen.getByLabelText('Nobs: 1 points')).toBeInTheDocument();
  });

  it('shows total of 29', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByLabelText(/Total: 29/)).toBeInTheDocument();
  });

  it('shows zero-hand quip instead of rows for 0-point hand', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={zeroScore} />);
    // No category rows
    expect(screen.queryByText('Fifteens')).toBeNull();
    // Total still shows
    expect(screen.getByLabelText(/Total: 0/)).toBeInTheDocument();
  });

  it('has accessible container label', () => {
    render(<ShowScoring label="Crib" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByLabelText('Crib scoring')).toBeInTheDocument();
  });

  it('renders the Cut label for the starter', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={perfectScore} />);
    expect(screen.getByText('Cut')).toBeInTheDocument();
  });
});

// ── PeggingScore tests ────────────────────────────────────────────────────────

const scoreFifteen: PeggingPlayScore = {
  pairs: 0,
  runs: 0,
  fifteen: 2,
  thirtyone: 0,
  total: 2,
};

const scoreThirtyone: PeggingPlayScore = {
  pairs: 0,
  runs: 0,
  fifteen: 0,
  thirtyone: 2,
  total: 2,
};

const zeroPeggingScore: PeggingPlayScore = {
  pairs: 0,
  runs: 0,
  fifteen: 0,
  thirtyone: 0,
  total: 0,
};

describe('PeggingScore', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing when score is null', () => {
    const { container } = render(<PeggingScore score={null} />);
    // Nothing visible (either null or hidden)
    expect(container.textContent).toBe('');
  });

  it('renders nothing when score total is zero', () => {
    render(<PeggingScore score={zeroPeggingScore} />);
    const el = screen.queryByTestId('pegging-score');
    // Either not rendered or opacity-0
    if (el) {
      expect(el.className).toContain('opacity-0');
    }
  });

  it('shows the score toast when total > 0', () => {
    render(<PeggingScore score={scoreFifteen} />);
    expect(screen.getByTestId('pegging-score')).toBeInTheDocument();
    expect(screen.getByLabelText('2 points')).toBeInTheDocument();
    expect(screen.getByText(/Fifteen for 2/)).toBeInTheDocument();
  });

  it('shows +2 for fifteen', () => {
    render(<PeggingScore score={scoreFifteen} />);
    const badge = screen.getByLabelText('2 points');
    expect(badge.textContent).toBe('+2');
  });

  it('shows Thirty-one label and green styling for 31', () => {
    render(<PeggingScore score={scoreThirtyone} />);
    expect(screen.getByText(/Thirty-one/)).toBeInTheDocument();
  });

  it('auto-dismisses after 2.2 seconds', () => {
    render(<PeggingScore score={scoreFifteen} />);
    // Initially visible
    expect(screen.getByTestId('pegging-score').className).toContain('opacity-100');
    // After 2.2s
    act(() => { vi.advanceTimersByTime(2300); });
    expect(screen.getByTestId('pegging-score').className).toContain('opacity-0');
  });

  it('shows run label', () => {
    const scoreRun: PeggingPlayScore = { pairs: 0, runs: 4, fifteen: 0, thirtyone: 0, total: 4 };
    render(<PeggingScore score={scoreRun} />);
    expect(screen.getByText(/Run of 4/)).toBeInTheDocument();
  });

  it('shows pair royal label', () => {
    const scorePairRoyal: PeggingPlayScore = { pairs: 6, runs: 0, fifteen: 0, thirtyone: 0, total: 6 };
    render(<PeggingScore score={scorePairRoyal} />);
    expect(screen.getByText(/Pair royal/)).toBeInTheDocument();
  });

  it('shows extra label for Go points', () => {
    render(<PeggingScore score={zeroPeggingScore} goOrLastCard={1} extraLabel="Go!" />);
    expect(screen.getByTestId('pegging-score')).toBeInTheDocument();
    expect(screen.getByText('Go!')).toBeInTheDocument();
  });
});
