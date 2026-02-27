import type { Card, GameState, GameAction, PlayerState, PeggingState, HandStats, HandStatsSnapshot, DecisionSnapshot } from './types';
import { cardValue } from './types';
import { createDeck, shuffle, deal } from './deck';
import { scoreHand } from './scoring';
import { scorePeggingPlay } from './pegging';

const WIN_SCORE = 121;
const CARDS_PER_PLAYER_2P = 6;
const HAND_SIZE = 4;
const DISCARD_COUNT = 2;
const MAX_COUNT = 31;

/** Create a new game with the given number of players. */
export function createGame(playerCount: number): GameState {
  const players: PlayerState[] = Array.from({ length: playerCount }, () => ({
    hand: [],
    score: 0,
    pegFront: 0,
    pegBack: 0,
  }));

  const handStats: HandStats[] = Array.from({ length: playerCount }, () => ({
    pegging: 0,
    hand: 0,
    crib: 0,
  }));

  return {
    phase: 'DEALING',
    deck: shuffle(createDeck()),
    players,
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: emptyPegging(playerCount, 0),
    handStats,
    winner: null,
    decisionLog: [],
    handStatsHistory: [],
  };
}

function emptyPegging(playerCount: number, dealerIndex: number): PeggingState {
  const nonDealerIndex = (dealerIndex + 1) % playerCount;
  return {
    count: 0,
    pile: [],
    sequence: [],
    currentPlayerIndex: nonDealerIndex,
    goState: Array.from({ length: playerCount }, () => false),
    playerCards: Array.from({ length: playerCount }, () => []),
    lastCardPlayerIndex: null,
  };
}

/** Main game reducer — handles all phase transitions and game logic. */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createGame(action.playerCount);
    case 'DEAL':
      return handleDeal(state);
    case 'DISCARD':
      return handleDiscard(state, action.playerIndex, action.cardIds);
    case 'CUT':
      return handleCut(state);
    case 'PLAY_CARD':
      return handlePlayCard(state, action.playerIndex, action.cardId);
    case 'DECLARE_GO':
      return handleDeclareGo(state, action.playerIndex);
    case 'ADVANCE_SHOW':
      return handleAdvanceShow(state);
    case 'NEXT_HAND':
      return handleNextHand(state);
    case 'LOAD_ONLINE_DEAL':
      return handleLoadOnlineDeal(state, action);
    default:
      return state;
  }
}

function handleDeal(state: GameState): GameState {
  if (state.phase !== 'DEALING') {
    throw new Error(`Cannot deal in phase ${state.phase}`);
  }

  const { hands, remaining } = deal(state.deck, state.players.length, CARDS_PER_PLAYER_2P);

  return {
    ...state,
    phase: 'DISCARD_TO_CRIB',
    deck: remaining,
    players: state.players.map((p, i) => ({ ...p, hand: hands[i] })),
  };
}

function handleDiscard(state: GameState, playerIndex: number, cardIds: string[]): GameState {
  if (state.phase !== 'DISCARD_TO_CRIB') {
    throw new Error(`Cannot discard in phase ${state.phase}`);
  }

  if (cardIds.length !== DISCARD_COUNT) {
    throw new Error(`Must discard exactly ${DISCARD_COUNT} cards, got ${cardIds.length}`);
  }

  const playerHand = state.players[playerIndex].hand;
  const discardedCards: Card[] = [];

  for (const id of cardIds) {
    const found = playerHand.find(c => c.id === id);
    if (!found) {
      throw new Error(`Card ${id} not found in player ${playerIndex}'s hand`);
    }
    discardedCards.push(found);
  }

  const remainingHand = playerHand.filter(c => !cardIds.includes(c.id));
  const newCrib = [...state.crib, ...discardedCards];

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: remainingHand } : p,
  );

  // Check if all players have discarded (hand size = HAND_SIZE)
  const allDiscarded = newPlayers.every(p => p.hand.length === HAND_SIZE);

  // Record decision snapshot (full 6-card hand before discard)
  const snapshot: DecisionSnapshot = {
    type: 'discard',
    hand: playerHand,
    playerChoice: discardedCards,
    isDealer: playerIndex === state.dealerIndex,
    handIndex: state.handNumber - 1,
  };

  return {
    ...state,
    phase: allDiscarded ? 'CUT_STARTER' : 'DISCARD_TO_CRIB',
    players: newPlayers,
    crib: newCrib,
    decisionLog: [...state.decisionLog, snapshot],
  };
}

