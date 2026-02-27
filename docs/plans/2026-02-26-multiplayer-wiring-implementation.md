# Multiplayer Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire up real-time multiplayer so two players on different devices can play a complete cribbage game via Supabase Broadcast.

**Architecture:** Both clients run the game engine locally with full card knowledge. Cards are dealt server-side via the deal-hand Edge Function, then shared between clients via Supabase Broadcast. All game actions (discard, play, go, show advance) are dispatched locally and broadcast to the opponent, keeping both engines in perfect sync.

**Tech Stack:** React 18, TypeScript, Supabase Realtime (Broadcast + Presence), existing Vitest test suite.

**Design doc:** `docs/plans/2026-02-26-multiplayer-wiring-design.md`

---

## Task 1: Fix deal-hand Edge Function

The Edge Function has three issues: card format doesn't match the engine, no starter card, and it returns 409 when called by the second player.

**Files:**
- Modify: `supabase/functions/deal-hand/index.ts`

**Step 1: Fix card format to match engine types**

In the Edge Function, change `RANKS` to use `'10'` instead of `'T'`, and change the card ID format from `${rank}${suit}` to `${rank}-${suit}`.

```typescript
// Before
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;
// ...
deck.push({ rank, suit, id: `${rank}${suit}` });

// After
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
// ...
deck.push({ rank, suit, id: `${rank}-${suit}` });
```

**Step 2: Pick and store the starter card**

After dealing 12 cards (6 per player), pick card index 12 as the starter. Store it in the `hands` table `starter_card` column. Update the hand record after insert:

```typescript
// After dealing cards to players (deck indices 0-11):
const starterCard = deck[humanPlayers.length * 6 + aiPlayers.length * 6];

// Update hand record with starter
await supabaseService
  .from('hands')
  .update({ starter_card: starterCard })
  .eq('id', hand.id);
```

**Step 3: Make idempotent — return existing cards if hand already dealt**

Replace the 409 error with a query that returns the caller's existing cards:

```typescript
if (existingHand) {
  // Hand already dealt — return this player's cards (idempotent)
  const { data: existingCards } = await supabaseService
    .from('hand_cards')
    .select('card')
    .eq('hand_id', existingHand.id)
    .eq('user_id', user.id);

  const { data: handRecord } = await supabaseService
    .from('hands')
    .select('starter_card')
    .eq('id', existingHand.id)
    .single();

  return new Response(JSON.stringify({
    hand_id: existingHand.id,
    your_cards: (existingCards ?? []).map(r => r.card),
    starter_card: handRecord?.starter_card ?? null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
```

**Step 4: Include starter_card in success response**

```typescript
const response = {
  hand_id: hand.id,
  your_cards: yourCards,
  starter_card: starterCard,
};
```

**Step 5: Deploy and verify**

```bash
npx supabase functions deploy deal-hand --no-verify-jwt
```

Verify with curl that the response includes `starter_card` and cards use `10` not `T`.

**Step 6: Commit**

```bash
git add supabase/functions/deal-hand/index.ts
git commit -m "fix(edge): deal-hand returns starter, idempotent, engine-compatible card format"
```

---

## Task 2: Update gameApi.ts dealHand types

**Files:**
- Modify: `src/lib/gameApi.ts`

**Step 1: Update return type**

```typescript
// Before
export async function dealHand(
  gameId: string,
  handNumber: number
): Promise<{ hand_id: string; your_cards: { rank: string; suit: string; id: string }[] }> {

// After
export async function dealHand(
  gameId: string,
  handNumber: number
): Promise<{
  hand_id: string;
  your_cards: { rank: string; suit: string; id: string }[];
  starter_card: { rank: string; suit: string; id: string } | null;
}> {
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS (no callers reference starter_card yet)

**Step 3: Commit**

```bash
git add src/lib/gameApi.ts
git commit -m "chore: update dealHand return type to include starter_card"
```

---

## Task 3: Engine — LOAD_ONLINE_DEAL action

Add a new engine action that sets up a hand from server-provided data instead of local shuffle.

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/gameState.ts`
- Create: `src/engine/__tests__/onlineDeal.test.ts`

