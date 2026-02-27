import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { DecisionSnapshot } from '@/engine/types';
import { createCard } from '@/engine/types';

vi.mock('@/engine/optimal', () => ({
  optimalDiscard: vi.fn().mockReturnValue({
    discard: [createCard('K', 'H'), createCard('Q', 'D')],
    keep: [createCard('5', 'S'), createCard('5', 'H'), createCard('J', 'C'), createCard('10', 'D')],
    expectedValue: 8.5,
    reasoning: 'Test reasoning',
    allOptions: [
      {
        discard: [createCard('K', 'H'), createCard('Q', 'D')],
        keep: [createCard('5', 'S'), createCard('5', 'H'), createCard('J', 'C'), createCard('10', 'D')],
        expectedValue: 8.5,
      },
      {
        discard: [createCard('5', 'S'), createCard('Q', 'D')],
        keep: [createCard('K', 'H'), createCard('5', 'H'), createCard('J', 'C'), createCard('10', 'D')],
        expectedValue: 6.2,
      },
    ],
  }),
}));

import { DiscardStrategyReview } from '../DiscardStrategyReview';

const mockDecisions: DecisionSnapshot[] = [
  {
    type: 'discard',
    hand: [
      createCard('K', 'H'),
      createCard('Q', 'D'),
      createCard('5', 'S'),
      createCard('5', 'H'),
      createCard('J', 'C'),
      createCard('10', 'D'),
    ],
    playerChoice: [createCard('K', 'H'), createCard('Q', 'D')],
    isDealer: true,
    handIndex: 0,
  },
];

describe('DiscardStrategyReview', () => {
  it('renders "Strategic Rounds" label', () => {
    render(<DiscardStrategyReview decisions={mockDecisions} />);
    expect(screen.getByText('Strategic Rounds')).toBeInTheDocument();
  });

  it('renders per-hand "Hand 1" label', () => {
    render(<DiscardStrategyReview decisions={mockDecisions} />);
    expect(screen.getByText(/Hand 1/)).toBeInTheDocument();
  });
});