function handleCut(state: GameState): GameState {
  if (state.phase !== 'CUT_STARTER') {
    throw new Error(`Cannot cut in phase ${state.phase}`);
  }

  const starter = state.deck[0];
  const remainingDeck = state.deck.slice(1);

  // His Heels: Jack as starter = 2 points to dealer
  let newPlayers = state.players;
  if (starter.rank === 'J') {
    newPlayers = addScore(state.players, state.dealerIndex, 2);
    // Check for win
    if (newPlayers[state.dealerIndex].score >= WIN_SCORE) {
      return {
        ...state,
        phase: 'GAME_OVER',
        deck: remainingDeck,
        starter,
        players: newPlayers,
        winner: state.dealerIndex,
      };
    }
  }

  // Initialize pegging with player cards from hands
  const pegging: PeggingState = {
    ...emptyPegging(state.players.length, state.dealerIndex),
    playerCards: newPlayers.map(p => [...p.hand]),
  };

  return {
    ...state,
    phase: 'PEGGING',
    deck: remainingDeck,
    starter,
    players: newPlayers,
    pegging,
  };
}

function handlePlayCard(state: GameState, playerIndex: number, cardId: string): GameState {
  if (state.phase !== 'PEGGING') {
    throw new Error(`Cannot play card in phase ${state.phase}`);
  }

  if (state.pegging.currentPlayerIndex !== playerIndex) {
    throw new Error(`Not player ${playerIndex}'s turn (current: ${state.pegging.currentPlayerIndex})`);
  }

  const playerCards = state.pegging.playerCards[playerIndex];
  const cardIndex = playerCards.findIndex(c => c.id === cardId);
  if (cardIndex === -1) {
    throw new Error(`Card ${cardId} not in player ${playerIndex}'s pegging cards`);
  }

  const playedCard = playerCards[cardIndex];
  const newCount = state.pegging.count + cardValue(playedCard.rank);

  if (newCount > MAX_COUNT) {
    throw new Error(`Playing ${cardId} would exceed 31 (count: ${state.pegging.count} + ${cardValue(playedCard.rank)} = ${newCount})`);
  }

  // Record decision snapshot BEFORE updating pile/count
  const snapshot: DecisionSnapshot = {
    type: 'pegging_play',
    hand: playerCards,
    playerChoice: [playedCard],
    isDealer: playerIndex === state.dealerIndex,
    pile: state.pegging.sequence,
    count: state.pegging.count,
    handIndex: state.handNumber - 1,
  };
  const newDecisionLog = [...state.decisionLog, snapshot];

  // Update pegging state
  const newSequence = [...state.pegging.sequence, playedCard];
  const newPile = [...state.pegging.pile, playedCard];
  const newPlayerCards = state.pegging.playerCards.map((cards, i) =>
    i === playerIndex ? cards.filter(c => c.id !== cardId) : cards,
  );

  // Score the play
  const peggingScore = scorePeggingPlay(newSequence);
  let newPlayers = addScore(state.players, playerIndex, peggingScore.total);
  let newHandStats = peggingScore.total > 0
    ? updateHandStats(state.handStats, playerIndex, 'pegging', peggingScore.total)
    : state.handStats;

  // Check for win after pegging score
  if (newPlayers[playerIndex].score >= WIN_SCORE) {
    return {
      ...state,
      phase: 'GAME_OVER',
      players: newPlayers,
      handStats: newHandStats,
      pegging: {
        ...state.pegging,
        count: newCount,
        pile: newPile,
        sequence: newSequence,
        playerCards: newPlayerCards,
        lastCardPlayerIndex: playerIndex,
      },
      winner: playerIndex,
      decisionLog: newDecisionLog,
    };
  }

  // Check if count hit 31 — reset sequence
  const hit31 = newCount === MAX_COUNT;

  // Check if all cards exhausted
  const allCardsPlayed = newPlayerCards.every(cards => cards.length === 0);

  if (allCardsPlayed) {
    // Award last card point (1pt) unless we already scored 31 (which includes the 2pts)
    if (!hit31) {
      newPlayers = addScore(newPlayers, playerIndex, 1);
      newHandStats = updateHandStats(newHandStats, playerIndex, 'pegging', 1);
      if (newPlayers[playerIndex].score >= WIN_SCORE) {
        return {
          ...state,
          phase: 'GAME_OVER',
          players: newPlayers,
          handStats: newHandStats,
          pegging: {
            ...state.pegging,
            count: newCount,
            pile: newPile,
            sequence: newSequence,
            playerCards: newPlayerCards,
            lastCardPlayerIndex: playerIndex,
          },
          winner: playerIndex,
          decisionLog: newDecisionLog,
        };
      }
    }

    return {
      ...state,
      phase: 'SHOW_NONDEALER',
      players: newPlayers,
      handStats: newHandStats,
      pegging: {
        ...state.pegging,
        count: newCount,
        pile: newPile,
        sequence: newSequence,
        playerCards: newPlayerCards,
        lastCardPlayerIndex: playerIndex,
      },
      decisionLog: newDecisionLog,
    };
  }

  // Determine next player
  const otherPlayer = (playerIndex + 1) % state.players.length;

  // If hit 31, reset sequence and count
  if (hit31) {
    const resetPegging: PeggingState = {
      count: 0,
      pile: newPile,
      sequence: [],
      currentPlayerIndex: otherPlayer,
      goState: state.pegging.goState.map(() => false),
      playerCards: newPlayerCards,
      lastCardPlayerIndex: playerIndex,
    };
    return { ...state, players: newPlayers, handStats: newHandStats, pegging: resetPegging, decisionLog: newDecisionLog };
  }

  // Normal play — switch to other player if they can play, otherwise stay
  const nextPlayer = canPlay(newPlayerCards[otherPlayer], newCount)
    ? otherPlayer
    : playerIndex;

  return {
    ...state,
    players: newPlayers,
    handStats: newHandStats,
    pegging: {
      ...state.pegging,
      count: newCount,
      pile: newPile,
      sequence: newSequence,
      currentPlayerIndex: nextPlayer,
      playerCards: newPlayerCards,
      goState: state.pegging.goState.map(() => false),
      lastCardPlayerIndex: playerIndex,
    },
    decisionLog: newDecisionLog,
  };
}

