import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScoreBreakdown } from '../ScoreBreakdown';

describe('ScoreBreakdown', () => {
  it('renders all 4 score values', () => {
    render(
      <ScoreBreakdown
        totalScore={87}
        totalPegging={23}
        totalHand={42}
        totalCrib={22}
      />,
    );

    expect(screen.getByTestId('score-breakdown')).toBeInTheDocument();
    expect(screen.getByTestId('total-score')).toHaveTextContent('87');
    expect(screen.getByTestId('pegging-points')).toHaveTextContent('23');
    expect(screen.getByTestId('hand-points')).toHaveTextContent('42');
    expect(screen.getByTestId('crib-points')).toHaveTextContent('22');
  });
});
