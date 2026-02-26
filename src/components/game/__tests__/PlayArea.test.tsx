import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayArea } from '../PlayArea';
import { createCard } from '@/engine/types';
import type { PeggingState } from '@/engine/types';

const emptyPegging: PeggingState = {
  count: 0,
  pile: [],
  sequence: [],
  currentPlayerIndex: 0,
  goState: [false, false],
  playerCards: [[], []],
  lastCardPlayerIndex: null,
};

const peggingWith = (overrides: Partial<PeggingState>): PeggingState => ({
  ...emptyPegging,
  ...overrides,
});

const starter = createCard('K', 'H');

describe('PlayArea', () => {
  it('renders without crashing', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={null}
        pegging={emptyPegging}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
  });

  it('shows the count during pegging', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={peggingWith({ count: 15 })}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByLabelText(/Pegging count: 15/)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows "Your turn" when it is the human player turn', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={peggingWith({ currentPlayerIndex: 0 })}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText('Your turn')).toBeInTheDocument();
  });

  it('shows "Opponent thinking…" when it is not human turn', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={peggingWith({ currentPlayerIndex: 1 })}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText('Opponent thinking…')).toBeInTheDocument();
  });

  it('renders sequence cards during pegging', () => {
    const seq = [createCard('5', 'H'), createCard('10', 'S')];
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={peggingWith({ sequence: seq, count: 15 })}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByLabelText('Pegging sequence')).toBeInTheDocument();
    expect(screen.getByLabelText('5 of H')).toBeInTheDocument();
    expect(screen.getByLabelText('10 of S')).toBeInTheDocument();
  });

  it('shows pile count when sequence is empty but pile has cards', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={peggingWith({ pile: [createCard('3', 'D')], sequence: [], count: 0 })}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText(/1 card played/)).toBeInTheDocument();
  });

  it('renders starter card when provided', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={emptyPegging}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByLabelText('K of H')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
  });

  it('shows starter TBD placeholder during DISCARD_TO_CRIB', () => {
    render(
      <PlayArea
        phase="DISCARD_TO_CRIB"
        starter={null}
        pegging={emptyPegging}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText('Starter TBD')).toBeInTheDocument();
  });

  it('renders crib face-down during PEGGING', () => {
    const crib = [
      createCard('A', 'H'),
      createCard('2', 'S'),
      createCard('3', 'D'),
      createCard('4', 'C'),
    ];
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={emptyPegging}
        crib={crib}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText('Crib')).toBeInTheDocument();
    expect(screen.getByLabelText('Face-down card')).toBeInTheDocument();
  });

  it('renders crib face-up during SHOW_CRIB', () => {
    const crib = [
      createCard('A', 'H'),
      createCard('2', 'S'),
      createCard('3', 'D'),
      createCard('4', 'C'),
    ];
    render(
      <PlayArea
        phase="SHOW_CRIB"
        starter={starter}
        pegging={emptyPegging}
        crib={crib}
        humanPlayerIndex={0}
      />
    );
    expect(screen.getByText('Crib')).toBeInTheDocument();
    expect(screen.queryByLabelText('Face-down card')).toBeNull();
    expect(screen.getByLabelText('A of H')).toBeInTheDocument();
  });

  it('shows custom message when provided', () => {
    render(
      <PlayArea
        phase="PEGGING"
        starter={starter}
        pegging={emptyPegging}
        crib={[]}
        humanPlayerIndex={0}
        message="Fifteen for 2!"
      />
    );
    expect(screen.getByText('Fifteen for 2!')).toBeInTheDocument();
  });

  it('does not show count outside PEGGING phase', () => {
    render(
      <PlayArea
        phase="DISCARD_TO_CRIB"
        starter={null}
        pegging={emptyPegging}
        crib={[]}
        humanPlayerIndex={0}
      />
    );
    expect(screen.queryByLabelText(/Pegging count/)).toBeNull();
  });
});
