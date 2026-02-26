import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GameCard } from '../GameCard';
import { createCard } from '@/engine/types';

describe('GameCard', () => {
  it('renders face-down card when faceDown=true', () => {
    render(<GameCard faceDown />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });

  it('renders face-down card when no card provided', () => {
    render(<GameCard />);
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });

  it('renders face-up card with correct aria-label', () => {
    const card = createCard('A', 'S');
    render(<GameCard card={card} />);
    expect(screen.getByLabelText('A of S')).toBeInTheDocument();
  });

  it('shows the rank and suit symbol for a red card', () => {
    const card = createCard('5', 'H');
    render(<GameCard card={card} />);
    // Three rank labels (top, center symbol col, bottom)
    const el = screen.getByLabelText('5 of H');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('5');
    expect(el.textContent).toContain('♥');
  });

  it('shows correct symbol for each suit', () => {
    const suits = ['H', 'D', 'S', 'C'] as const;
    const symbols = { H: '♥', D: '♦', S: '♠', C: '♣' };
    for (const suit of suits) {
      const { unmount } = render(<GameCard card={createCard('A', suit)} />);
      expect(document.body.textContent).toContain(symbols[suit]);
      unmount();
    }
  });

  it('calls onClick when a face-up card is clicked', () => {
    const onClick = vi.fn();
    const card = createCard('K', 'D');
    render(<GameCard card={card} onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('K of D'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('calls onClick when a face-down card is clicked', () => {
    const onClick = vi.fn();
    render(<GameCard faceDown onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Face-down card'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies ring classes when selected', () => {
    const card = createCard('Q', 'C');
    const { container } = render(<GameCard card={card} selected />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('ring-2');
    expect(el.className).toContain('ring-gold');
  });

  it('applies opacity/grayscale classes when dimmed', () => {
    const card = createCard('3', 'S');
    const { container } = render(<GameCard card={card} dimmed />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('opacity-40');
    expect(el.className).toContain('grayscale');
  });

  it('applies pointer-events-none when dimmed', () => {
    const card = createCard('7', 'H');
    const { container } = render(<GameCard card={card} dimmed />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('pointer-events-none');
  });

  it('renders mini variant without crashing', () => {
    const card = createCard('J', 'D');
    render(<GameCard card={card} mini />);
    expect(screen.getByLabelText('J of D')).toBeInTheDocument();
  });
});
