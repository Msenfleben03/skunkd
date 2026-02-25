import { useReducer, useEffect, useCallback, useRef } from 'react';
import { GameState, GameAction, Phase, Card, cardValue, PeggingState } from '../engine/types';
import { createDeck, shuffle } from '../engine/deck';
import { scoreHand, scorePeggingPlay } from '../engine/scoring';
import { aiSelectDiscard, aiSelectPlay } from '../engine/ai';
import { getTrashTalk } from '../engine/trashTalk';

function addScore(state: GameState, who: 'player' | 'ai', points: number): GameState {
  if (points === 0) return state;
  const key = who === 'player' ? 'playerScore' : 'aiScore';
  const newScore = Math.min(state[key] + points, 121);
  const newPos = { ...state.pegPositions };
  const old = newPos[who];
  newPos[who] = { front: newScore, back: old.front };
  const s = { ...state, [key]: newScore, pegPositions: newPos };
  if (newScore >= 121) {
    return { ...s, phase: 'GAME_OVER' as Phase, winner: who };
  }
  return s;
}

function endPegging(state: GameState): GameState {
  const nonDealer = state.dealer === 'player' ? 'ai' : 'player';
  const hand = nonDealer === 'player' ? state.playerHand : state.aiHand;
  const breakdown = scoreHand(hand, state.starter!, false);
  let s = addScore(state, nonDealer, breakdown.total);
  const label = nonDealer === 'player' ? 'Your Hand' : "Muggins' Hand";
  if (s.phase === 'GAME_OVER') return { ...s, showScoring: breakdown, showCards: hand, showLabel: label };
  const speech = nonDealer === 'ai'
    ? (breakdown.total >= 12 ? getTrashTalk('aiBigHand') : breakdown.total === 0 ? getTrashTalk('aiZero') : '')
    : (breakdown.total >= 12 ? getTrashTalk('playerBigHand') : breakdown.total === 0 ? getTrashTalk('playerZero') : '');
  return { ...s, phase: 'SHOW_NONDEALER', showScoring: breakdown, showCards: hand, showLabel: label, aiSpeech: speech };
}

function resolvePegging(state: GameState, lastPlayer: 'player' | 'ai'): GameState {
  if (state.phase === 'GAME_OVER') return state;
  const p = state.pegging;
  const other = lastPlayer === 'player' ? 'ai' : 'player';
  const otherCards = other === 'player' ? p.playerCards : p.aiCards;
  const lastCards = lastPlayer === 'player' ? p.playerCards : p.aiCards;

  if (otherCards.length === 0 && lastCards.length === 0) {
    if (p.sequence.length > 0 && p.count > 0) {
      const s = addScore(state, lastPlayer, 1);
      return endPegging(s);
    }
    return endPegging(state);
  }

  if (p.count === 0) {
    const next = otherCards.length > 0 ? other : lastPlayer;
    return { ...state, pegging: { ...p, turn: next, goState: { player: false, ai: false } } };
  }

  const otherCanPlay = otherCards.some(c => cardValue(c) + p.count <= 31);
  const lastCanPlay = lastCards.some(c => cardValue(c) + p.count <= 31);

  if (otherCanPlay) return { ...state, pegging: { ...p, turn: other } };
  if (lastCanPlay) return { ...state, pegging: { ...p, turn: lastPlayer } };

  let s = addScore(state, lastPlayer, 1);
  if (s.phase === 'GAME_OVER') return s;

  if (otherCards.length === 0 && lastCards.length === 0) return endPegging(s);

  const next = otherCards.length > 0 ? other : lastPlayer;
  return {
    ...s,
    pegging: { ...s.pegging, count: 0, sequence: [], turn: next, goState: { player: false, ai: false } },
  };
}

