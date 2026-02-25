import React, { useState, useEffect, useReducer, useRef } from 'react';
import { 
  Trophy, User, MessageSquare, X, Search, Sparkles, Lightbulb, Info
} from 'lucide-react';

/* --- 1. CONSTANTS & UTILS --- */

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const VALUES = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 10, Q: 10, K: 10 };
const RANK_ORDER = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13 };

const GAME_STATES = {
  START: 'START',
  DEALING: 'DEALING',
  DISCARD: 'DISCARD',
  CUT: 'CUT',
  PEGGING: 'PEGGING',
  SHOW_PONE: 'SHOW_PONE',
  SHOW_DEALER: 'SHOW_DEALER',
  SHOW_CRIB: 'SHOW_CRIB',
  HAND_COMPLETE: 'HAND_COMPLETE',
  GAME_OVER: 'GAME_OVER'
};

const PERSONAS = [
  { name: "The Shark", style: "a witty, competitive modern card hustler" },
  { name: "Blackbeard", style: "a salty, aggressive pirate who loves gambling" },
  { name: "Sir John", style: "the 17th-century aristocratic inventor of cribbage, posh and condescending" },
  { name: "Grandma", style: "a sweet but secretly ruthless grandmother who offers cookies while destroying you" }
];

// Fallback lines in case API fails or for immediate feedback
const FALLBACK_TRASH_TALK = {
  ai_big_hand: ["Read 'em and weep.", "That's a real hand.", "My cards, your tears."],
  ai_zero: ["Nineteen.", "Building character.", "Tactical zero."],
  player_big_hand: ["Beginner's luck.", "Don't get cocky.", "Even a blind squirrel..."],
  player_zero: ["Ouch.", "Nineteen!", "Rough one."],
  game_won: ["GG. Better luck next time.", "I win again."],
  game_lost: ["You got lucky.", "Rematch?"]
};

// --- GEMINI API HELPER ---

const callGemini = async (prompt) => {
  const apiKey = ""; // Injected at runtime
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { 
    contents: [{ parts: [{ text: prompt }] }] 
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  
  for (let i = 0; i <= delays.length; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      if (i === delays.length) return null; // All retries failed
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- SCORING ENGINE ---

const getCardValue = (card) => VALUES[card.rank];
const getRankOrder = (card) => RANK_ORDER[card.rank];
const getSubsets = (array) => array.reduce((subsets, value) => subsets.concat(subsets.map(set => [value, ...set])), [[]]);

const scoreHand = (hand, starter, isCrib) => {
  const cards = [...hand, starter];
  let points = 0;
  const details = { fifteens: 0, pairs: 0, runs: 0, flush: 0, nobs: 0 };

  // 1. Fifteens
  const subsets = getSubsets(cards);
  subsets.forEach(subset => {
    if (subset.length > 0) {
      const sum = subset.reduce((acc, c) => acc + getCardValue(c), 0);
      if (sum === 15) { points += 2; details.fifteens += 2; }
    }
  });

  // 2. Pairs
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) { points += 2; details.pairs += 2; }
    }
  }

  // 3. Runs
  const sorted = [...cards].sort((a, b) => getRankOrder(a) - getRankOrder(b));
  const rankCounts = {};
  sorted.forEach(c => rankCounts[getRankOrder(c)] = (rankCounts[getRankOrder(c)] || 0) + 1);
  const uniqueRanks = Object.keys(rankCounts).map(Number).sort((a, b) => a - b);

  let bestRunLen = 0;
  let runMultiplier = 1;

  for(let i=0; i<uniqueRanks.length; i++) {
     let len = 1;
     for(let j=i+1; j<uniqueRanks.length; j++) {
        if(uniqueRanks[j] === uniqueRanks[j-1] + 1) len++; else break;
     }
     if(len >= 3 && len > bestRunLen) {
        bestRunLen = len;
        let mult = 1;
        for(let k=0; k<len; k++) mult *= rankCounts[uniqueRanks[i+k]];
        runMultiplier = mult;
     }
  }
  
  if(bestRunLen >= 3) {
      const runPoints = bestRunLen * runMultiplier;
      points += runPoints;
      details.runs = runPoints;
  }

  // 4. Flush
  let flushPoints = 0;
  const suit = hand[0].suit;
  const allHandMatch = hand.every(c => c.suit === suit);
  const starterMatch = starter.suit === suit;

  if (isCrib) {
    if (allHandMatch && starterMatch) flushPoints = 5;
  } else {
    if (allHandMatch) {
      flushPoints = 4;
      if (starterMatch) flushPoints = 5;
    }
  }
  points += flushPoints;
  details.flush = flushPoints;

  // 5. Nobs
  if (hand.some(c => c.rank === 'J' && c.suit === starter.suit)) { points += 1; details.nobs = 1; }

  return { score: points, details };
};

const scorePegging = (playedCards) => {
  if (playedCards.length === 0) return { score: 0, type: '' };
  let points = 0;
  let type = '';
  const currentCard = playedCards[playedCards.length - 1];
  const count = playedCards.reduce((acc, c) => acc + getCardValue(c), 0);

  if (count === 15) { points += 2; type = 'Fifteen'; }
  if (count === 31) { points += 2; type = 'Thirty-one'; }

  let pairCount = 0;
  for (let i = playedCards.length - 2; i >= 0; i--) {
    if (playedCards[i].rank === currentCard.rank) { pairCount++; } else { break; }
  }
  if (pairCount === 1) { points += 2; type = points > 2 ? type + ', Pair' : 'Pair'; }
  if (pairCount === 2) { points += 6; type = 'Pair Royal'; }
  if (pairCount === 3) { points += 12; type = 'Double Pair Royal'; }

  let maxRun = 0;
  for (let len = 3; len <= playedCards.length; len++) {
    const subset = playedCards.slice(-len);
    const sorted = [...subset].sort((a, b) => getRankOrder(a) - getRankOrder(b));
    let isRun = true;
    for (let k = 0; k < sorted.length - 1; k++) {
      if (getRankOrder(sorted[k+1]) !== getRankOrder(sorted[k]) + 1) { isRun = false; break; }
    }
    if (isRun) maxRun = len;
  }
  if (maxRun > 0) { points += maxRun; type = points > maxRun ? type + `, Run of ${maxRun}` : `Run of ${maxRun}`; }

  return { score: points, type };
};

