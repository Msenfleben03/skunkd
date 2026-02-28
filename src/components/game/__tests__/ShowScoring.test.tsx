import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ShowScoring } from '../ShowScoring';
import { createCard } from '@/engine/types';
import type { ScoreBreakdown } from '@/engine/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Standard 4-card hand: A-2-3-4 of mixed suits
const hand = [
  createCard('A', 'S'),
  createCard('2', 'H'),
  createCard('3', 'D'),
  createCard('4', 'C'),
];
const starter = createCard('5', 'H');

// A hand that scores fifteens, pairs, a run, and nobs
const richScore: ScoreBreakdown = {
  total: 15,
  fifteens: 4,
  pairs: 2,
  runs: 8,
  flush: 0,
  nobs: 1,
};

// A flush-only hand (4-card flush, no other scoring)
const flushOnlyScore: ScoreBreakdown = {
  total: 4,
  fifteens: 0,
  pairs: 0,
  runs: 0,
  flush: 4,
  nobs: 0,
};

// Zero-point hand
const zeroScore: ScoreBreakdown = {
  total: 0,
  fifteens: 0,
  pairs: 0,
  runs: 0,
  flush: 0,
  nobs: 0,
};

// The perfect 29 hand: 5-5-5-J with a 5 starter
const perfectHand = [
  createCard('5', 'H'),
  createCard('5', 'S'),
  createCard('5', 'D'),
  createCard('J', 'C'),
];
const perfectStarter = createCard('5', 'C');
const perfectScore: ScoreBreakdown = {
  total: 29,
  fifteens: 16,
  pairs: 12,
  runs: 0,
  flush: 0,
  nobs: 1,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShowScoring', () => {
  // 1. Renders label text ──────────────────────────────────────────────────────

  it('renders the provided label as a heading', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByText('Your Hand')).toBeInTheDocument();
  });

  it('renders "Opponent\'s Hand" as the label when passed', () => {
    render(
      <ShowScoring label="Opponent's Hand" cards={hand} starter={starter} scoring={richScore} />,
    );
    expect(screen.getByText("Opponent's Hand")).toBeInTheDocument();
  });

  it('renders "Crib" as the label when passed', () => {
    render(<ShowScoring label="Crib" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByText('Crib')).toBeInTheDocument();
  });

  it('has an accessible container aria-label combining label and "scoring"', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText('Your Hand scoring')).toBeInTheDocument();
  });

  it('has data-testid="show-scoring" on the root element', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByTestId('show-scoring')).toBeInTheDocument();
  });

  // 2. Shows cards and starter ─────────────────────────────────────────────────

  it('renders the cards-being-scored region', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText('Cards being scored')).toBeInTheDocument();
  });

  it('renders all 4 hand cards', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText('A of S')).toBeInTheDocument();
    expect(screen.getByLabelText('2 of H')).toBeInTheDocument();
    expect(screen.getByLabelText('3 of D')).toBeInTheDocument();
    expect(screen.getByLabelText('4 of C')).toBeInTheDocument();
  });

  it('renders the starter card', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText('5 of H')).toBeInTheDocument();
  });

  it('renders the "Cut" separator label next to the starter', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByText('Cut')).toBeInTheDocument();
  });

  it('renders all 4 fives plus the Jack for the perfect hand', () => {
    render(
      <ShowScoring
        label="Your Hand"
        cards={perfectHand}
        starter={perfectStarter}
        scoring={perfectScore}
      />,
    );
    // 3 fives in hand (5H, 5S, 5D) + 1 five as starter (5C) = 4 "5 of X" labels
    expect(screen.getAllByLabelText(/5 of/)).toHaveLength(4);
    expect(screen.getByLabelText('J of C')).toBeInTheDocument();
  });

  // 3. Displays score breakdown rows for non-zero scores ─────────────────────

  it('renders all non-zero score category rows for the rich score', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByText('Fifteens')).toBeInTheDocument();
    expect(screen.getByText('Pairs')).toBeInTheDocument();
    expect(screen.getByText('Runs')).toBeInTheDocument();
    expect(screen.getByText('Nobs')).toBeInTheDocument();
  });

  it('omits the Flush row when flush score is 0', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.queryByText('Flush')).toBeNull();
  });

  it('omits Runs row when runs score is 0', () => {
    render(
      <ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={flushOnlyScore} />,
    );
    expect(screen.queryByText('Runs')).toBeNull();
  });

  it('renders the Flush row when flush score is non-zero', () => {
    render(
      <ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={flushOnlyScore} />,
    );
    expect(screen.getByText('Flush')).toBeInTheDocument();
  });

  it('renders the score breakdown region', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText('Score breakdown')).toBeInTheDocument();
  });

  it('shows correct point values via aria-label on each row', () => {
    render(
      <ShowScoring
        label="Your Hand"
        cards={perfectHand}
        starter={perfectStarter}
        scoring={perfectScore}
      />,
    );
    expect(screen.getByLabelText('Fifteens: 16 points')).toBeInTheDocument();
    expect(screen.getByLabelText('Pairs: 12 points')).toBeInTheDocument();
    expect(screen.getByLabelText('Nobs: 1 points')).toBeInTheDocument();
  });

  it('shows point values for a flush-only hand', () => {
    render(
      <ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={flushOnlyScore} />,
    );
    expect(screen.getByLabelText('Flush: 4 points')).toBeInTheDocument();
  });

  // 4. Shows zero-hand quip when total is 0 ──────────────────────────────────

  it('shows a zero-hand quip instead of category rows for a 0-point hand', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={zeroScore} />);
    // None of the category row labels should appear
    expect(screen.queryByText('Fifteens')).toBeNull();
    expect(screen.queryByText('Pairs')).toBeNull();
    expect(screen.queryByText('Runs')).toBeNull();
    expect(screen.queryByText('Flush')).toBeNull();
    expect(screen.queryByText('Nobs')).toBeNull();
  });

  it('shows a non-empty quip string for the zero hand', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={zeroScore} />);
    // The quip is one of the known ZERO_HAND_QUIPS — check for partial shared text
    const quipEl = screen.getByLabelText('Score breakdown').querySelector('p');
    expect(quipEl).not.toBeNull();
    expect(quipEl!.textContent!.length).toBeGreaterThan(0);
  });

  it('quip text includes "zero" or "0" (case-insensitive)', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={zeroScore} />);
    const breakdown = screen.getByLabelText('Score breakdown');
    expect(breakdown.textContent!.toLowerCase()).toMatch(/zero|0/);
  });

  // 5. Shows total score ──────────────────────────────────────────────────────

  it('shows the total score via aria-label on the total row', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByLabelText(/Total: 15 points/)).toBeInTheDocument();
  });

  it('shows total of 29 for the perfect hand', () => {
    render(
      <ShowScoring
        label="Your Hand"
        cards={perfectHand}
        starter={perfectStarter}
        scoring={perfectScore}
      />,
    );
    expect(screen.getByLabelText(/Total: 29 points/)).toBeInTheDocument();
  });

  it('shows total of 0 on the zero-hand total row', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={zeroScore} />);
    expect(screen.getByLabelText(/Total: 0 points/)).toBeInTheDocument();
  });

  it('renders "Total" label text in the total row', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders the numeric total value visibly', () => {
    render(<ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={richScore} />);
    // The numeric span inside the total row shows the score
    const totalRow = screen.getByLabelText(/Total: 15 points/);
    expect(totalRow.textContent).toContain('15');
  });

  it('renders a 4-point total for a flush-only hand', () => {
    render(
      <ShowScoring label="Your Hand" cards={hand} starter={starter} scoring={flushOnlyScore} />,
    );
    expect(screen.getByLabelText(/Total: 4 points/)).toBeInTheDocument();
  });
});