function playCard(state: GameState, card: Card, who: 'player' | 'ai'): GameState {
  const p = state.pegging;
  const key = who === 'player' ? 'playerCards' : 'aiCards';
  const newCards = p[key].filter(c => c.id !== card.id);
  const newSeq = [...p.sequence, card];
  const newPile = [...p.pile, card];
  const newCount = p.count + cardValue(card);

  const { points, desc } = scorePeggingPlay(newSeq, newCount);

  let s: GameState = {
    ...state,
    pegging: { ...p, [key]: newCards, sequence: newSeq, pile: newPile, count: newCount, lastCardPlayer: who },
    selectedCards: [],
    message: desc.length > 0 ? desc.join(', ') : '',
  };

  if (points > 0) {
    s = addScore(s, who, points);
    if (s.phase === 'GAME_OVER') return s;
  }

  if (newCount === 31) {
    s = { ...s, pegging: { ...s.pegging, count: 0, sequence: [], goState: { player: false, ai: false } } };
  }

  return resolvePegging(s, who);
}

function createInitialState(): GameState {
  return {
    phase: 'GAME_START',
    deck: [], playerHand: [], aiHand: [], crib: [], starter: null,
    playerScore: 0, aiScore: 0, dealer: 'ai', handNumber: 0,
    pegging: { count: 0, pile: [], sequence: [], turn: 'player', goState: { player: false, ai: false }, playerCards: [], aiCards: [], lastCardPlayer: null },
    pegPositions: { player: { front: 0, back: 0 }, ai: { front: 0, back: 0 } },
    message: '', aiSpeech: '', playerSpeech: '', showScoring: null, showCards: null, showLabel: '',
    winner: null, selectedCards: [],
  };
}

