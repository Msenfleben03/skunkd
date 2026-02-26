import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DealAnimation, buildDealSequence } from '../DealAnimation';
import { createCard } from '@/engine/types';

const card1 = createCard('A', 'H');
const card2 = createCard('K', 'S');

const dealCards = [
  { card: card1, targetX: -80, targetY: 120, delay: 0 },
  { card: card2, targetX: 80, targetY: -120, delay: 200, faceDown: true },
];

describe('DealAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the animation overlay', () => {
    render(<DealAnimation cards={dealCards} />);
    expect(screen.getByTestId('deal-animation')).toBeInTheDocument();
  });

  it('renders all card slots', () => {
    render(<DealAnimation cards={dealCards} />);
    const overlay = screen.getByTestId('deal-animation');
    expect(overlay.children).toHaveLength(2);
  });

  it('starts cards at opacity 0', () => {
    const { container } = render(<DealAnimation cards={dealCards} />);
    const overlay = container.querySelector('[data-testid="deal-animation"]')!;
    const slots = Array.from(overlay.children) as HTMLElement[];
    // Before any timers fire, all cards should be opacity 0
    slots.forEach(slot => {
      expect(slot.style.opacity).toBe('0');
    });
  });

  it('reveals cards after their delay fires', async () => {
    const { container } = render(<DealAnimation cards={dealCards} />);
    const overlay = container.querySelector('[data-testid="deal-animation"]')!;

    // Advance past first card's delay (0ms + a bit)
    act(() => { vi.advanceTimersByTime(50); });
    const slots = Array.from(overlay.children) as HTMLElement[];
    expect(slots[0].style.opacity).toBe('1');
    // Second card (delay 200ms) not yet revealed
    expect(slots[1].style.opacity).toBe('0');

    // Advance past second card's delay
    act(() => { vi.advanceTimersByTime(200); });
    expect(slots[1].style.opacity).toBe('1');
  });

  it('calls onComplete after all cards are dealt', () => {
    const onComplete = vi.fn();
    render(<DealAnimation cards={dealCards} onComplete={onComplete} />);
    // Last delay is 200ms + 350ms settle = 550ms total
    act(() => { vi.advanceTimersByTime(600); });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('calls onComplete immediately when cards array is empty', () => {
    const onComplete = vi.fn();
    render(<DealAnimation cards={[]} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('renders face-down cards for faceDown=true entries', () => {
    render(<DealAnimation cards={dealCards} />);
    // After all cards revealed
    act(() => { vi.advanceTimersByTime(300); });
    // card2 is faceDown — look for Face-down card label
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });
});

describe('buildDealSequence', () => {
  it('returns correct total count', () => {
    const p = [card1, createCard('2', 'D'), createCard('3', 'C')];
    const o = [createCard('4', 'H'), createCard('5', 'S'), createCard('6', 'D')];
    const seq = buildDealSequence(p, o);
    expect(seq).toHaveLength(6);
  });

  it('alternates player and opponent cards', () => {
    const p = [card1, createCard('2', 'D')];
    const o = [createCard('4', 'H'), createCard('5', 'S')];
    const seq = buildDealSequence(p, o);
    // Indices 0, 2 = player cards (faceDown false), 1, 3 = opponent (faceDown true)
    expect(seq[0].faceDown).toBeFalsy();
    expect(seq[1].faceDown).toBe(true);
    expect(seq[2].faceDown).toBeFalsy();
    expect(seq[3].faceDown).toBe(true);
  });

  it('assigns increasing delays', () => {
    const p = [card1, createCard('2', 'D')];
    const o = [createCard('4', 'H'), createCard('5', 'S')];
    const seq = buildDealSequence(p, o);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i].delay).toBeGreaterThanOrEqual(seq[i - 1].delay);
    }
  });
});