function handleDeclareGo(state: GameState, playerIndex: number): GameState {
  if (state.phase !== 'PEGGING') {
    throw new Error(`Cannot declare Go in phase ${state.phase}`);
  }

  if (state.pegging.currentPlayerIndex !== playerIndex) {
    throw new Error(`Not player ${playerIndex}'s turn`);
  }

  // Validate: player must not have any playable card
  const playerCards = state.pegging.playerCards[playerIndex];
  if (canPlay(playerCards, state.pegging.count)) {
    throw new Error(`Player ${playerIndex} has a playable card and cannot declare Go`);
  }

  const newGoState = state.pegging.goState.map((go, i) =>
    i === playerIndex ? true : go,
  );

  // Check if all players have said Go
  const allGo = newGoState.every(go => go);

  if (allGo) {
    // Award last card point (1pt) to last player who played
    let newPlayers = state.players;
    let newHandStats = state.handStats;
    if (state.pegging.lastCardPlayerIndex !== null) {
      newPlayers = addScore(state.players, state.pegging.lastCardPlayerIndex, 1);
      newHandStats = updateHandStats(state.handStats, state.pegging.lastCardPlayerIndex, 'pegging', 1);

      if (newPlayers[state.pegging.lastCardPlayerIndex].score >= WIN_SCORE) {
        return {
          ...state,
          phase: 'GAME_OVER',
          players: newPlayers,
          handStats: newHandStats,
          winner: state.pegging.lastCardPlayerIndex,
        };
      }
    }

    // Check if all cards are exhausted after the Go reset
    const allCardsPlayed = state.pegging.playerCards.every(cards => cards.length === 0);
    if (allCardsPlayed) {
      return {
        ...state,
        phase: 'SHOW_NONDEALER',
        players: newPlayers,
        handStats: newHandStats,
        pegging: {
          ...state.pegging,
          count: 0,
          sequence: [],
          goState: newGoState.map(() => false),
          lastCardPlayerIndex: state.pegging.lastCardPlayerIndex,
        },
      };
    }

    // Reset count and sequence, non-go player leads
    // The player who didn't play last card leads the new count
    const nextLeader = state.pegging.lastCardPlayerIndex !== null
      ? (state.pegging.lastCardPlayerIndex + 1) % state.players.length
      : (state.dealerIndex + 1) % state.players.length;

    return {
      ...state,
      players: newPlayers,
      handStats: newHandStats,
      pegging: {
        ...state.pegging,
        count: 0,
        sequence: [],
        goState: newGoState.map(() => false),
        currentPlayerIndex: nextLeader,
        lastCardPlayerIndex: state.pegging.lastCardPlayerIndex,
      },
    };
  }

  // Not all Go yet — pass turn to next player
  const otherPlayer = (playerIndex + 1) % state.players.length;

  return {
    ...state,
    pegging: {
      ...state.pegging,
      goState: newGoState,
      currentPlayerIndex: otherPlayer,
    },
  };
}

