import { useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { gameReducer, createGame } from '@/engine/gameState';
import { scoreHand } from '@/engine/scoring';
import { scorePeggingPlay } from '@/engine/pegging';
import { aiSelectDiscard, aiSelectPlay } from '@/engine/ai';
import type { GameState, GameAction, ScoreBreakdown, Card } from '@/engine/types';
import type { PeggingPlayScore } from '@/engine/pegging';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ShowScoringState {
  cards: readonly Card[];
  starter: Card;
  scoring: ScoreBreakdown;
  label: string;
}

export interface UseGameReturn {
  /** Raw engine state */
  gameState: GameState;
  /** Cards selected by the human player (UI only) */
  selectedCardIds: Set<string>;
  /** Scoring to display during Show phases */
  showScoring: ShowScoringState | null;
  /** Most recent pegging play score (for PeggingScore toast) */
  lastPeggingScore: PeggingPlayScore | null;
  /** Human player index (always 0 in vs-AI mode) */
  humanPlayerIndex: number;

  // Actions
  newGame: () => void;
  toggleCardSelect: (cardId: string) => void;
  confirmDiscard: () => void;
  playSelectedCard: () => void;
  declareGo: () => void;
  advanceShow: () => void;
  nextHand: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const HUMAN_PLAYER = 0;
const AI_PLAYER = 1;
const MAX_DISCARD_SELECT = 2;
const MAX_PLAY_SELECT = 1;

// ── Initial game-start stub ──────────────────────────────────────────────────

/** Pre-game stub state — before NEW_GAME is dispatched */
function createStartState(): GameState {
  return {
    phase: 'GAME_START',
    deck: [],
    players: [
      { hand: [], score: 0, pegFront: 0, pegBack: 0 },
      { hand: [], score: 0, pegFront: 0, pegBack: 0 },
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 0,
    pegging: {
      count: 0,
      pile: [],
      sequence: [],
      currentPlayerIndex: 0,
      goState: [false, false],
      playerCards: [[], []],
      lastCardPlayerIndex: null,
    },
    handStats: [
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ],
    winner: null,
    decisionLog: [],
  };
}

// Our reducer wraps the engine's gameReducer, handling NEW_GAME specially
// so we can start from GAME_START stub.
function reducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'NEW_GAME') {
    return createGame(action.playerCount);
  }
  return gameReducer(state, action);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(): UseGameReturn {
  const [gameState, dispatch] = useReducer(reducer, null, createStartState);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showScoring, setShowScoring] = useState<ShowScoringState | null>(null);
  const [lastPeggingScore, setLastPeggingScore] = useState<PeggingPlayScore | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Auto-advance & AI effects ──────────────────────────────────────────────

  useEffect(() => {
    clearTimer();
    const { phase, pegging, players, dealerIndex, starter, winner } = gameState;

    // DEALING → auto-deal after short animation window
    if (phase === 'DEALING') {
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'DEAL' });
      }, 1200);
      return clearTimer;
    }

    // DISCARD_TO_CRIB → when human has discarded, AI auto-discards
    if (phase === 'DISCARD_TO_CRIB') {
      const humanHand = players[HUMAN_PLAYER].hand;
      const aiHand = players[AI_PLAYER].hand;
      const humanDiscarded = humanHand.length === 4;
      const aiNotDiscarded = aiHand.length === 6;
      if (humanDiscarded && aiNotDiscarded) {
        timerRef.current = setTimeout(() => {
          const result = aiSelectDiscard(aiHand, dealerIndex === AI_PLAYER);
          dispatch({
            type: 'DISCARD',
            playerIndex: AI_PLAYER,
            cardIds: [...result.discard.map(c => c.id)],
          });
        }, 350);
      }
      return clearTimer;
    }

    // CUT_STARTER → auto-cut after reveal delay
    if (phase === 'CUT_STARTER') {
      timerRef.current = setTimeout(() => {
        dispatch({ type: 'CUT' });
      }, 1200);
      return clearTimer;
    }

    // PEGGING → AI's turn
    if (phase === 'PEGGING' && pegging.currentPlayerIndex === AI_PLAYER && !winner) {
      const aiCards = pegging.playerCards[AI_PLAYER];
      const delay = 800 + Math.random() * 700;

      timerRef.current = setTimeout(() => {
        const card = aiSelectPlay(
          aiCards,
          pegging.sequence,
          pegging.count,
        );
        if (card) {
          dispatch({ type: 'PLAY_CARD', playerIndex: AI_PLAYER, cardId: card.id });
        } else {
          dispatch({ type: 'DECLARE_GO', playerIndex: AI_PLAYER });
        }
      }, delay);
      return clearTimer;
    }

    return clearTimer;
  }, [
    gameState.phase,
    gameState.pegging.currentPlayerIndex,
    gameState.pegging.count,
    gameState.pegging.pile.length,
    gameState.winner,
    clearTimer,
  ]);

  // ── Show phase scoring display ─────────────────────────────────────────────

  useEffect(() => {
    const { phase, players, crib, starter, dealerIndex } = gameState;
    if (!starter) { setShowScoring(null); return; }

    const nonDealerIdx = (dealerIndex + 1) % 2;
    const dealerIdx = dealerIndex;

    if (phase === 'SHOW_NONDEALER') {
      const hand = players[nonDealerIdx].hand;
      const scoring = scoreHand([...hand], starter, false);
      setShowScoring({
        cards: hand,
        starter,
        scoring,
        label: nonDealerIdx === HUMAN_PLAYER ? 'Your Hand' : "Opponent's Hand",
      });
    } else if (phase === 'SHOW_DEALER') {
      const hand = players[dealerIdx].hand;
      const scoring = scoreHand([...hand], starter, false);
      setShowScoring({
        cards: hand,
        starter,
        scoring,
        label: dealerIdx === HUMAN_PLAYER ? 'Your Hand' : "Opponent's Hand",
      });
    } else if (phase === 'SHOW_CRIB') {
      const scoring = scoreHand([...crib], starter, true);
      setShowScoring({
        cards: crib,
        starter,
        scoring,
        label: dealerIdx === HUMAN_PLAYER ? 'Your Crib' : "Opponent's Crib",
      });
    } else {
      setShowScoring(null);
    }
  }, [gameState.phase]);

  // ── Pegging score toast ────────────────────────────────────────────────────

  useEffect(() => {
    const { phase, pegging } = gameState;
    if (phase !== 'PEGGING') return;
    if (pegging.sequence.length === 0) return;

    const score = scorePeggingPlay(pegging.sequence);
    if (score.total > 0) {
      setLastPeggingScore(score);
      // Auto-clear after 2.5s
      const t = setTimeout(() => setLastPeggingScore(null), 2500);
      return () => clearTimeout(t);
    }
  }, [gameState.pegging.sequence.length, gameState.pegging.count]);

  // ── Clear selection on phase change ───────────────────────────────────────

  useEffect(() => {
    setSelectedCardIds(new Set());
  }, [gameState.phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME', playerCount: 2 });
    setSelectedCardIds(new Set());
    setShowScoring(null);
    setLastPeggingScore(null);
  }, []);

  const toggleCardSelect = useCallback(
    (cardId: string) => {
      const { phase } = gameState;
      setSelectedCardIds(prev => {
        const next = new Set(prev);
        if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          const max = phase === 'DISCARD_TO_CRIB' ? MAX_DISCARD_SELECT : MAX_PLAY_SELECT;
          if (next.size >= max) {
            // For pegging: replace; for discard: ignore if at cap
            if (phase === 'PEGGING') next.clear();
            else return prev;
          }
          next.add(cardId);
        }
        return next;
      });
    },
    [gameState.phase],
  );

  const confirmDiscard = useCallback(() => {
    if (selectedCardIds.size !== 2) return;
    dispatch({
      type: 'DISCARD',
      playerIndex: HUMAN_PLAYER,
      cardIds: [...selectedCardIds],
    });
    setSelectedCardIds(new Set());
  }, [selectedCardIds]);

  const playSelectedCard = useCallback(() => {
    if (selectedCardIds.size !== 1) return;
    const [cardId] = selectedCardIds;
    dispatch({ type: 'PLAY_CARD', playerIndex: HUMAN_PLAYER, cardId });
    setSelectedCardIds(new Set());
  }, [selectedCardIds]);

  const declareGo = useCallback(() => {
    dispatch({ type: 'DECLARE_GO', playerIndex: HUMAN_PLAYER });
  }, []);

  const advanceShow = useCallback(() => {
    dispatch({ type: 'ADVANCE_SHOW' });
  }, []);

  const nextHand = useCallback(() => {
    dispatch({ type: 'NEXT_HAND' });
  }, []);

  return {
    gameState,
    selectedCardIds,
    showScoring,
    lastPeggingScore,
    humanPlayerIndex: HUMAN_PLAYER,
    newGame,
    toggleCardSelect,
    confirmDiscard,
    playSelectedCard,
    declareGo,
    advanceShow,
    nextHand,
  };
}
