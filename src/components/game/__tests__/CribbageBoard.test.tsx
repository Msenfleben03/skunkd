import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CribbageBoard } from '../CribbageBoard';

const noScore = { front: 0, back: 0 };
const midScore = { front: 42, back: 37 };

describe('CribbageBoard', () => {
  it('renders without crashing', () => {
    render(<CribbageBoard player={noScore} opponent={noScore} />);
    expect(screen.getByTestId('cribbage-board')).toBeInTheDocument();
  });

  it('renders an SVG element', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders 121 holes for each track (242 total player+opponent)', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    // The Track component renders one circle per hole for each track
    // We look for circles with fill="url(#holeFill)"
    const holeDots = container.querySelectorAll('circle[fill="url(#holeFill)"]');
    // 121 holes × 2 tracks = 242
    expect(holeDots.length).toBe(242);
  });

  it('shows the skunk lines', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    expect(texts).toContain('S');
    expect(texts).toContain('2S');
  });

  it('shows score number markers', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    expect(texts).toContain('15');
    expect(texts).toContain('30');
    expect(texts).toContain('45');
    expect(texts).toContain('75');
    expect(texts).toContain('90');
    expect(texts).toContain('105');
  });

  it('shows START, WIN labels', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    const texts = Array.from(container.querySelectorAll('text')).map(t => t.textContent);
    expect(texts).toContain('START');
    expect(texts).toContain('WIN');
  });

  it('renders player peg when front > 0', () => {
    const { container } = render(<CribbageBoard player={{ front: 10, back: 5 }} opponent={noScore} />);
    // Player peg uses goldPeg gradient — check for fill="url(#goldPeg)"
    const goldPegs = container.querySelectorAll('circle[fill="url(#goldPeg)"]');
    // front peg = 2 circles (halo + main), back peg = 1 circle
    expect(goldPegs.length).toBe(3);
  });

  it('renders opponent peg when front > 0', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={{ front: 60, back: 55 }} />);
    const greenPegs = container.querySelectorAll('circle[fill="url(#greenPeg)"]');
    expect(greenPegs.length).toBe(3);
  });

  it('renders no pegs when scores are 0', () => {
    const { container } = render(<CribbageBoard player={noScore} opponent={noScore} />);
    const goldPegs = container.querySelectorAll('circle[fill="url(#goldPeg)"]');
    const greenPegs = container.querySelectorAll('circle[fill="url(#greenPeg)"]');
    expect(goldPegs.length).toBe(0);
    expect(greenPegs.length).toBe(0);
  });

  it('handles score at hole 121 (finish)', () => {
    // Should not crash or render beyond the 121-hole array
    expect(() =>
      render(<CribbageBoard player={{ front: 121, back: 116 }} opponent={noScore} />)
    ).not.toThrow();
  });

  it('has an accessible aria-label with current scores', () => {
    render(<CribbageBoard player={midScore} opponent={{ front: 60, back: 55 }} />);
    expect(screen.getByLabelText(/You: 42, Opponent: 60/)).toBeInTheDocument();
  });

  it('includes peg animation CSS transition on front peg', () => {
    const { container } = render(
      <CribbageBoard player={{ front: 10, back: 0 }} opponent={noScore} />
    );
    // The front peg main circle has a transition style
    const goldPegs = Array.from(
      container.querySelectorAll('circle[fill="url(#goldPeg)"]'),
    ) as HTMLElement[];
    const hasTransition = goldPegs.some(el => el.style.transition?.includes('cubic-bezier'));
    expect(hasTransition).toBe(true);
  });
});