/* --- 2. DECK & AI UTILS --- */

const createDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    });
  });
  return deck;
};

const shuffle = (deck) => {
  let m = deck.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = deck[m];
    deck[m] = deck[i];
    deck[i] = t;
  }
  return deck;
};

const aiDiscardStrategy = (hand, isDealer) => {
  let bestScore = -1;
  let bestIndices = [0, 1];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      const remaining = hand.filter((_, idx) => idx !== i && idx !== j);
      const { score } = scoreHand(remaining, { rank: '5', suit: 's' }, false);
      let heuristic = score;
      const thrown = [hand[i], hand[j]];
      if (isDealer) {
         if (thrown[0].rank === '5' || thrown[1].rank === '5') heuristic += 2;
         if (thrown[0].rank === thrown[1].rank) heuristic += 2;
         if (Math.abs(getRankOrder(thrown[0]) - getRankOrder(thrown[1])) < 2) heuristic += 1; 
      } else {
         if (thrown[0].rank === '5' || thrown[1].rank === '5') heuristic -= 4;
         if (thrown[0].rank === thrown[1].rank) heuristic -= 2;
         if (getCardValue(thrown[0]) + getCardValue(thrown[1]) === 15) heuristic -= 2;
      }
      if (heuristic > bestScore) { bestScore = heuristic; bestIndices = [i, j]; }
    }
  }
  return bestIndices;
};

const aiPlayStrategy = (hand, playedCards, count) => {
  const validCards = hand.filter(c => count + getCardValue(c) <= 31);
  if (validCards.length === 0) return null;
  const scores = validCards.find(c => {
    const nextCount = count + getCardValue(c);
    return nextCount === 15 || nextCount === 31;
  });
  if (scores) return scores;
  if (playedCards.length > 0) {
    const lastRank = playedCards[playedCards.length-1].rank;
    const pair = validCards.find(c => c.rank === lastRank);
    if (pair) return pair;
  }
  const safe = validCards.find(c => {
    const next = count + getCardValue(c);
    return next !== 5 && next !== 21;
  });
  return safe || validCards[0];
};

/* --- 3. COMPONENTS --- */