**Step 1: Write failing tests**

```typescript
// src/engine/__tests__/onlineDeal.test.ts
import { describe, it, expect } from 'vitest';
import { gameReducer } from '../gameState';
import { createCard } from '../types';
import type { GameState, Card } from '../types';

function makeStartState(scores: [number, number] = [0, 0]): GameState {
  return {
    phase: 'DEALING',
    deck: [],
    players: [
      { hand: [], score: scores[0], pegFront: scores[0], pegBack: 0 },
      { hand: [], score: scores[1], pegFront: scores[1], pegBack: 0 },
    ],
    crib: [],
    starter: null,
    dealerIndex: 0,
    handNumber: 1,
    pegging: {
      count: 0, pile: [], sequence: [],
      currentPlayerIndex: 1,
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

const hand0: Card[] = [
  createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
  createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
];
const hand1: Card[] = [
  createCard('7', 'S'), createCard('8', 'S'), createCard('9', 'S'),
  createCard('10', 'S'), createCard('J', 'S'), createCard('Q', 'S'),
];
const starter = createCard('K', 'D');

describe('LOAD_ONLINE_DEAL', () => {
  it('sets both hands and transitions to DISCARD_TO_CRIB', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.phase).toBe('DISCARD_TO_CRIB');
    expect(result.players[0].hand).toEqual(hand0);
    expect(result.players[1].hand).toEqual(hand1);
  });

  it('sets deck to [starter] so CUT works', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.deck).toEqual([starter]);
    expect(result.starter).toBeNull(); // not revealed until CUT
  });

  it('preserves existing scores across hands', () => {
    const state = makeStartState([45, 32]);
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 1,
      handNumber: 2,
    });
    expect(result.players[0].score).toBe(45);
    expect(result.players[1].score).toBe(32);
    expect(result.dealerIndex).toBe(1);
    expect(result.handNumber).toBe(2);
  });

  it('resets crib, handStats, decisionLog, and pegging', () => {
    const state = makeStartState();
    const result = gameReducer(state, {
      type: 'LOAD_ONLINE_DEAL',
      hands: [hand0, hand1],
      starter,
      dealerIndex: 0,
      handNumber: 1,
    });
    expect(result.crib).toEqual([]);
    expect(result.handStats).toEqual([
      { pegging: 0, hand: 0, crib: 0 },
      { pegging: 0, hand: 0, crib: 0 },
    ]);
    expect(result.decisionLog).toEqual([]);
    expect(result.pegging.count).toBe(0);
    // Non-dealer plays first in pegging
    expect(result.pegging.currentPlayerIndex).toBe(1); // dealer=0, so non-dealer=1
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- src/engine/__tests__/onlineDeal.test.ts
```

Expected: FAIL — `LOAD_ONLINE_DEAL` not recognized by reducer.

**Step 3: Add type to GameAction union**

In `src/engine/types.ts`, add to the `GameAction` union:

```typescript
  | { type: 'LOAD_ONLINE_DEAL'; hands: [Card[], Card[]]; starter: Card; dealerIndex: number; handNumber: number }
```

**Step 4: Implement handler in gameState.ts**

In `gameReducer`, add a new case before the `default`:

```typescript
    case 'LOAD_ONLINE_DEAL':
      return handleLoadOnlineDeal(state, action);
```

Implement the handler:

```typescript
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
```

**Step 5: Run tests to verify they pass**

```bash
npm run test -- src/engine/__tests__/onlineDeal.test.ts
```

Expected: ALL PASS

**Step 6: Run full test suite to check for regressions**

```bash
npm run test
```

Expected: 358+ tests passing, zero failures.

**Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/gameState.ts src/engine/__tests__/onlineDeal.test.ts
git commit -m "feat(engine): add LOAD_ONLINE_DEAL action for multiplayer hands"
```

---

## Task 4: useGame — online mode

Add an `isOnline` option to the `useGame` hook that skips AI auto-play and exposes `dispatchRemoteAction`.

**Files:**
- Modify: `src/hooks/useGame.ts`
- Create: `src/hooks/__tests__/useGameOnline.test.ts`

**Step 1: Write failing tests**

```typescript
// src/hooks/__tests__/useGameOnline.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from '../useGame';
import { createCard } from '@/engine/types';
import type { Card } from '@/engine/types';

const hand0: Card[] = [
  createCard('A', 'H'), createCard('2', 'H'), createCard('3', 'H'),
  createCard('4', 'H'), createCard('5', 'H'), createCard('6', 'H'),
];
const hand1: Card[] = [
  createCard('7', 'S'), createCard('8', 'S'), createCard('9', 'S'),
  createCard('10', 'S'), createCard('J', 'S'), createCard('Q', 'S'),
];
const starter = createCard('K', 'D');

describe('useGame online mode', () => {
  it('exposes dispatchRemoteAction when isOnline is true', () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));
    expect(result.current.dispatchRemoteAction).toBeDefined();
    expect(typeof result.current.dispatchRemoteAction).toBe('function');
  });

  it('does not auto-deal in DEALING phase when isOnline', async () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));

    // Start a new game — enters DEALING phase
    act(() => result.current.newGame());
    expect(result.current.gameState.phase).toBe('DEALING');

    // Wait longer than the 1200ms auto-deal timer
    await new Promise(r => setTimeout(r, 1500));
    // Phase should still be DEALING (not DISCARD_TO_CRIB)
    expect(result.current.gameState.phase).toBe('DEALING');
  });

  it('accepts LOAD_ONLINE_DEAL via dispatchRemoteAction', () => {
    const { result } = renderHook(() => useGame({ isOnline: true }));

    act(() => {
      result.current.dispatchRemoteAction({
        type: 'LOAD_ONLINE_DEAL',
        hands: [hand0, hand1],
        starter,
        dealerIndex: 0,
        handNumber: 1,
      });
    });

    expect(result.current.gameState.phase).toBe('DISCARD_TO_CRIB');
    expect(result.current.gameState.players[0].hand).toEqual(hand0);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm run test -- src/hooks/__tests__/useGameOnline.test.ts
```

Expected: FAIL — useGame doesn't accept options object.

**Step 3: Implement online mode**

In `src/hooks/useGame.ts`:

1. Add options parameter:

```typescript
interface UseGameOptions {
  isOnline?: boolean;
}

export function useGame(options: UseGameOptions = {}): UseGameReturn {
  const { isOnline = false } = options;
```

2. Update `UseGameReturn` to include `dispatchRemoteAction`:

```typescript
export interface UseGameReturn {
  // ... existing fields ...
  /** Dispatch an action from a remote player (online mode only) */
  dispatchRemoteAction: (action: GameAction) => void;
}
```

3. Guard AI effects with `!isOnline`:

In the auto-advance `useEffect`, wrap each AI section:

```typescript
// DEALING → auto-deal (local only)
if (phase === 'DEALING' && !isOnline) {
  timerRef.current = setTimeout(() => dispatch({ type: 'DEAL' }), 1200);
  return clearTimer;
}

// DISCARD_TO_CRIB → AI auto-discards (local only)
if (phase === 'DISCARD_TO_CRIB' && !isOnline) {
  // ... existing AI discard logic ...
}

// CUT_STARTER → auto-cut (BOTH modes — deterministic)
if (phase === 'CUT_STARTER') {
  timerRef.current = setTimeout(() => dispatch({ type: 'CUT' }), 1200);
  return clearTimer;
}

// PEGGING → AI's turn (local only)
if (phase === 'PEGGING' && pegging.currentPlayerIndex === AI_PLAYER && !isOnline && !winner) {
  // ... existing AI pegging logic ...
}
```

4. Add `dispatchRemoteAction`:

```typescript
const dispatchRemoteAction = useCallback(
  (action: GameAction) => { dispatch(action); },
  []
);
```

5. Add `isOnline` to the auto-advance effect's dependency array.

6. Return `dispatchRemoteAction` in the hook's return object.

**Step 4: Run tests to verify they pass**

```bash
npm run test -- src/hooks/__tests__/useGameOnline.test.ts
```

Expected: ALL PASS

**Step 5: Run full test suite**

```bash
npm run test
```

Expected: All existing tests still pass (isOnline defaults to false).

**Step 6: Commit**

```bash
git add src/hooks/useGame.ts src/hooks/__tests__/useGameOnline.test.ts
git commit -m "feat(hooks): add online mode to useGame — skips AI, exposes dispatchRemoteAction"
```

---

## Task 5: Join.tsx — pass GameSummary in navigation state

**Files:**
- Modify: `src/pages/Join.tsx`

**Step 1: Pass game data in navigation state**

Change the `handleJoin` function to pass the full game summary:

```typescript
// Before
await joinGame(code);
navigate('/', { state: { joinedCode: code } });

// After
const gameSummary = await joinGame(code);
navigate('/', { state: { joinedGame: gameSummary } });
```

**Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/pages/Join.tsx
git commit -m "fix(join): pass full GameSummary in navigation state instead of just code"
```

---

## Task 6: GameScreen — online state management + opponent detection

Wire up the online game flow: reading join state, detecting opponent joining, and connecting the Broadcast channel.

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Step 1: Read join state from navigation**

Add `useLocation` import and read online game data:

```typescript
import { useNavigate, useLocation } from 'react-router-dom';

// Inside GameScreen:
const location = useLocation();

// Check if we arrived from /join/:code
useEffect(() => {
  const state = location.state as { joinedGame?: GameSummary } | null;
  if (state?.joinedGame) {
    const { game, players } = state.joinedGame;
    setActiveOnlineGameId(game.id);
    setOnlineStep(null); // clear any menu state
    setGameMode('online');
    setLocalPlayerSeat(1); // joiner is always seat 1
    const opponent = players.find(p => p.user_id !== auth.user?.id);
    setOpponentUserId(opponent?.user_id ?? null);
    // Clear location state to prevent re-triggering on re-render
    window.history.replaceState({}, '');
  }
}, []);
```

**Step 2: Add online state variables**

Add new state to GameScreen (alongside existing `onlineStep`, `pendingGame`, etc.):

```typescript
const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
const [localPlayerSeat, setLocalPlayerSeat] = useState<0 | 1>(0);
const [opponentUserId, setOpponentUserId] = useState<string | null>(null);
```

**Step 3: Pass isOnline to useGame**

```typescript
const { /* ... */, dispatchRemoteAction } = useGame({ isOnline: gameMode === 'online' });
```

**Step 4: Wire useGameChannel**

```typescript
const channel = useGameChannel(
  activeOnlineGameId,
  auth.user?.id ?? null
);
```

**Step 5: Detect opponent joining on "Waiting for Opponent" screen**

Subscribe to `game_players` table changes when in `waiting` step:

```typescript
useEffect(() => {
  if (onlineStep !== 'waiting' || !pendingGame) return;

  const channel = supabase
    .channel(`wait:${pendingGame.gameId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${pendingGame.gameId}`,
      },
      async () => {
        // Opponent joined! Fetch their user_id
        const { data: players } = await supabase
          .from('game_players')
          .select('user_id, seat')
          .eq('game_id', pendingGame.gameId)
          .order('seat');

        if (players && players.length >= 2) {
          const opponent = players.find(p => p.user_id !== auth.user?.id);
          setOpponentUserId(opponent?.user_id ?? null);
          setGameMode('online');
          setLocalPlayerSeat(0); // creator is seat 0
          setOnlineStep(null); // exit waiting screen
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [onlineStep, pendingGame, auth.user?.id]);
```

**Step 6: Run typecheck + lint**

```bash
npm run typecheck && npm run lint
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat(ui): wire online state management and opponent join detection"
```

---

## Task 7: GameScreen — deal coordination

When both players are connected, coordinate the deal via the Edge Function and Broadcast.

**Files:**
- Modify: `src/components/game/GameScreen.tsx`
- Modify: `src/lib/gameApi.ts` (add `getMyCards` helper)

**Step 1: Add online message types**

At the top of GameScreen (or in a shared types file):

```typescript
type OnlineBroadcast =
  | { type: 'deal_complete'; handNumber: number; creatorHand: Card[]; starter: Card; handId: string }
  | { type: 'joiner_ready'; joinerHand: Card[] }
  | { type: 'game_action'; action: GameAction }
  | { type: 'game_complete'; winnerIndex: number };
```

**Step 2: Creator initiates deal when both connected**

Add an effect that triggers when both players are present and the game is in DEALING phase (or GAME_START for the first hand):

```typescript
useEffect(() => {
  if (gameMode !== 'online') return;
  if (localPlayerSeat !== 0) return; // only creator initiates
  if (!channel.isConnected || channel.opponentPresence !== 'online') return;
  if (gameState.phase !== 'GAME_START' && gameState.phase !== 'DEALING') return;

  let cancelled = false;

  const initiateDeal = async () => {
    try {
      const dealResult = await dealHand(activeOnlineGameId!, gameState.handNumber || 1);
      if (cancelled) return;

      const myHand = dealResult.your_cards as Card[];
      const starter = dealResult.starter_card as Card;

      // Broadcast my cards + starter to opponent
      channel.broadcastAction({
        type: 'deal_complete',
        handNumber: gameState.handNumber || 1,
        creatorHand: myHand,
        starter,
        handId: dealResult.hand_id,
      });

      // Store deal data, wait for joiner's cards
      setPendingDealData({ myHand, starter, handId: dealResult.hand_id });
    } catch (e) {
      console.error('Deal failed:', e);
    }
  };

  initiateDeal();
  return () => { cancelled = true; };
}, [gameMode, localPlayerSeat, channel.isConnected, channel.opponentPresence, gameState.phase]);
```

**Step 3: Add pending deal state**

```typescript
interface PendingDealData {
  myHand: Card[];
  starter: Card;
  handId: string;
}
const [pendingDealData, setPendingDealData] = useState<PendingDealData | null>(null);
```

**Step 4: Handle incoming broadcasts**

Register a remote action handler via `channel.onRemoteAction`:

```typescript
useEffect(() => {
  if (gameMode !== 'online') return;

  channel.onRemoteAction((payload: unknown) => {
    const msg = payload as OnlineBroadcast;

    switch (msg.type) {
      case 'deal_complete': {
        // I'm the joiner — creator sent their hand + starter
        // Fetch my own cards from Edge Function
        (async () => {
          const dealResult = await dealHand(activeOnlineGameId!, msg.handNumber);
          const myHand = dealResult.your_cards as Card[];

          // Broadcast my hand back to creator
          channel.broadcastAction({
            type: 'joiner_ready',
            joinerHand: myHand,
          });

          // Both hands known — load into engine
          const hands: [Card[], Card[]] = [msg.creatorHand, myHand]; // seat 0 = creator, seat 1 = joiner
          const dealerIndex = (msg.handNumber - 1) % 2; // alternates each hand
          dispatchRemoteAction({
            type: 'LOAD_ONLINE_DEAL',
            hands,
            starter: msg.starter,
            dealerIndex,
            handNumber: msg.handNumber,
          });
        })();
        break;
      }

      case 'joiner_ready': {
        // I'm the creator — joiner sent their hand
        if (!pendingDealData) return;
        const hands: [Card[], Card[]] = [pendingDealData.myHand, msg.joinerHand]; // seat 0, seat 1
        const dealerIndex = (gameState.handNumber || 1 - 1) % 2;
        dispatchRemoteAction({
          type: 'LOAD_ONLINE_DEAL',
          hands,
          starter: pendingDealData.starter,
          dealerIndex,
          handNumber: gameState.handNumber || 1,
        });
        setPendingDealData(null);
        break;
      }

      case 'game_action': {
        // Remote player performed an engine action
        dispatchRemoteAction(msg.action);
        break;
      }

      case 'game_complete': {
        // Remote detected game over
        break;
      }
    }
  });
}, [gameMode, activeOnlineGameId, pendingDealData, gameState.handNumber]);
```

**Step 5: Run typecheck**

```bash
npm run typecheck
```

Fix any type issues.

**Step 6: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat(multiplayer): deal coordination via Edge Function + Broadcast"
```

---

## Task 8: GameScreen — action broadcasting

Broadcast all local game actions to the opponent so both engines stay in sync.

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Step 1: Create a broadcast wrapper**

Add a helper that dispatches locally and broadcasts:

```typescript
const broadcastGameAction = useCallback(
  (action: GameAction) => {
    if (gameMode === 'online' && channel.isConnected) {
      channel.broadcastAction({ type: 'game_action', action });
    }
  },
  [gameMode, channel.isConnected, channel.broadcastAction]
);
```

**Step 2: Wrap existing action handlers**

Modify the action handlers passed to child components to also broadcast. The key actions that need broadcasting:

- `confirmDiscard` — broadcasts DISCARD action
- `playSelectedCard` — broadcasts PLAY_CARD action
- `declareGo` — broadcasts DECLARE_GO action
- `advanceShow` — broadcasts ADVANCE_SHOW action
- `nextHand` — broadcasts NEXT_HAND action

Create wrapped versions:

```typescript
const handleDiscard = useCallback(() => {
  confirmDiscard();
  if (gameMode === 'online') {
    broadcastGameAction({
      type: 'DISCARD',
      playerIndex: localPlayerSeat,
      cardIds: [...selectedCardIds],
    });
  }
}, [confirmDiscard, gameMode, localPlayerSeat, selectedCardIds, broadcastGameAction]);

const handlePlayCard = useCallback(() => {
  const [cardId] = selectedCardIds;
  playSelectedCard();
  if (gameMode === 'online') {
    broadcastGameAction({
      type: 'PLAY_CARD',
      playerIndex: localPlayerSeat,
      cardId,
    });
  }
}, [playSelectedCard, gameMode, localPlayerSeat, selectedCardIds, broadcastGameAction]);

const handleGo = useCallback(() => {
  declareGo();
  if (gameMode === 'online') {
    broadcastGameAction({
      type: 'DECLARE_GO',
      playerIndex: localPlayerSeat,
    });
  }
}, [declareGo, gameMode, localPlayerSeat, broadcastGameAction]);

const handleAdvanceShow = useCallback(() => {
  advanceShow();
  if (gameMode === 'online') {
    broadcastGameAction({ type: 'ADVANCE_SHOW' });
  }
}, [advanceShow, gameMode, broadcastGameAction]);

const handleNextHand = useCallback(() => {
  nextHand();
  if (gameMode === 'online') {
    broadcastGameAction({ type: 'NEXT_HAND' });
  }
}, [nextHand, gameMode, broadcastGameAction]);
```

**Step 3: Update ActionBar and other component props**

Replace the direct action handlers with the wrapped versions:

```typescript
<ActionBar
  // ...
  onDiscard={handleDiscard}
  onPlay={handlePlayCard}
  onGo={handleGo}
  onAdvance={handleAdvanceShow}
  onNextHand={handleNextHand}
  // ...
/>
```

Also update `HandSummary` onNextHand and `ShowScoring` advance handlers.

**Step 4: Fix humanPlayerIndex for online mode**

Currently hardcoded to `0`. In online mode, the local player's seat determines this:

```typescript
const humanPlayerIndex = gameMode === 'online' ? localPlayerSeat : HUMAN_PLAYER;
```

Update all references from the constant `HUMAN_PLAYER` to `humanPlayerIndex` where the local player's perspective matters (hand display, pegging turn detection, etc.).

**Step 5: Fix pegging turn detection for online mode**

```typescript
const handInteractive =
  phase === 'DISCARD_TO_CRIB' ||
  (phase === 'PEGGING' && pegging.currentPlayerIndex === humanPlayerIndex);
```

**Step 6: Run typecheck + lint**

```bash
npm run typecheck && npm run lint
```

**Step 7: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat(multiplayer): broadcast all game actions to opponent"
```

---

## Task 9: Disconnect overlay + game over handling

**Files:**
- Modify: `src/components/game/GameScreen.tsx`

**Step 1: Add disconnect overlay**

When opponent goes offline during an active game:

```typescript
{gameMode === 'online' && channel.opponentPresence === 'offline' && gameState.phase !== 'GAME_START' && gameState.phase !== 'GAME_OVER' && (
  <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center">
    <div className="text-center px-8">
      <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gold font-black text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
        Opponent Disconnected
      </p>
      <p className="text-cream/40 text-sm mt-2">Waiting for them to reconnect...</p>
      <button
        onClick={() => { setGameMode('local'); setActiveOnlineGameId(null); returnToMenu(); }}
        className="mt-6 px-6 py-2 text-sm border border-white/10 text-cream/50 rounded-lg hover:text-cream/80 transition-colors"
      >
        Leave Game
      </button>
    </div>
  </div>
)}
```

**Step 2: Handle online game over**

When the local engine reaches GAME_OVER in online mode:

```typescript
useEffect(() => {
  if (gameMode !== 'online' || gameState.phase !== 'GAME_OVER' || gameState.winner === null) return;

  // Broadcast game complete
  channel.broadcastAction({ type: 'game_complete', winnerIndex: gameState.winner });

  // Only one client updates the DB (creator)
  if (localPlayerSeat === 0 && activeOnlineGameId) {
    updateGameStatus(activeOnlineGameId, 'complete').catch(console.error);
  }

  // Record stats for the local player
  if (auth.user && !savedRef.current) {
    savedRef.current = true;
    recordGameResult({
      won: gameState.winner === localPlayerSeat,
      playerScore: gameState.players[localPlayerSeat].score,
      opponentScore: gameState.players[(localPlayerSeat + 1) % 2].score,
    }).catch(console.error);
  }
}, [gameState.phase, gameState.winner, gameMode]);
```

**Step 3: Update existing GAME_OVER effect**

Guard the existing save effect to only fire in local mode:

```typescript
useEffect(() => {
  if (gameMode !== 'local') return; // online mode handled separately
  if (phase !== 'GAME_OVER' || winner === null || !auth.user || savedRef.current) return;
  // ... existing local save logic ...
}, [phase, winner, auth.user, player.score, opponent.score, gameMode]);
```

**Step 4: Run typecheck + lint + tests**

```bash
npm run typecheck && npm run lint && npm run test
```

**Step 5: Commit**

```bash
git add src/components/game/GameScreen.tsx
git commit -m "feat(multiplayer): disconnect overlay and online game over handling"
```

---

## Task 10: Full verification

**Step 1: Run complete test suite**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: All passing, zero errors/warnings.

**Step 2: Build check**

```bash
npm run build
```

Expected: Successful production build.

**Step 3: Manual E2E test**

1. Open https://skunkd.vercel.app on Device A
2. Play Online → Create Game → note invite code
3. On Device B, visit https://skunkd.vercel.app/join/{CODE}
4. Verify: Device A exits "Waiting" screen, both enter game
5. Play through discard → pegging → show → hand complete on both devices
6. Verify: Both devices show synchronized game state
7. Test disconnect: close Device B's tab → Device A shows overlay → reopen → reconnects

**Step 4: Deploy**

```bash
git push origin master
```

Triggers Vercel auto-deploy. Edge Function already deployed in Task 1.

**Step 5: Update session state**

Update `.claude/session-state.md` with multiplayer wiring completion status.
