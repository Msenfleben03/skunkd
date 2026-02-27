import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AveragesBests } from '../AveragesBests';

describe('AveragesBests', () => {
  it('renders avg and best values', () => {
    render(
      <AveragesBests
        avgPegging={3.5}
        bestPegging={12}
        avgHand={7.8}
        bestHand={24}
        avgCrib={4.2}
        bestCrib={16}
      />,
    );

    expect(screen.getByTestId('averages-bests')).toBeInTheDocument();

    expect(screen.getByTestId('avg-pegging')).toHaveTextContent('3.5');
    expect(screen.getByTestId('best-pegging')).toHaveTextContent('12');
    expect(screen.getByTestId('avg-hand')).toHaveTextContent('7.8');
    expect(screen.getByTestId('best-hand')).toHaveTextContent('24');
    expect(screen.getByTestId('avg-crib')).toHaveTextContent('4.2');
    expect(screen.getByTestId('best-crib')).toHaveTextContent('16');
  });
});