const Card = ({ card, faceUp, onClick, selected, disabled, small = false, fanned = false, index = 0, total = 0, style={} }) => {
  if (!card) return <div className="w-16 h-24 bg-transparent"></div>;
  const isRed = card.suit === '♥' || card.suit === '♦';
  const rotate = fanned ? (index - (total - 1) / 2) * 6 : 0;
  const translateY = fanned ? Math.abs(index - (total - 1) / 2) * 4 : 0;

  const CardBack = () => (
    <div className="w-full h-full rounded-lg bg-red-900 border-2 border-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-600 to-red-950" />
      <div className="w-full h-full flex items-center justify-center">
         <div className="text-yellow-500/30 text-4xl">⚜</div>
      </div>
    </div>
  );

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative transition-all duration-300 ease-out select-none
        ${small ? 'w-12 h-16 text-xs' : 'w-20 h-28 md:w-24 md:h-36 text-base'}
        ${selected ? '-translate-y-4 shadow-xl ring-2 ring-yellow-400' : 'shadow-md'}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:-translate-y-2'}
        rounded-lg bg-[#f5f0e8]
      `}
      style={{
        transform: `rotate(${rotate}deg) translateY(${translateY}px)`,
        zIndex: index,
        ...style
      }}
    >
      {faceUp ? (
        <div className={`w-full h-full flex flex-col justify-between p-1.5 ${isRed ? 'text-red-700' : 'text-gray-900'}`}>
          <div className="flex flex-col items-center leading-none">
            <span className="font-bold text-lg font-serif">{card.rank}</span>
            <span className="text-lg">{card.suit}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <span className="text-5xl">{card.suit}</span>
          </div>
          <div className="flex flex-col items-center leading-none rotate-180">
            <span className="font-bold text-lg font-serif">{card.rank}</span>
            <span className="text-lg">{card.suit}</span>
          </div>
        </div>
      ) : (
        <CardBack />
      )}
    </div>
  );
};

const RealisticBoard = ({ pScore, aiScore, pPrevScore, aiPrevScore, aiName }) => {
  const scrollRef = useRef(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      const leader = Math.max(pScore, aiScore);
      const scrollPos = (leader * 10) + (Math.floor(leader/5) * 10) - (scrollRef.current.clientWidth / 2) + 50; 
      scrollRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [pScore, aiScore]);

  const holes = [];
  const spacing = 12;
  const groupGap = 16;
  let currentX = 30;
  
  for (let i = 1; i <= 120; i++) {
    holes.push({ i, x: currentX });
    currentX += spacing;
    if (i % 5 === 0) currentX += groupGap;
  }
  const finishX = currentX + 20;
  const totalWidth = finishX + 50;

  const renderPeg = (score, isPlayer) => {
     if (score === 0) return null;
     if (score > 121) score = 121;
     
     let cx;
     if (score === 121) cx = finishX;
     else {
        const groups = Math.floor((score - 1) / 5);
        const rem = (score - 1) % 5;
        cx = 30 + (groups * (5 * spacing + groupGap)) + (rem * spacing);
     }
     
     const cy = isPlayer ? 65 : 25;
     const colorId = isPlayer ? "goldGradient" : "burgundyGradient";
     
     return <circle cx={cx} cy={cy} r={5} fill={`url(#${colorId})`} stroke="rgba(0,0,0,0.5)" strokeWidth="1" className="drop-shadow-lg transition-all duration-700 ease-in-out" />;
  };

  return (
    <div className="w-full bg-[#2a1f14] border-b-4 border-[#1a1510] shadow-2xl relative z-20">
      <div className="flex justify-between px-4 py-2 bg-[#1a1510] text-[#d4a843] font-serif text-sm border-b border-[#3e2b20]">
         <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> YOU: {pScore}</span>
         <span className="opacity-50 tracking-widest text-xs pt-1">THE BOARD</span>
         <span className="flex items-center gap-2">{aiName.toUpperCase()}: {aiScore} <div className="w-3 h-3 rounded-full bg-red-700"></div></span>
      </div>
      
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
      
      <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden hide-scrollbar relative h-24 bg-[#5c4033]">
         <svg width={totalWidth} height="96" className="block">
            <defs>
               <linearGradient id="woodGrain" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#5c4033" />
                  <stop offset="25%" stopColor="#6b4c3b" />
                  <stop offset="50%" stopColor="#5c4033" />
                  <stop offset="75%" stopColor="#4a332a" />
                  <stop offset="100%" stopColor="#5c4033" />
               </linearGradient>
               <radialGradient id="goldGradient">
                  <stop offset="30%" stopColor="#fcd34d" />
                  <stop offset="100%" stopColor="#b45309" />
               </radialGradient>
               <radialGradient id="burgundyGradient">
                  <stop offset="30%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#7f1d1d" />
               </radialGradient>
               <filter id="innerShadow">
                  <feOffset dx="0" dy="1" />
                  <feGaussianBlur stdDeviation="1" result="offset-blur" />
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                  <feFlood floodColor="black" floodOpacity="0.8" result="color" />
                  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                  <feComposite operator="over" in="shadow" in2="SourceGraphic" /> 
               </filter>
               <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.5" />
               </filter>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#woodGrain)" />
            <line x1="0" y1="48" x2={totalWidth} y2="48" stroke="#3e2b20" strokeWidth="1" opacity="0.5" />
            
            {holes.map(h => (
               <g key={h.i}>
                  <circle cx={h.x} cy="25" r="3.5" fill="#1a1510" style={{filter: 'url(#innerShadow)'}} opacity="0.7" />
                  <circle cx={h.x} cy="65" r="3.5" fill="#1a1510" style={{filter: 'url(#innerShadow)'}} opacity="0.7" />
                  {h.i % 5 === 0 && h.i % 10 !== 5 && (
                     <text x={h.x} y="49" fontSize="9" fill="#d4a843" textAnchor="middle" opacity="0.8" fontFamily="serif" fontWeight="bold">{h.i}</text>
                  )}
                  {h.i === 90 && <rect x={h.x + 8} y="5" width="2" height="86" fill="#d4a843" opacity="0.6" />}
                  {h.i === 60 && <rect x={h.x + 8} y="5" width="2" height="86" fill="#d4a843" opacity="0.4" />}
               </g>
            ))}
            
            <circle cx={finishX} cy="45" r="8" fill="#1a1510" style={{filter: 'url(#innerShadow)'}} stroke="#d4a843" strokeWidth="2" />
            <text x={finishX} y="72" fontSize="10" fill="#d4a843" textAnchor="middle" fontWeight="bold">121</text>
            
            {renderPeg(aiPrevScore, false)}
            {renderPeg(pPrevScore, true)}
            {renderPeg(aiScore, false)}
            {renderPeg(pScore, true)}
         </svg>
      </div>
      
      <div className="absolute top-[37px] bottom-0 left-0 w-8 bg-gradient-to-r from-[#2a1f14] to-transparent pointer-events-none"></div>
      <div className="absolute top-[37px] bottom-0 right-0 w-8 bg-gradient-to-l from-[#2a1f14] to-transparent pointer-events-none"></div>
    </div>
  )
};

const TrashTalkBubble = ({ text, onDismiss }) => {
  if (!text) return null;
  return (
    <div className="absolute top-20 right-4 max-w-[200px] z-50 animate-bounce-in cursor-pointer" onClick={onDismiss}>
       <div className="bg-white text-black p-3 rounded-2xl rounded-tr-none shadow-xl border-2 border-gray-800 text-sm font-medium relative">
         {text}
         <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-t-2 border-r-2 border-gray-800 rotate-45 transform translate-y-1/2"></div>
       </div>
    </div>
  );
};

/* --- 4. MAIN APP --- */

const initialState = {
  phase: GAME_STATES.START,
  persona: PERSONAS[0],
  deck: [],
  pHand: [],
  aiHand: [],
  pHandFull: [],
  aiHandFull: [],
  crib: [],
  starter: null,
  pScore: 0,
  pPrevScore: 0,
  aiScore: 0,
  aiPrevScore: 0,
  dealer: 'player', 
  turn: null, 
  peggingCards: [], 
  peggingHistory: [], 
  count: 0,
  message: "Welcome to Cribbage!",
  aiBubble: null,
  playerBubble: null,
  winner: null,
  selectedIndices: [], 
  lastScoring: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PERSONA':
      return { ...state, persona: action.payload };

    case 'INIT_GAME':
      return { ...initialState, persona: state.persona, deck: shuffle(createDeck()), dealer: Math.random() > 0.5 ? 'player' : 'ai' };
    
    case 'SET_PHASE':
      return { ...state, phase: action.payload };

    case 'DEAL':
      const deck = [...state.deck];
      const pHand = deck.splice(0, 6);
      const aiHand = deck.splice(0, 6);
      return { 
        ...state, deck, pHand, aiHand, 
        phase: GAME_STATES.DISCARD,
        message: "Select 2 cards for the Crib",
        crib: [], starter: null, selectedIndices: []
      };

    case 'TOGGLE_SELECT':
      const idx = action.payload;
      const selected = state.selectedIndices.includes(idx)
        ? state.selectedIndices.filter(i => i !== idx)
        : [...state.selectedIndices, idx];
      if (selected.length > 2) return state;
      return { ...state, selectedIndices: selected };

    case 'CONFIRM_DISCARD':
      const pDiscard = state.selectedIndices.map(i => state.pHand[i]);
      const newPHand = state.pHand.filter((_, i) => !state.selectedIndices.includes(i));
      const aiIndices = aiDiscardStrategy(state.aiHand, state.dealer === 'ai');
      const aiDiscard = aiIndices.map(i => state.aiHand[i]);
      const newAiHand = state.aiHand.filter((_, i) => !aiIndices.includes(i));

      return {
        ...state,
        pHand: newPHand,
        aiHand: newAiHand,
        crib: [...pDiscard, ...aiDiscard],
        phase: GAME_STATES.CUT,
        selectedIndices: [],
        message: "Cut the deck"
      };

    case 'CUT_STARTER':
      const cutDeck = [...state.deck];
      const starter = cutDeck.pop();
      let heelsPoints = 0;
      let aiBubble = state.aiBubble;
      
      if (starter.rank === 'J') {
        heelsPoints = 2;
        aiBubble = "Two for his Heels!";
      }

      const dealerIsAi = state.dealer === 'ai';
      const nextAiScore = dealerIsAi ? state.aiScore + heelsPoints : state.aiScore;
      const nextPScore = !dealerIsAi ? state.pScore + heelsPoints : state.pScore;
      
      const nextAiPrev = dealerIsAi && heelsPoints > 0 ? state.aiScore : state.aiPrevScore;
      const nextPPrev = !dealerIsAi && heelsPoints > 0 ? state.pScore : state.pPrevScore;

      return {
        ...state,
        starter,
        aiScore: nextAiScore,
        aiPrevScore: nextAiPrev,
        pScore: nextPScore,
        pPrevScore: nextPPrev,
        aiBubble: heelsPoints > 0 && dealerIsAi ? aiBubble : state.aiBubble,
        phase: GAME_STATES.PEGGING,
        turn: state.dealer === 'ai' ? 'player' : 'ai', 
        count: 0,
        peggingCards: [],
        peggingHistory: [],
        message: heelsPoints > 0 ? "His Heels! +2" : "Play first!",
        lastScoring: heelsPoints > 0 ? { score: 2, type: 'Heels', player: state.dealer } : state.lastScoring
      };

    case 'PLAY_CARD':
      const { card, player } = action.payload;
      const cardVal = getCardValue(card);
      const newCount = state.count + cardVal;
      const newPeggingCards = [...state.peggingCards, card];
      const { score, type } = scorePegging(newPeggingCards);
      
      let pScoreUp = state.pScore;
      let aiScoreUp = state.aiScore;
      let pPrevUp = state.pPrevScore;
      let aiPrevUp = state.aiPrevScore;

      if (score > 0) {
        if (player === 'player') {
           pPrevUp = pScoreUp;
           pScoreUp += score;
        } else {
           aiPrevUp = aiScoreUp;
           aiScoreUp += score;
        }
      }

      const nextPHand = player === 'player' ? state.pHand.filter(c => c !== card) : state.pHand;
      const nextAiHand = player === 'ai' ? state.aiHand.filter(c => c !== card) : state.aiHand;

      let nextTurn = player === 'player' ? 'ai' : 'player';
      let nextCount = newCount;
      let nextPeggingCardsLoc = newPeggingCards;
      let resetMsg = '';

      if (newCount === 31) {
        nextCount = 0;
        nextPeggingCardsLoc = [];
        resetMsg = "Count reset (31)";
      } 
      
      const nextPlayerHand = nextTurn === 'player' ? nextPHand : nextAiHand;
      const canPlay = nextPlayerHand.some(c => nextCount + getCardValue(c) <= 31);
      
      let msg = type ? `${type} (+${score})` : '';

      if (!canPlay && nextCount < 31 && nextCount > 0) {
        const currentPlayerHand = player === 'player' ? nextPHand : nextAiHand;
        const currentCanPlay = currentPlayerHand.some(c => nextCount + getCardValue(c) <= 31);
        
        if (currentCanPlay) {
          nextTurn = player; 
          msg = "Opponent says Go. Play again.";
        } else {
          if (player === 'player') {
             pPrevUp = pScoreUp;
             pScoreUp += 1;
          } else {
             aiPrevUp = aiScoreUp;
             aiScoreUp += 1;
          }
          msg += " (Last Card +1)";
          nextCount = 0;
          nextPeggingCardsLoc = [];
          resetMsg = "Count reset";
          nextTurn = player === 'player' ? 'ai' : 'player'; 
        }
      }

      if (nextPHand.length === 0 && nextAiHand.length === 0) {
          return {
             ...state,
             pHand: nextPHand, aiHand: nextAiHand,
             pScore: pScoreUp, pPrevScore: pPrevUp,
             aiScore: aiScoreUp, aiPrevScore: aiPrevUp,
             peggingCards: nextPeggingCardsLoc,
             peggingHistory: [...state.peggingHistory, { ...card, playedBy: player }],
             count: nextCount,
             phase: GAME_STATES.SHOW_PONE,
             turn: null,
             message: "Pegging Complete. Counting hands..."
          };
      }

      return {
        ...state,
        pHand: nextPHand,
        aiHand: nextAiHand,
        pScore: pScoreUp, pPrevScore: pPrevUp,
        aiScore: aiScoreUp, aiPrevScore: aiPrevUp,
        count: nextCount,
        peggingCards: nextPeggingCardsLoc,
        peggingHistory: [...state.peggingHistory, { ...card, playedBy: player }],
        turn: nextTurn,
        message: msg || resetMsg || (player === 'player' ? `${state.persona.name}'s Turn` : "Your Turn"),
        lastScoring: score > 0 ? { score, type, player } : null
      };

    case 'AI_SAYS_GO':
       const playerCanPlay = state.pHand.some(c => state.count + getCardValue(c) <= 31);
       if (playerCanPlay) {
          return {
             ...state,
             pScore: state.pScore + 1,
             pPrevScore: state.pScore,
             turn: 'player',
             message: `${state.persona.name} says Go (+1)`,
             lastScoring: { score: 1, type: 'Go', player: 'player' }
          };
       } else {
          const lastPlay = state.peggingHistory[state.peggingHistory.length - 1];
          const lastPlayer = lastPlay ? lastPlay.playedBy : 'player';
          const pScoreGo = lastPlayer === 'player' ? state.pScore + 1 : state.pScore;
          const pPrevGo = lastPlayer === 'player' ? state.pScore : state.pPrevScore;
          const aiScoreGo = lastPlayer === 'ai' ? state.aiScore + 1 : state.aiScore;
          const aiPrevGo = lastPlayer === 'ai' ? state.aiScore : state.aiPrevScore;
          
          return {
             ...state,
             pScore: pScoreGo, pPrevScore: pPrevGo,
             aiScore: aiScoreGo, aiPrevScore: aiPrevGo,
             count: 0,
             peggingCards: [],
             turn: lastPlayer === 'player' ? 'ai' : 'player', 
             message: "Count Reset (Last Card)",
             lastScoring: { score: 1, type: 'Last Card', player: lastPlayer }
          };
       }

    case 'RESTORE_HANDS': 
       return { ...state, pHand: state.pHandFull || [], aiHand: state.aiHandFull || [] };

    case 'ADD_SCORE':
       const { points, who, reason } = action.payload || {}; 
       if (!points && points !== 0) return state; 
       
       let trash = null;
       const list = who === 'ai' 
          ? (points >= 12 ? FALLBACK_TRASH_TALK.ai_big_hand : points === 0 ? FALLBACK_TRASH_TALK.ai_zero : null)
          : (points >= 12 ? FALLBACK_TRASH_TALK.player_big_hand : points === 0 ? FALLBACK_TRASH_TALK.player_zero : null);
       
       if (list) trash = list[Math.floor(Math.random() * list.length)];

       return { 
         ...state, 
         pScore: who === 'player' ? state.pScore + points : state.pScore,
         pPrevScore: who === 'player' && points > 0 ? state.pScore : state.pPrevScore,
         aiScore: who === 'ai' ? state.aiScore + points : state.aiScore,
         aiPrevScore: who === 'ai' && points > 0 ? state.aiScore : state.aiPrevScore,
         aiBubble: trash || state.aiBubble,
         lastScoring: { score: points, type: reason, player: who }
       };

    case 'NEXT_HAND':
       if (state.pScore >= 121 || state.aiScore >= 121) return state; 
       return {
         ...state,
         phase: GAME_STATES.DEALING,
         deck: shuffle(createDeck()),
         crib: [],
         starter: null,
         peggingHistory: [],
         peggingCards: [],
         count: 0,
         dealer: state.dealer === 'player' ? 'ai' : 'player',
         message: "New Deal",
         aiBubble: null,
         playerBubble: null,
         lastScoring: null
       };

    case 'SET_FULL_HANDS':
       return { ...state, pHandFull: action.p, aiHandFull: action.a };
       
    case 'GAME_OVER':
       return { 
          ...state, 
          phase: GAME_STATES.GAME_OVER, 
          winner: action.winner,
          aiBubble: null 
       };

    case 'SET_BUBBLE':
        return { ...state, [action.target]: action.text };

    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hint, setHint] = useState(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [matchRecap, setMatchRecap] = useState(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);
  const [explanationText, setExplanationText] = useState(null);
  const [isExplainLoading, setIsExplainLoading] = useState(false);

  // --- GAME LOGIC EFFECTS ---

  useEffect(() => {
    if (state.phase !== GAME_STATES.GAME_OVER) {
      if (state.pScore >= 121) dispatch({ type: 'GAME_OVER', winner: 'player' });
      else if (state.aiScore >= 121) dispatch({ type: 'GAME_OVER', winner: 'ai' });
    }
  }, [state.pScore, state.aiScore, state.phase]);

  // LLM FEATURE: Dynamic Trash Talk Trigger
  useEffect(() => {
    if (state.lastScoring) {
      const { score, type, player } = state.lastScoring;
      const isSignificant = score >= 4 || type === 'Heels' || type === 'Nobs' || Math.random() < 0.2;
      
      if (isSignificant) {
         const prompt = `
            You are '${state.persona.name}', ${state.persona.style}. 
            The user is your cribbage opponent. 
            Current Score - You: ${state.aiScore}, User: ${state.pScore}.
            Event: ${player === 'ai' ? 'You' : 'User'} just scored ${score} points for ${type}.
            Generate a short, punchy, PG-13 taunt or reaction (max 12 words). 
            If you scored, brag. If user scored, be salty or dismissive. Use 1 emoji.
         `;
         callGemini(prompt).then(text => {
            if (text) dispatch({ type: 'SET_BUBBLE', target: 'aiBubble', text: text.trim() });
         });
      }
    }
  }, [state.lastScoring, state.persona]);

  // LLM FEATURE: Match Recap Trigger
  useEffect(() => {
    if (state.phase === GAME_STATES.GAME_OVER && !matchRecap && !isRecapLoading) {
       setIsRecapLoading(true);
       const winner = state.winner === 'player' ? 'The User' : state.persona.name;
       const loser = state.winner === 'player' ? state.persona.name : 'The User';
       const prompt = `
          Write a 2-sentence energetic sports commentary summary of a Cribbage game where ${winner} defeated ${loser} ${Math.max(state.pScore, state.aiScore)} to ${Math.min(state.pScore, state.aiScore)}. 
          Mention "${state.persona.name}" (the AI) explicitly. Style: 1920s radio announcer.
       `;
       callGemini(prompt).then(text => {
          setMatchRecap(text);
          setIsRecapLoading(false);
       });
    }
  }, [state.phase, state.persona]);

  useEffect(() => {
    if (state.phase === GAME_STATES.DEALING) {
      setTimeout(() => { dispatch({ type: 'DEAL' }); }, 1000);
    }
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === GAME_STATES.DISCARD && (!state.pHandFull || state.pHandFull.length === 0)) {
       dispatch({ type: 'SET_FULL_HANDS', p: [...state.pHand], a: [...state.aiHand] });
    }
  }, [state.phase, state.pHand]);

  useEffect(() => {
    if (state.phase === GAME_STATES.PEGGING && state.turn === 'ai') {
      const timer = setTimeout(() => {
        const cardToPlay = aiPlayStrategy(state.aiHand, state.peggingCards, state.count);
        if (cardToPlay) {
          dispatch({ type: 'PLAY_CARD', payload: { card: cardToPlay, player: 'ai' } });
        } else {
          dispatch({ type: 'AI_SAYS_GO' });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.turn, state.count]);

  useEffect(() => {
    if (state.phase === GAME_STATES.SHOW_PONE) {
       dispatch({ type: 'RESTORE_HANDS' });
    }
  }, [state.phase]);

  // --- HANDLERS ---

  const handleStart = () => {
    dispatch({ type: 'INIT_GAME' });
    setTimeout(() => dispatch({ type: 'SET_PHASE', payload: GAME_STATES.DEALING }), 500);
  };

  const handleCardClick = (index) => {
    if (state.phase === GAME_STATES.DISCARD) {
      dispatch({ type: 'TOGGLE_SELECT', payload: index });
    } else if (state.phase === GAME_STATES.PEGGING && state.turn === 'player') {
      const card = state.pHand[index];
      if (state.count + getCardValue(card) <= 31) {
        dispatch({ type: 'PLAY_CARD', payload: { card, player: 'player' } });
      }
    }
  };

  const handleDiscardConfirm = () => {
    if (state.selectedIndices.length === 2) {
      setHint(null); 
      dispatch({ type: 'CONFIRM_DISCARD' });
    }
  };

  const handleCut = () => dispatch({ type: 'CUT_STARTER' });

  const handlePlayerGo = () => {
     const canPlay = state.pHand.some(c => state.count + getCardValue(c) <= 31);
     if (canPlay) {
        dispatch({ type: 'SET_BUBBLE', target: 'aiBubble', text: "You can play! Don't cheat." });
        setTimeout(() => dispatch({ type: 'SET_BUBBLE', target: 'aiBubble', text: null }), 2000);
        return;
     }
     dispatch({ type: 'ADD_SCORE', payload: { points: 1, who: 'ai', reason: 'Go' } });
     dispatch({ type: 'SET_BUBBLE', target: 'playerBubble', text: "Go." });
     dispatch({ type: 'AI_SAYS_GO' }); 
  };
  
  // LLM FEATURE: Hint System
  const handleAskHint = async () => {
    if (isHintLoading) return;
    setIsHintLoading(true);
    const handStr = state.pHand.map(c => `${c.rank}${c.suit}`).join(', ');
    const isMyCrib = state.dealer === 'player';
    const prompt = `
      You are a Cribbage Grandmaster, answering in the persona of "${state.persona.name}", ${state.persona.style}. 
      My hand is: ${handStr}. 
      It is ${isMyCrib ? "MY" : "OPPONENT'S"} crib.
      Which 2 cards should I discard to the crib to maximize my advantage? 
      Return ONLY your reasoning in 1 punchy sentence, followed by "Discard: [Card1], [Card2]".
    `;
    
    const advice = await callGemini(prompt);
    setHint(advice || `${state.persona.name} is silent. Follow your gut.`);
    setIsHintLoading(false);
  };

  // LLM FEATURE: Explain Score System
  const handleExplainScore = async () => {
    if (isExplainLoading || !state.lastScoring) return;
    setIsExplainLoading(true);

    const isPone = state.phase === GAME_STATES.SHOW_PONE;
    const isDealer = state.phase === GAME_STATES.SHOW_DEALER;
    const isCrib = state.phase === GAME_STATES.SHOW_CRIB;
       
    let handToScore = [];
    if (isCrib) handToScore = state.crib;
    else if (isPone) handToScore = state.dealer === 'ai' ? state.pHandFull : state.aiHandFull;
    else if (isDealer) handToScore = state.dealer === 'player' ? state.pHandFull : state.aiHandFull;

    const handStr = handToScore.map(c => `${c.rank}${c.suit}`).join(', ');
    const prompt = `
      Act as a helpful Cribbage Coach. I just scored ${state.lastScoring.score} points. 
      My 4 cards were: ${handStr}. 
      The starter cut card was: ${state.starter?.rank}${state.starter?.suit}.
      Explain step-by-step how these 5 cards add up to exactly ${state.lastScoring.score} points. 
      Mention combinations like Fifteens, Pairs, Runs, Flushes, or Nobs if applicable.
      Keep it brief, friendly, and output as a short bulleted list. 
    `;

    const explanation = await callGemini(prompt);
    setExplanationText(explanation || "The math is a bit too complex for me right now!");
    setIsExplainLoading(false);
  };

  const advanceShow = () => {
     setExplanationText(null); // Clear previous explanation
     const pone = state.dealer === 'player' ? 'ai' : 'player';
     
     if (state.phase === GAME_STATES.SHOW_PONE) {
        const hand = pone === 'player' ? state.pHandFull : state.aiHandFull;
        const res = scoreHand(hand, state.starter, false);
        dispatch({ type: 'ADD_SCORE', payload: { points: res.score, who: pone, reason: 'Hand' } });
        dispatch({ type: 'SET_PHASE', payload: GAME_STATES.SHOW_DEALER });
     } else if (state.phase === GAME_STATES.SHOW_DEALER) {
        const dealer = state.dealer;
        const hand = dealer === 'player' ? state.pHandFull : state.aiHandFull;
        const res = scoreHand(hand, state.starter, false);
        dispatch({ type: 'ADD_SCORE', payload: { points: res.score, who: dealer, reason: 'Hand' } });
        dispatch({ type: 'SET_PHASE', payload: GAME_STATES.SHOW_CRIB });
     } else if (state.phase === GAME_STATES.SHOW_CRIB) {
        const dealer = state.dealer;
        const res = scoreHand(state.crib, state.starter, true);
        dispatch({ type: 'ADD_SCORE', payload: { points: res.score, who: dealer, reason: 'Crib' } });
        dispatch({ type: 'SET_PHASE', payload: GAME_STATES.HAND_COMPLETE });
     } else if (state.phase === GAME_STATES.HAND_COMPLETE) {
        dispatch({ type: 'NEXT_HAND' });
     }
  };

  const renderCard = (card, i, isPlayer, total) => {
    const isSelected = isPlayer && state.selectedIndices.includes(i);
    const canPlay = isPlayer && state.phase === GAME_STATES.PEGGING && state.turn === 'player' && (state.count + getCardValue(card) <= 31);
    const disabled = isPlayer && state.phase === GAME_STATES.PEGGING && !canPlay;
    const faceUp = isPlayer || state.phase.includes('SHOW') || state.phase === GAME_STATES.GAME_OVER;
                   
    return (
      <Card key={card.id || i} card={card} index={i} total={total} faceUp={faceUp} selected={isSelected} disabled={disabled} fanned={true} onClick={() => handleCardClick(i)} />
    );
  };

  return (
    <div className="w-full h-screen bg-[#0d3318] overflow-hidden flex flex-col font-sans select-none relative">
      <RealisticBoard pScore={state.pScore} aiScore={state.aiScore} pPrevScore={state.pPrevScore} aiPrevScore={state.aiPrevScore} aiName={state.persona.name} />
      
      {/* LLM FEATURE: Explanation Modal */}
      {explanationText && (
        <div className="absolute top-16 left-4 right-4 z-50 bg-[#2a1f14]/95 text-[#f5f0e8] p-4 rounded-xl border border-[#d4a843] shadow-2xl animate-fade-in max-h-64 overflow-y-auto">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-[#d4a843] flex items-center gap-1"><Info size={18} /> Cribbage Coach</h4>
            <button onClick={() => setExplanationText(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="text-sm space-y-2 whitespace-pre-wrap">{explanationText}</div>
        </div>
      )}

      <div className="flex-1 relative flex flex-col justify-between p-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a5c2a] to-[#0d3318]">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")` }}></div>
        
        {/* TOP: AI */}
        {state.phase !== GAME_STATES.START && (
          <div className="relative z-10 flex justify-center items-start pt-2">
             <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#2a1f14] border-2 border-[#d4a843] flex items-center justify-center overflow-hidden shadow-lg">
                    <User size={32} className="text-[#d4a843]" />
                  </div>
                  {state.dealer === 'ai' && <div className="absolute -bottom-2 -right-2 bg-black text-white text-xs px-2 py-0.5 rounded-full border border-gold">DEALER</div>}
                </div>
                <span className="text-[#b8956a] font-bold text-sm bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">{state.persona.name}</span>
                <div className="flex -space-x-4 h-16 mt-2">
                  {state.aiHand.map((c, i) => (
                    <div key={i} className="w-10 h-14 bg-red-900 rounded border border-white/50 shadow-md transform" style={{ transform: `rotate(${(i-2)*5}deg)` }}></div>
                  ))}
                </div>
             </div>
             <TrashTalkBubble text={state.aiBubble} onDismiss={() => dispatch({ type: 'SET_BUBBLE', target: 'aiBubble', text: null })} />
          </div>
        )}

        {/* CENTER: PLAY AREA */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4">
           {state.phase === GAME_STATES.START && (
              <div className="flex flex-col items-center gap-6 bg-[#2a1f14]/80 p-6 rounded-2xl border border-[#d4a843]">
                 <h2 className="text-[#d4a843] font-serif text-2xl mb-2 flex items-center gap-2">✨ Choose Opponent ✨</h2>
                 <div className="flex gap-3 flex-wrap justify-center max-w-sm">
                   {PERSONAS.map(p => (
                     <button 
                       key={p.name}
                       onClick={() => dispatch({ type: 'SET_PERSONA', payload: p })}
                       className={`px-4 py-2 rounded-lg font-bold transition-all ${state.persona.name === p.name ? 'bg-[#d4a843] text-black shadow-lg scale-105' : 'bg-[#1a1510] text-[#b8956a] border border-[#3e2b20] hover:border-[#d4a843]'}`}
                     >
                       {p.name}
                     </button>
                   ))}
                 </div>
                 <p className="text-sm text-[#f5f0e8] text-center italic mt-2">"{state.persona.style}"</p>
              </div>
           )}

           {state.phase === GAME_STATES.DISCARD && hint && (
              <div className="absolute top-0 left-0 right-0 z-20 flex justify-center animate-fade-in">
                 <div className="bg-[#2a1f14]/95 border border-[#d4a843] text-[#f5f0e8] p-3 rounded-lg shadow-2xl max-w-xs text-sm text-center">
                    <Sparkles className="inline-block text-[#d4a843] mr-1" size={14} /> 
                    {hint}
                 </div>
              </div>
           )}

           {state.phase !== GAME_STATES.START && (
             <div className="mb-4 text-[#d4a843] font-serif text-lg animate-pulse drop-shadow-md text-center px-4 flex flex-col items-center">
                {state.message}
                {state.lastScoring && (
                   <div className="text-white text-sm font-sans mt-1 bg-black/40 px-3 py-1 rounded-full inline-block animate-bounce">
                      {state.lastScoring.player === 'player' ? 'You' : state.persona.name} scored {state.lastScoring.score} ({state.lastScoring.type})
                   </div>
                )}
             </div>
           )}

           {state.phase !== GAME_STATES.START && (
             <div className="flex items-center gap-4 w-full justify-center px-2">
                <div className="flex gap-2">
                   <div className="w-20 h-28 bg-red-900 rounded-lg border-2 border-white shadow-xl relative">
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-4xl font-serif">🂠</div>
                   </div>
                   {state.starter ? <Card card={state.starter} faceUp={true} /> : <div className="w-20 h-28 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center"><span className="text-white/20 text-xs text-center px-2">CUT CARD</span></div>}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[160px]">
                   {state.phase === GAME_STATES.PEGGING && (
                      <div className="relative w-full flex justify-center items-center">
                         <div className="absolute text-6xl font-bold text-white/10 select-none z-0">{state.count}</div>
                         <div className="flex -space-x-12 z-10 pl-12">
                            {state.peggingCards.map((c, i) => (
                               <Card key={i} card={c} faceUp={true} style={{ transform: `rotate(${(i%2 === 0 ? -5 : 5)}deg)` }} />
                            ))}
                         </div>
                      </div>
                   )}
                   {state.phase.includes('SHOW') && (
                      <div className="text-white text-center flex flex-col items-center">
                         <h3 className="text-xl font-serif text-[#d4a843]">
                            {state.phase === GAME_STATES.SHOW_PONE ? (state.dealer === 'player' ? `${state.persona.name}'s Hand` : "Your Hand") :
                             state.phase === GAME_STATES.SHOW_DEALER ? (state.dealer === 'player' ? "Your Hand" : `${state.persona.name}'s Hand`) : "The Crib"}
                         </h3>
                         <div className="flex -space-x-2 mt-2 justify-center">
                            {(state.phase === GAME_STATES.SHOW_CRIB ? state.crib : 
                              (state.phase === GAME_STATES.SHOW_PONE && state.dealer === 'ai' ? state.pHandFull : 
                               state.phase === GAME_STATES.SHOW_PONE && state.dealer === 'player' ? state.aiHandFull :
                               state.phase === GAME_STATES.SHOW_DEALER && state.dealer === 'player' ? state.pHandFull : state.aiHandFull
                              )
                            )?.map((c, i) => <Card key={i} card={c} faceUp={true} small />)}
                         </div>
                         
                         <div className="flex gap-2 mt-4">
                           <button onClick={advanceShow} className="bg-[#d4a843] text-[#2a1f14] px-6 py-2 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">Next</button>
                           {/* LLM FEATURE BUTTON */}
                           <button onClick={handleExplainScore} disabled={isExplainLoading || !state.lastScoring || state.lastScoring.score === 0} className="bg-[#2a1f14] text-[#d4a843] border border-[#d4a843] px-3 py-2 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:grayscale transition-transform flex items-center gap-1">
                              {isExplainLoading ? "..." : "✨ Explain Score"}
                           </button>
                         </div>
                      </div>
                   )}
                </div>

                <div className="w-20 h-28 bg-[#1a1510]/50 rounded-lg border border-white/10 flex items-center justify-center relative">
                   {state.crib.length > 0 && (
                      <div className="absolute inset-0">
                         <div className="w-full h-full bg-red-900 rounded-lg border border-white shadow-lg rotate-3"></div>
                         <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-white/50 font-bold drop-shadow-md">CRIB</div>
                      </div>
                   )}
                   {state.crib.length === 0 && <span className="text-white/20 text-xs">CRIB</span>}
                </div>
             </div>
           )}
        </div>

        {/* BOTTOM: PLAYER */}
        <div className="relative z-10 pb-6">
           <div className="flex justify-center items-end gap-2 h-40 relative">
              {state.pHand.map((c, i) => renderCard(c, i, true, state.pHand.length))}
           </div>
           
           <div className="flex justify-between items-center px-4 mt-2 h-12">
              <div className="flex items-center gap-2">
                 {state.dealer === 'player' && <div className="bg-black text-white text-xs px-2 py-0.5 rounded-full border border-gold">DEALER</div>}
                 <span className="text-[#f5f0e8] font-bold">YOU</span>
              </div>

              <div className="flex gap-2">
                 {state.phase === GAME_STATES.START && (
                    <button onClick={handleStart} className="bg-[#d4a843] text-black px-8 py-3 rounded-full font-bold shadow-xl animate-pulse text-lg border-2 border-[#fff]">DEAL CARDS</button>
                 )}
                 {state.phase === GAME_STATES.DISCARD && (
                    <>
                       <button 
                         onClick={handleAskHint} 
                         disabled={isHintLoading}
                         className="bg-[#2a1f14] text-[#d4a843] border border-[#d4a843] px-3 py-2 rounded-lg font-bold shadow-lg flex items-center gap-1 disabled:opacity-50"
                       >
                         {isHintLoading ? "..." : <><Sparkles size={16} /> Hint</>}
                       </button>
                       <button onClick={handleDiscardConfirm} disabled={state.selectedIndices.length !== 2} className="bg-[#d4a843] disabled:opacity-50 disabled:grayscale text-black px-4 py-2 rounded-lg font-bold shadow-lg transition-all">Send to Crib</button>
                    </>
                 )}
                 {state.phase === GAME_STATES.CUT && (
                    <button onClick={handleCut} className="bg-[#d4a843] text-black px-4 py-2 rounded-lg font-bold shadow-lg animate-bounce">Cut Deck</button>
                 )}
                 {state.phase === GAME_STATES.PEGGING && state.turn === 'player' && (
                    <button onClick={handlePlayerGo} className={`bg-[#8b1a1a] text-white px-4 py-2 rounded-lg font-bold shadow-lg ${state.pHand.every(c => state.count + getCardValue(c) > 31) ? 'animate-pulse' : 'opacity-50'}`}>GO</button>
                 )}
              </div>
           </div>
        </div>
      </div>
      
      {state.phase === GAME_STATES.GAME_OVER && (
         <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fade-in p-8 text-center">
            <Trophy size={64} className="text-[#d4a843] mb-4 animate-bounce" />
            <h1 className="text-4xl font-serif text-[#f5f0e8] mb-2">{state.winner === 'player' ? 'VICTORY!' : 'DEFEAT'}</h1>
            <p className="text-[#b8956a] mb-8 text-xl">{state.winner === 'player' ? `You Pegged ${state.persona.name}!` : `You Got Pegged by ${state.persona.name}!`}</p>
            
            {matchRecap ? (
               <div className="bg-[#2a1f14] p-4 rounded-lg border border-[#d4a843] max-w-md mb-8 text-[#f5f0e8] font-serif italic text-sm">
                  <Sparkles className="inline text-[#d4a843] mb-1 mr-1" size={14} />
                  "{matchRecap}"
               </div>
            ) : isRecapLoading ? (
               <div className="text-[#b8956a] mb-8 animate-pulse text-sm">Generating match recap from the press box...</div>
            ) : null}

            <div className="flex gap-8 text-2xl font-mono text-white mb-8">
               <div className="flex flex-col items-center"><span className="text-xs text-gray-500">YOU</span><span className="text-[#d4a843]">{state.pScore}</span></div>
               <div className="flex flex-col items-center"><span className="text-xs text-gray-500">{state.persona.name.toUpperCase()}</span><span className="text-red-500">{state.aiScore}</span></div>
            </div>
            <button onClick={() => dispatch({ type: 'INIT_GAME' })} className="bg-[#d4a843] text-black text-xl px-8 py-3 rounded-full font-bold shadow-xl hover:scale-105 transition-transform">Play Again</button>
         </div>
      )}
    </div>
  );
}