function handleAdvanceShow(state: GameState): GameState {
  if (state.starter === null) {
    throw new Error('No starter card set');
  }

  const nonDealerIndex = (state.dealerIndex + 1) % state.players.length;

  switch (state.phase) {
    case 'SHOW_NONDEALER': {
      const result = scoreHand(state.players[nonDealerIndex].hand, state.starter, false);
      const newPlayers = addScore(state.players, nonDealerIndex, result.total);
      const newHandStats = updateHandStats(state.handStats, nonDealerIndex, 'hand', result.total);

      if (newPlayers[nonDealerIndex].score >= WIN_SCORE) {
        return { ...state, phase: 'GAME_OVER', players: newPlayers, handStats: newHandStats, handStatsHistory: appendHandStatsSnapshot(state, newHandStats), winner: nonDealerIndex };
      }
      return { ...state, phase: 'SHOW_DEALER', players: newPlayers, handStats: newHandStats };
    }
    case 'SHOW_DEALER': {
      const result = scoreHand(state.players[state.dealerIndex].hand, state.starter, false);
      const newPlayers = addScore(state.players, state.dealerIndex, result.total);
      const newHandStats = updateHandStats(state.handStats, state.dealerIndex, 'hand', result.total);

      if (newPlayers[state.dealerIndex].score >= WIN_SCORE) {
        return { ...state, phase: 'GAME_OVER', players: newPlayers, handStats: newHandStats, handStatsHistory: appendHandStatsSnapshot(state, newHandStats), winner: state.dealerIndex };
      }
      return { ...state, phase: 'SHOW_CRIB', players: newPlayers, handStats: newHandStats };
    }
    case 'SHOW_CRIB': {
      const result = scoreHand(state.crib, state.starter, true);
      const newPlayers = addScore(state.players, state.dealerIndex, result.total);
      const newHandStats = updateHandStats(state.handStats, state.dealerIndex, 'crib', result.total);

      if (newPlayers[state.dealerIndex].score >= WIN_SCORE) {
        return { ...state, phase: 'GAME_OVER', players: newPlayers, handStats: newHandStats, handStatsHistory: appendHandStatsSnapshot(state, newHandStats), winner: state.dealerIndex };
      }
      return { ...state, phase: 'HAND_COMPLETE', players: newPlayers, handStats: newHandStats, handStatsHistory: appendHandStatsSnapshot(state, newHandStats) };
    }
    default:
      throw new Error(`Cannot advance show in phase ${state.phase}`);
  }
}

function handleNextHand(state: GameState): GameState {
  if (state.phase !== 'HAND_COMPLETE') {
    throw new Error(`Cannot start next hand in phase ${state.phase}`);
  }

  const newDealerIndex = (state.dealerIndex + 1) % state.players.length;

  return {
    ...state,
    phase: 'DEALING',
    deck: shuffle(createDeck()),
    players: state.players.map(p => ({ ...p, hand: [] })),
    crib: [],
    starter: null,
    dealerIndex: newDealerIndex,
    handNumber: state.handNumber + 1,
    pegging: emptyPegging(state.players.length, newDealerIndex),
    handStats: state.handStats.map(() => ({ pegging: 0, hand: 0, crib: 0 })),
  };
}

function handleLoadOnlineDeal(
  state: GameState,
  action: { hands: [readonly Card[], readonly Card[]]; starter: Card; dealerIndex: number; handNumber: number }
): GameState {
  return {
    ...state,
    phase: 'DISCARD_TO_CRIB',
    deck: [action.starter],
    players: state.players.map((p, i) => ({
      ...p,
      hand: [...action.hands[i]],
    })),
    crib: [],
    starter: null,
    dealerIndex: action.dealerIndex,
    handNumber: action.handNumber,
    pegging: emptyPegging(state.players.length, action.dealerIndex),
    handStats: state.handStats.map(() => ({ pegging: 0, hand: 0, crib: 0 })),
    winner: null,
    decisionLog: [],
  };
}

// --- Helpers ---

function addScore(players: readonly PlayerState[], playerIndex: number, points: number): PlayerState[] {
  return players.map((p, i) => {
    if (i !== playerIndex) return p;
    const newScore = p.score + points;
    return { ...p, score: newScore, pegFront: newScore, pegBack: p.pegFront };
  });
}

function canPlay(cards: readonly Card[], currentCount: number): boolean {
  return cards.some(c => currentCount + cardValue(c.rank) <= MAX_COUNT);
}

function updateHandStats(
  stats: readonly HandStats[],
  playerIndex: number,
  category: keyof HandStats,
  points: number,
): HandStats[] {
  return stats.map((s, i) => {
    if (i !== playerIndex) return s;
    return { ...s, [category]: s[category] + points };
  });
}

function appendHandStatsSnapshot(state: GameState, handStats: readonly HandStats[]): readonly HandStatsSnapshot[] {
  const snapshot: HandStatsSnapshot = {
    handNumber: state.handNumber,
    dealerIndex: state.dealerIndex,
    stats: handStats,
    starterCard: state.starter!,
  };
  return [...state.handStatsHistory, snapshot];
}
