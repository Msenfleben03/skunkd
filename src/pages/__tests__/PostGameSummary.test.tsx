import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createCard } from '@/engine/types';
import type { HandStatsSnapshot, DecisionSnapshot } from '@/engine/types';

const mockNavigate = vi.fn();
const mockLocationState = vi.hoisted(() => ({
  value: null as unknown,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState.value, pathname: '/game-stats', search: '', hash: '', key: 'default' }),
  };
});

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
    ],
  }),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

import { PostGameSummary } from '../PostGameSummary';

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

const mockDecisionLog: DecisionSnapshot[] = [
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

describe('PostGameSummary', () => {
  it('renders score breakdown values', () => {
    mockLocationState.value = {
      playerIndex: 0,
      totalScore: 87,
      handStatsHistory: mockHistory,
      decisionLog: mockDecisionLog,
    };

    render(<PostGameSummary />);

    expect(screen.getByTestId('post-game-summary')).toBeInTheDocument();
    // Total pegging: 4 + 3 = 7
    expect(screen.getByTestId('pegging-points')).toHaveTextContent('7');
    // Total hand: 8 + 12 = 20
    expect(screen.getByTestId('hand-points')).toHaveTextContent('20');
    // Total crib: 6 + 0 = 6
    expect(screen.getByTestId('crib-points')).toHaveTextContent('6');
    // Total score from prop
    expect(screen.getByTestId('total-score')).toHaveTextContent('87');
  });

  it('renders navigation buttons', () => {
    mockLocationState.value = {
      playerIndex: 0,
      totalScore: 87,
      handStatsHistory: mockHistory,
      decisionLog: [],
    };

    render(<PostGameSummary />);

    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();
    expect(screen.getByTestId('main-menu-btn')).toBeInTheDocument();
  });
});
