// Card primitives
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = 'H' | 'D' | 'S' | 'C';

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  readonly id: string;
}

export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: readonly Suit[] = ['H', 'D', 'S', 'C'];

const SUIT_NAMES: Record<Suit, string> = { H: 'Hearts', D: 'Diamonds', S: 'Spades', C: 'Clubs' };

const PIP_VALUES: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10,
};

const RANK_ORDERS: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export function createCard(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}-${suit}` };
}

export function cardValue(rank: Rank): number {
  return PIP_VALUES[rank];
}

export function rankOrder(rank: Rank): number {
  return RANK_ORDERS[rank];
}

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function cardLabel(card: Card): string {
  return `${card.rank} of ${SUIT_NAMES[card.suit]}`;
}

// Game phases
export type Phase =
  | 'GAME_START'
  | 'DEALING'
  | 'DISCARD_TO_CRIB'
  | 'CUT_STARTER'
  | 'PEGGING'
  | 'SHOW_NONDEALER'
  | 'SHOW_DEALER'
  | 'SHOW_CRIB'
  | 'HAND_COMPLETE'
  | 'GAME_OVER';

// Score breakdown for a hand/crib
export interface ScoreBreakdown {
  readonly total: number;
  readonly fifteens: number;
  readonly pairs: number;
  readonly runs: number;
  readonly flush: number;
  readonly nobs: number;
}

// Pegging state
export interface PeggingState {
  readonly count: number;
  readonly pile: readonly Card[];
  readonly sequence: readonly Card[];
  readonly currentPlayerIndex: number;
  readonly goState: readonly boolean[];
  readonly playerCards: readonly (readonly Card[])[];
  readonly lastCardPlayerIndex: number | null;
}

// Per-player state
export interface PlayerState {
  readonly hand: readonly Card[];
  readonly score: number;
  readonly pegFront: number;
  readonly pegBack: number;
}

// Hand stats for end-of-hand scorecard
export interface HandStats {
  readonly pegging: number;
  readonly hand: number;
  readonly crib: number;
}

// Per-hand scoring snapshot for post-game analysis
export interface HandStatsSnapshot {
  readonly handNumber: number;
  readonly dealerIndex: number;
  readonly stats: readonly HandStats[];
  readonly starterCard: Card;
}

// Snapshot of a player decision for coaching analysis
export interface DecisionSnapshot {
  readonly type: 'discard' | 'pegging_play';
  readonly hand: readonly Card[];         // hand at decision time (6 for discard, remaining pegging cards for play)
  readonly playerChoice: readonly Card[]; // 2 cards for discard, 1 card for play
  readonly isDealer: boolean;
  readonly pile?: readonly Card[];        // pegging only: pile (sequence) before this play
  readonly count?: number;               // pegging only: count before this play
  readonly handIndex: number;            // 0-based hand number in this game
}

// Full game state — players array supports 2+ players
export interface GameState {
  readonly phase: Phase;
  readonly deck: readonly Card[];
  readonly players: readonly PlayerState[];
  readonly crib: readonly Card[];
  readonly starter: Card | null;
  readonly dealerIndex: number;
  readonly handNumber: number;
  readonly pegging: PeggingState;
  readonly handStats: readonly HandStats[];
  readonly winner: number | null;
  readonly decisionLog: readonly DecisionSnapshot[];
  readonly handStatsHistory: readonly HandStatsSnapshot[];
}

// Game actions
export type GameAction =
  | { type: 'NEW_GAME'; playerCount: number }
  | { type: 'DEAL' }
  | { type: 'DISCARD'; playerIndex: number; cardIds: string[] }
  | { type: 'CUT' }
  | { type: 'PLAY_CARD'; playerIndex: number; cardId: string }
  | { type: 'DECLARE_GO'; playerIndex: number }
  | { type: 'ADVANCE_SHOW' }
  | { type: 'NEXT_HAND' }
  | { type: 'LOAD_ONLINE_DEAL'; hands: [Card[], Card[]]; starter: Card; dealerIndex: number; handNumber: number };
