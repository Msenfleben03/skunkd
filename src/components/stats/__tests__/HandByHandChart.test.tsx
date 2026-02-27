import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { HandStatsSnapshot } from '@/engine/types';
import { createCard } from '@/engine/types';

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

import { HandByHandChart } from '../HandByHandChart';

const mockHistory: HandStatsSnapshot[] = [
  {
    handNumber: 1,
    dealerIndex: 0,
    stats: [
      { pegging: 4, hand: 8, crib: 6 },
      { pegging: 2, hand: 6, crib: 0 },
    ],
    starterCard: createCard('5', 'H'),
  },
  {
    handNumber: 2,
    dealerIndex: 1,
    stats: [
      { pegging: 3, hand: 12, crib: 0 },
      { pegging: 5, hand: 10, crib: 4 },
    ],
    starterCard: createCard('J', 'D'),
  },
];

describe('HandByHandChart', () => {
  it('renders toggle buttons (TOTAL, PEG, HAND, CRIB)', () => {
    render(<HandByHandChart history={mockHistory} playerIndex={0} />);

    expect(screen.getByTestId('toggle-total')).toHaveTextContent('TOTAL');
    expect(screen.getByTestId('toggle-peg')).toHaveTextContent('PEG');
    expect(screen.getByTestId('toggle-hand')).toHaveTextContent('HAND');
    expect(screen.getByTestId('toggle-crib')).toHaveTextContent('CRIB');
  });

  it('active button has correct style class after click', () => {
    render(<HandByHandChart history={mockHistory} playerIndex={0} />);

    // Initially TOTAL is active
    expect(screen.getByTestId('toggle-total').className).toContain('bg-gold');

    // Click PEG
    fireEvent.click(screen.getByTestId('toggle-peg'));
    expect(screen.getByTestId('toggle-peg').className).toContain('bg-gold');
    expect(screen.getByTestId('toggle-total').className).toContain('bg-white/10');
  });
});
