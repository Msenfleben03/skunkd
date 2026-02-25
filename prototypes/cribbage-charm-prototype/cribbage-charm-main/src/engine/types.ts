export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card { rank: Rank; suit: Suit; id: string; }

export const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS: Suit[] = ['♠','♥','♦','♣'];

export function cardValue(c: Card): number {
  if (c.rank === 'A') return 1;
  if (['J','Q','K'].includes(c.rank)) return 10;
  return parseInt(c.rank);
}

export function rankOrder(c: Card): number {
  return RANKS.indexOf(c.rank) + 1;
}

export function isRed(c: Card): boolean {
  return c.suit === '♥' || c.suit === '♦';
}

export function cardLabel(c: Card): string {
  return `${c.rank}${c.suit}`;
}

export type Phase =
  | 'GAME_START' | 'DEALING' | 'DISCARD_TO_CRIB' | 'CUT_STARTER'
  | 'PEGGING' | 'SHOW_NONDEALER' | 'SHOW_DEALER' | 'SHOW_CRIB'
  | 'HAND_COMPLETE' | 'GAME_OVER';

export interface PeggingState {
  count: number;
  pile: Card[];
  sequence: Card[];
  turn: 'player' | 'ai';
  goState: { player: boolean; ai: boolean };
  playerCards: Card[];
  aiCards: Card[];
  lastCardPlayer: 'player' | 'ai' | null;
}

export interface PegPositions {
  player: { front: number; back: number };
  ai: { front: number; back: number };
}

export interface ScoreBreakdown {
  total: number;
  fifteens: number;
  pairs: number;
  runs: number;
  flush: number;
  nobs: number;
}

export interface GameState {
  phase: Phase;
  deck: Card[];
  playerHand: Card[];
  aiHand: Card[];
  crib: Card[];
  starter: Card | null;
  playerScore: number;
  aiScore: number;
  dealer: 'player' | 'ai';
  handNumber: number;
  pegging: PeggingState;
  pegPositions: PegPositions;
  message: string;
  aiSpeech: string;
  playerSpeech: string;
  showScoring: ScoreBreakdown | null;
  showCards: Card[] | null;
  showLabel: string;
  winner: 'player' | 'ai' | null;
  selectedCards: string[];
}

export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'DEAL_COMPLETE' }
  | { type: 'TOGGLE_SELECT'; cardId: string }
  | { type: 'CONFIRM_DISCARD' }
  | { type: 'CUT_COMPLETE' }
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'DECLARE_GO' }
  | { type: 'AI_PLAY' }
  | { type: 'ADVANCE_SHOW' }
  | { type: 'NEXT_HAND' }
  | { type: 'SET_AI_SPEECH'; message: string }
  | { type: 'SET_PLAYER_SPEECH'; message: string }
  | { type: 'CLEAR_SPEECH' };
