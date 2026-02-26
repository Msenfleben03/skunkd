// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  Card, Rank, Suit,
  GameState, GameAction,
  PlayerState, PeggingState,
  ScoreBreakdown,
} from './types';
export { RANKS, SUITS, cardValue, createCard } from './types';

// ─── Game state machine ───────────────────────────────────────────────────────
export { createGame, gameReducer } from './gameState';

// ─── Scoring ─────────────────────────────────────────────────────────────────
export { scoreHand } from './scoring';
export { scorePeggingPlay } from './pegging';
export type { PeggingPlayScore } from './pegging';

// ─── AI ──────────────────────────────────────────────────────────────────────
export { aiSelectDiscard, aiSelectPlay, getPositionMode } from './ai';
export type { DiscardResult, PositionMode } from './ai';

// ─── Coaching / Optimal ──────────────────────────────────────────────────────
export { optimalDiscard, optimalPeggingPlay } from './optimal';
export type { OptimalDiscardResult, OptimalPlayResult, DiscardOption } from './optimal';
export { expectimaxPeggingPlay } from './expectimax';
