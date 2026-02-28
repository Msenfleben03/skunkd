import type { HandStats } from '@/engine/types';
import { HandSummary } from './HandSummary';
import { HandReview } from './HandReview';

export interface HandCompleteScreenProps {
  handNumber: number;
  humanPlayerIndex: number;
  opponentPlayerIndex: number;
  handStats: readonly HandStats[];
  playerScore: number;
  opponentScore: number;
  onNextHand: () => void;
  waitingForOpponent: boolean;
}

export function HandCompleteScreen({
  handNumber,
  humanPlayerIndex,
  opponentPlayerIndex,
  handStats,
  playerScore,
  opponentScore,
  onNextHand,
  waitingForOpponent,
}: HandCompleteScreenProps) {
  return (
    <div
      className="h-screen flex flex-col items-center justify-center overflow-y-auto py-6 px-4 gap-4"
      style={{ background: '#0D0D1A' }}
    >
      <HandSummary
        handNumber={handNumber}
        playerStats={handStats[humanPlayerIndex]}
        opponentStats={handStats[opponentPlayerIndex]}
        playerTotalScore={playerScore}
        opponentTotalScore={opponentScore}
        onNextHand={onNextHand}
        waitingForOpponent={waitingForOpponent}
      />
      <HandReview
        handNumber={handNumber}
        playerStats={handStats[humanPlayerIndex]}
        opponentStats={handStats[opponentPlayerIndex]}
        className="max-w-sm w-full"
      />
    </div>
  );
}
