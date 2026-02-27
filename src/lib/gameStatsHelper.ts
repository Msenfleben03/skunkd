import { optimalDiscard } from '@/engine/optimal';
import type { GameState } from '@/engine/types';

export interface GamePerformanceStats {
  totalPegging: number;
  totalHand: number;
  totalCrib: number;
  handsPlayed: number;
  bestPegging: number;
  bestHand: number;
  bestCrib: number;
  optimalDiscards: number;
  totalDiscards: number;
  evDeficit: number;
}

export function computeGamePerformance(
  gameState: GameState,
  playerIndex: number,
): GamePerformanceStats {
  const { handStatsHistory, decisionLog } = gameState;

  let totalPegging = 0, totalHand = 0, totalCrib = 0;
  let bestPegging = 0, bestHand = 0, bestCrib = 0;

  for (const h of handStatsHistory) {
    const s = h.stats[playerIndex];
    totalPegging += s.pegging;
    totalHand += s.hand;
    totalCrib += s.crib;
    if (s.pegging > bestPegging) bestPegging = s.pegging;
    if (s.hand > bestHand) bestHand = s.hand;
    if (s.crib > bestCrib) bestCrib = s.crib;
  }

  // Grade discard decisions for this player
  const discardDecisions = decisionLog.filter(d => d.type === 'discard');
  let optimalCount = 0;
  let totalEvDeficit = 0;

  for (const d of discardDecisions) {
    const result = optimalDiscard([...d.hand], d.isDealer);
    const choiceIds = new Set(d.playerChoice.map(c => c.id));
    const playerOption = result.allOptions.find(opt =>
      opt.discard.every(c => choiceIds.has(c.id))
    );
    const playerEV = playerOption?.expectedValue ?? 0;
    const delta = playerEV - result.expectedValue;
    if (Math.abs(delta) < 0.01) optimalCount++;
    totalEvDeficit += delta;
  }

  return {
    totalPegging,
    totalHand,
    totalCrib,
    handsPlayed: handStatsHistory.length,
    bestPegging,
    bestHand,
    bestCrib,
    optimalDiscards: optimalCount,
    totalDiscards: discardDecisions.length,
    evDeficit: totalEvDeficit,
  };
}