function dealHand(state: GameState): GameState {
  const deck = shuffle(createDeck());
  const nonDealer = state.dealer === 'player' ? 'ai' : 'player';
  const hand1 = deck.slice(0, 6);
  const hand2 = deck.slice(6, 12);
  const remaining = deck.slice(12);
  const playerHand = nonDealer === 'player' ? hand1 : hand2;
  const aiHand = nonDealer === 'ai' ? hand1 : hand2;
  return {
    ...state, phase: 'DEALING', deck: remaining, playerHand, aiHand,
    crib: [], starter: null, selectedCards: [], showScoring: null, showCards: null, showLabel: '',
    message: '', aiSpeech: '', playerSpeech: '',
    pegging: { count: 0, pile: [], sequence: [], turn: 'player', goState: { player: false, ai: false }, playerCards: [], aiCards: [], lastCardPlayer: null },
    handNumber: state.handNumber + 1,
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const s = createInitialState();
      return dealHand(s);
    }

    case 'DEAL_COMPLETE':
      return { ...state, phase: 'DISCARD_TO_CRIB' };

    case 'TOGGLE_SELECT': {
      if (state.phase === 'DISCARD_TO_CRIB') {
        const sel = state.selectedCards.includes(action.cardId)
          ? state.selectedCards.filter(id => id !== action.cardId)
          : state.selectedCards.length < 2 ? [...state.selectedCards, action.cardId] : state.selectedCards;
        return { ...state, selectedCards: sel };
      }
      if (state.phase === 'PEGGING') {
        const sel = state.selectedCards[0] === action.cardId ? [] : [action.cardId];
        return { ...state, selectedCards: sel };
      }
      return state;
    }

    case 'CONFIRM_DISCARD': {
      if (state.selectedCards.length !== 2) return state;
      const playerKeep = state.playerHand.filter(c => !state.selectedCards.includes(c.id));
      const playerDiscard = state.playerHand.filter(c => state.selectedCards.includes(c.id));
      const aiDiscardIds = aiSelectDiscard(state.aiHand, state.dealer === 'ai');
      const aiKeep = state.aiHand.filter(c => !aiDiscardIds.includes(c.id));
      const aiDiscard = state.aiHand.filter(c => aiDiscardIds.includes(c.id));
      const crib = [...playerDiscard, ...aiDiscard];
      const starter = state.deck[0];
      const deck = state.deck.slice(1);
      return {
        ...state, phase: 'CUT_STARTER', playerHand: playerKeep, aiHand: aiKeep,
        crib, starter, deck, selectedCards: [],
      };
    }

    case 'CUT_COMPLETE': {
      let s = { ...state };
      if (state.starter?.rank === 'J') {
        s = addScore(s, s.dealer, 2);
        s = { ...s, aiSpeech: s.dealer === 'ai' ? getTrashTalk('hisHeels') : '', message: 'His Heels! Dealer scores 2!' };
        if (s.phase === 'GAME_OVER') return s;
      }
      const nonDealer = s.dealer === 'player' ? 'ai' : 'player';
      return {
        ...s, phase: 'PEGGING',
        pegging: {
          count: 0, pile: [], sequence: [],
          turn: nonDealer === 'player' ? 'player' : 'ai',
          goState: { player: false, ai: false },
          playerCards: [...s.playerHand], aiCards: [...s.aiHand], lastCardPlayer: null,
        },
      };
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'PEGGING' || state.pegging.turn !== 'player') return state;
      const card = state.pegging.playerCards.find(c => c.id === action.cardId);
      if (!card || cardValue(card) + state.pegging.count > 31) return state;
      return playCard(state, card, 'player');
    }

    case 'AI_PLAY': {
      if (state.phase !== 'PEGGING' || state.pegging.turn !== 'ai') return state;
      const card = aiSelectPlay(state.pegging.aiCards, state.pegging.count, state.pegging.sequence);
      if (!card) {
        // AI can't play, resolve as go
        const p = state.pegging;
        const playerCanPlay = p.playerCards.some(c => cardValue(c) + p.count <= 31);
        if (playerCanPlay) {
          return { ...state, pegging: { ...p, turn: 'player' }, message: 'Muggins says "Go!"' };
        }
        // Neither can play
        const lastP = p.lastCardPlayer || 'ai';
        let s = addScore(state, lastP, 1);
        if (s.phase === 'GAME_OVER') return s;
        if (p.playerCards.length === 0 && p.aiCards.length === 0) return endPegging(s);
        const next = p.playerCards.length > 0 ? 'player' : 'ai';
        return { ...s, pegging: { ...s.pegging, count: 0, sequence: [], turn: next, goState: { player: false, ai: false } }, message: 'Go! Count resets.' };
      }
      return playCard(state, card, 'ai');
    }

    case 'DECLARE_GO': {
      if (state.phase !== 'PEGGING' || state.pegging.turn !== 'player') return state;
      const p = state.pegging;
      const aiCanPlay = p.aiCards.some(c => cardValue(c) + p.count <= 31);
      if (aiCanPlay) {
        return { ...state, pegging: { ...p, turn: 'ai', goState: { ...p.goState, player: true } }, message: 'You say "Go"' };
      }
      const lastP = p.lastCardPlayer || 'player';
      let s = addScore(state, lastP, 1);
      if (s.phase === 'GAME_OVER') return s;
      if (p.playerCards.length === 0 && p.aiCards.length === 0) return endPegging(s);
      const next = p.aiCards.length > 0 ? 'ai' : 'player';
      return { ...s, pegging: { ...s.pegging, count: 0, sequence: [], turn: next, goState: { player: false, ai: false } }, message: 'Go! Count resets.' };
    }

    case 'ADVANCE_SHOW': {
      if (state.phase === 'SHOW_NONDEALER') {
        const dealer = state.dealer;
        const hand = dealer === 'player' ? state.playerHand : state.aiHand;
        const breakdown = scoreHand(hand, state.starter!, false);
        let s = addScore(state, dealer, breakdown.total);
        const label = dealer === 'player' ? 'Your Hand' : "Muggins' Hand";
        if (s.phase === 'GAME_OVER') return { ...s, showScoring: breakdown, showCards: hand, showLabel: label };
        const speech = dealer === 'ai'
          ? (breakdown.total >= 12 ? getTrashTalk('aiBigHand') : breakdown.total === 0 ? getTrashTalk('aiZero') : '')
          : (breakdown.total >= 12 ? getTrashTalk('playerBigHand') : breakdown.total === 0 ? getTrashTalk('playerZero') : '');
        return { ...s, phase: 'SHOW_DEALER', showScoring: breakdown, showCards: hand, showLabel: label, aiSpeech: speech };
      }
      if (state.phase === 'SHOW_DEALER') {
        const breakdown = scoreHand(state.crib, state.starter!, true);
        let s = addScore(state, state.dealer, breakdown.total);
        const label = state.dealer === 'player' ? 'Your Crib' : "Muggins' Crib";
        if (s.phase === 'GAME_OVER') return { ...s, showScoring: breakdown, showCards: state.crib, showLabel: label };
        return { ...s, phase: 'SHOW_CRIB', showScoring: breakdown, showCards: state.crib, showLabel: label };
      }
      if (state.phase === 'SHOW_CRIB') {
        return { ...state, phase: 'HAND_COMPLETE', showScoring: null, showCards: null, showLabel: '' };
      }
      return state;
    }

    case 'NEXT_HAND': {
      const newDealer = state.dealer === 'player' ? 'ai' : 'player';
      return dealHand({ ...state, dealer: newDealer });
    }

    case 'SET_AI_SPEECH':
      return { ...state, aiSpeech: action.message };
    case 'SET_PLAYER_SPEECH':
      return { ...state, playerSpeech: action.message };
    case 'CLEAR_SPEECH':
      return { ...state, aiSpeech: '', playerSpeech: '' };

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    clearTimer();

    if (state.phase === 'DEALING') {
      timerRef.current = window.setTimeout(() => dispatch({ type: 'DEAL_COMPLETE' }), 1500);
    }
    if (state.phase === 'CUT_STARTER') {
      timerRef.current = window.setTimeout(() => dispatch({ type: 'CUT_COMPLETE' }), 1500);
    }
    if (state.phase === 'PEGGING' && state.pegging.turn === 'ai' && !state.winner) {
      timerRef.current = window.setTimeout(() => dispatch({ type: 'AI_PLAY' }), 800 + Math.random() * 700);
    }

    return clearTimer;
  }, [state.phase, state.pegging.turn, state.pegging.pile.length, state.pegging.count, state.winner, clearTimer]);

  // Clear speech after 3s
  useEffect(() => {
    if (state.aiSpeech || state.playerSpeech) {
      const t = window.setTimeout(() => dispatch({ type: 'CLEAR_SPEECH' }), 3500);
      return () => clearTimeout(t);
    }
  }, [state.aiSpeech, state.playerSpeech]);

  // Trash talk triggers
  useEffect(() => {
    if (state.phase === 'GAME_OVER' && state.winner) {
      const trigger = state.winner === 'ai' ? 'aiWins' : 'playerWins';
      dispatch({ type: 'SET_AI_SPEECH', message: getTrashTalk(trigger) });
    }
  }, [state.phase, state.winner]);

  useEffect(() => {
    if (state.playerScore >= 91 && state.aiScore < 91 && state.aiScore > 0) {
      // Player approaching, AI in skunk territory warning not needed
    } else if (state.aiScore >= 91 && state.playerScore < 61) {
      dispatch({ type: 'SET_AI_SPEECH', message: getTrashTalk('skunkWarning') });
    }
  }, [state.playerScore, state.aiScore]);

  return {
    state,
    newGame: useCallback(() => dispatch({ type: 'NEW_GAME' }), []),
    toggleSelect: useCallback((id: string) => dispatch({ type: 'TOGGLE_SELECT', cardId: id }), []),
    confirmDiscard: useCallback(() => dispatch({ type: 'CONFIRM_DISCARD' }), []),
    playCard: useCallback((id: string) => dispatch({ type: 'PLAY_CARD', cardId: id }), []),
    declareGo: useCallback(() => dispatch({ type: 'DECLARE_GO' }), []),
    advanceShow: useCallback(() => dispatch({ type: 'ADVANCE_SHOW' }), []),
    nextHand: useCallback(() => dispatch({ type: 'NEXT_HAND' }), []),
    dispatch,
  };
}
