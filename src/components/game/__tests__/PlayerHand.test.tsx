import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerHand } from '../PlayerHand';
import { createCard } from '@/engine/types';

const hand4 = [
  createCard('K', 'S'),
  createCard('3', 'H'),
  createCard('7', 'D'),
  createCard('J', 'C'),
];

describe('PlayerHand', () => {
  it('renders the correct number of cards', () => {
    render(<PlayerHand cards={hand4} />);
    const hand = screen.getByLabelText('Player hand');
    expect(hand.children).toHaveLength(4);
  });

  it('auto-sorts cards from low to high rank', () => {
    const { container } = render(<PlayerHand cards={hand4} />);
    const hand = container.querySelector('[aria-label="Player hand"]')!;
    const cardDivs = Array.from(hand.children);
    // Each child wraps a GameCard — check their aria-labels in order
    const labels = cardDivs
      .map(div => div.querySelector('[aria-label]')?.getAttribute('aria-label') ?? '')
      .filter(Boolean);
    // Expected sort: 3-H, 7-D, J-C, K-S
    expect(labels[0]).toBe('3 of H');
    expect(labels[1]).toBe('7 of D');
    expect(labels[2]).toBe('J of C');
    expect(labels[3]).toBe('K of S');
  });

  it('calls onCardClick with the correct card when clicked', () => {
    const onClick = vi.fn();
    render(<PlayerHand cards={[createCard('5', 'H')]} onCardClick={onClick} />);
    fireEvent.click(screen.getByLabelText('5 of H'));
    expect(onClick).toHaveBeenCalledWith(createCard('5', 'H'));
  });

  it('renders face-down cards when faceDown=true', () => {
    render(<PlayerHand cards={hand4} faceDown />);
    expect(screen.getAllByLabelText('Face-down card')).toHaveLength(4);
  });

  it('dims cards when maxSelectable is reached', () => {
    const selected = new Set(['3-H', '7-D']);
    const { container } = render(
      <PlayerHand
        cards={hand4}
        selectedIds={selected}
        maxSelectable={2}
        dimUnselectable
      />
    );
    // J and K should be dimmed (opacity-40, grayscale)
    const dimmed = container.querySelectorAll('.opacity-40');
    expect(dimmed.length).toBe(2);
  });

  it('does not dim when maxSelectable not reached', () => {
    const selected = new Set(['3-H']);
    const { container } = render(
      <PlayerHand
        cards={hand4}
        selectedIds={selected}
        maxSelectable={2}
        dimUnselectable
      />
    );
    const dimmed = container.querySelectorAll('.opacity-40');
    expect(dimmed.length).toBe(0);
  });

  it('renders nothing when cards array is empty', () => {
    const { container } = render(<PlayerHand cards={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows selected state on selected cards', () => {
    const card = createCard('A', 'H');
    const selected = new Set(['A-H']);
    const { container } = render(
      <PlayerHand cards={[card]} selectedIds={selected} maxSelectable={2} />
    );
    const cardEl = container.querySelector('[aria-label="A of H"]');
    expect(cardEl?.className).toContain('ring-2');
  });
});
