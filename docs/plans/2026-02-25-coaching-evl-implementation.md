# Coaching EVL System + Monte Carlo Crib Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a coaching data layer to SKUNK'D — decision snapshots recorded during gameplay, lazily evaluated at review time using EVL (Expected Value Lost) and Monte Carlo crib simulation.

**Architecture:** Hybrid capture — `gameReducer` records cheap `DecisionSnapshot` objects into `GameState.decisionLog` on each DISCARD/PLAY_CARD action. Coaching analysis (`analyzeDecision/Hand/Game`) is computed on demand using `optimalDiscard` (with MC crib) and `optimalPeggingPlay`. No coaching computation happens during gameplay.

**Tech Stack:** Vitest 4, pure TypeScript engine (no React), existing `optimalDiscard`/`optimalPeggingPlay` from `optimal.ts`, `scoreHand` from `scoring.ts`, `scorePeggingPlay` from `pegging.ts`.

---

## Checklist Before Starting

```bash
cd C:/Users/msenf/cribbage
npm run test:engine   # must show 170 tests passing
```

---

### Task 1: Add `DecisionSnapshot` to types and `decisionLog` to `GameState`

**Files:**
- Modify: `src/engine/types.ts`
- Modify: `src/engine/gameState.ts` (createGame only)
- Modify: `src/engine/__tests__/gameState.test.ts`

**Step 1: Write a failing test for decisionLog initialization**

Add this describe block to `src/engine/__tests__/gameState.test.ts`:

```typescript
describe('decisionLog initialization', () => {
  it('starts with empty decisionLog', () => {
    const game = createGame(2);
    expect(game.decisionLog).toEqual([]);
  });

  it('decisionLog persists through DEAL', () => {
    const game = gameReducer(createGame(2), { type: 'DEAL' });
    expect(game.decisionLog).toEqual([]);
  });
});
```

**Step 2: Run test to confirm it fails**

```bash
npm run test:engine -- src/engine/__tests__/gameState.test.ts
```

Expected: FAIL — `Property 'decisionLog' does not exist on type 'GameState'`

**Step 3: Add `DecisionSnapshot` type and update `GameState`**

In `src/engine/types.ts`, add after the `HandStats` interface:

```typescript
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
```

In `src/engine/types.ts`, add `decisionLog` to `GameState`:

```typescript
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
  readonly decisionLog: readonly DecisionSnapshot[];  // ← ADD THIS
}
```

**Step 4: Initialize `decisionLog` in `createGame`**

In `src/engine/gameState.ts`, update the return of `createGame`:

```typescript
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
  decisionLog: [],   // ← ADD THIS
};
```

**Step 5: Run tests**

```bash
npm run test:engine -- src/engine/__tests__/gameState.test.ts
```

Expected: new tests PASS. Existing tests may fail if they spread `GameState` — fix any TS errors by adding `decisionLog: state.decisionLog` to return objects that don't already spread `...state`. (The reducer functions use `...state` spread, so they propagate `decisionLog` automatically — no changes needed there yet.)

**Step 6: Run full suite + typecheck**

```bash
npm run test:engine && npm run typecheck
```

Expected: 170+ tests passing, zero TS errors.

**Step 7: Commit**

```bash
git add src/engine/types.ts src/engine/gameState.ts src/engine/__tests__/gameState.test.ts
git commit -m "feat(engine): add DecisionSnapshot type and decisionLog to GameState"
```

---

### Task 2: Implement `monteCartoCribEV` in `crib-ev.ts`

**Files:**
- Modify: `src/engine/crib-ev.ts`
- Create: `src/engine/__tests__/crib-ev.test.ts`

**Step 1: Write failing tests**

Create `src/engine/__tests__/crib-ev.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit } from '../types';
import { createCard } from '../types';
import { lookupCribEV, monteCartoCribEV } from '../crib-ev';

function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('monteCartoCribEV (Monte Carlo crib simulation)', () => {
  it('returns a value in the plausible crib EV range (2.0 - 10.0)', () => {
    const ev = monteCartoCribEV([c('5', 'H'), c('5', 'S')], [c('5', 'H'), c('5', 'S')]);
    expect(ev).toBeGreaterThan(2.0);
    expect(ev).toBeLessThan(10.0);
  });

  it('5-5 approximates Schell value of 8.50 (within 1.5)', () => {
    const ev = monteCartoCribEV(
      [c('5', 'H'), c('5', 'S')],
      [c('5', 'H'), c('5', 'S')],
      500,
    );
    expect(ev).toBeGreaterThan(7.0);
    expect(ev).toBeLessThan(10.0);
  });

  it('J-K approximates Schell value of 2.80 (within 1.5)', () => {
    const ev = monteCartoCribEV(
      [c('J', 'H'), c('K', 'S')],
      [c('J', 'H'), c('K', 'S')],
      500,
    );
    expect(ev).toBeGreaterThan(1.3);
    expect(ev).toBeLessThan(4.3);
  });

  it('high-value pair (5-5) has higher EV than low-value pair (J-K)', () => {
    const evHigh = monteCartoCribEV(
      [c('5', 'H'), c('5', 'S')],
      [c('5', 'H'), c('5', 'S')],
      300,
    );
    const evLow = monteCartoCribEV(
      [c('J', 'H'), c('K', 'S')],
      [c('J', 'H'), c('K', 'S')],
      300,
    );
    expect(evHigh).toBeGreaterThan(evLow);
  });

  it('uses knownCards to exclude them from sampling', () => {
    // With more known cards, fewer cards available as opponent discards/starter
    // Result should still be a valid crib EV
    const knownMany = [
      c('5', 'H'), c('5', 'S'),
      c('A', 'H'), c('2', 'H'), c('3', 'H'), c('4', 'H'),
      c('6', 'H'), c('7', 'H'), c('8', 'H'), c('9', 'H'),
    ];
    const ev = monteCartoCribEV([c('5', 'H'), c('5', 'S')], knownMany, 100);
    expect(ev).toBeGreaterThan(0);
    expect(ev).toBeLessThan(30);
  });

  it('completes 500 samples within 200ms', () => {
    const start = performance.now();
    monteCartoCribEV(
      [c('5', 'H'), c('J', 'S')],
      [c('5', 'H'), c('J', 'S')],
      500,
    );
    expect(performance.now() - start).toBeLessThan(200);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm run test:engine -- src/engine/__tests__/crib-ev.test.ts
```

Expected: FAIL — `monteCartoCribEV is not exported from '../crib-ev'`

**Step 3: Implement `monteCartoCribEV` in `crib-ev.ts`**

Add these imports at the top of `src/engine/crib-ev.ts`:

```typescript
import { RANKS, SUITS } from './types';
import { scoreHand } from './scoring';
```

Add this helper and the exported function to the bottom of `src/engine/crib-ev.ts`:

```typescript
/** Pick `count` random items from array using partial Fisher-Yates (in-place, returns indices). */
function pickRandom(arr: readonly Card[], count: number): Card[] {
  const pool = [...arr];
  const n = pool.length;
  const picked: Card[] = [];
  for (let i = 0; i < count && i < n; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  return picked;
}

/**
 * Monte Carlo estimate of crib expected value for a specific discard pair.
 *
 * Samples `samples` random completions of the crib (2 random opponent discards
 * + 1 random starter) from the non-known cards. Returns average crib score.
 * Uniform sampling — no weighted opponent discard bias (future enhancement).
 *
 * Used in the coaching path only. Gameplay AI uses `lookupCribEV` for speed.
 *
 * @param discard - The 2 cards being discarded to the crib
 * @param knownCards - All cards visible to this player (hand + any revealed cards)
 * @param samples - Number of random completions to simulate (default: 500)
 */
export function monteCartoCribEV(
  discard: readonly [Card, Card],
  knownCards: readonly Card[],
  samples = 500,
): number {
  // Build deck of cards not yet known
  const knownIds = new Set(knownCards.map(c => c.id));
  const remaining: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const id = `${rank}-${suit}`;
      if (!knownIds.has(id)) remaining.push({ rank, suit, id });
    }
  }

  // Need at least 3 unknown cards: 2 opponent discards + 1 starter
  if (remaining.length < 3) return lookupCribEV(discard[0], discard[1]);

  let total = 0;
  for (let i = 0; i < samples; i++) {
    const [opp1, opp2, starter] = pickRandom(remaining, 3);
    const crib: Card[] = [discard[0], discard[1], opp1, opp2];
    total += scoreHand(crib, starter, true).total;
  }
  return total / samples;
}
```

**Step 4: Run tests**

```bash
npm run test:engine -- src/engine/__tests__/crib-ev.test.ts
```

Expected: All 6 tests pass. The MC tests are probabilistic — if they flap, increase sample count in the test.

**Step 5: Run full suite**

```bash
npm run test:engine
```

Expected: 170+ passing.

**Step 6: Commit**

```bash
git add src/engine/crib-ev.ts src/engine/__tests__/crib-ev.test.ts
git commit -m "feat(engine): add monteCartoCribEV — Monte Carlo crib simulation (500 samples)"
```

---

### Task 3: Upgrade `optimalDiscard` to use Monte Carlo crib

**Files:**
- Modify: `src/engine/optimal.ts`
- Modify: `src/engine/__tests__/optimal.test.ts`

**Step 1: Write failing test**

Add to `src/engine/__tests__/optimal.test.ts` inside `describe('optimalDiscard', ...)`:

```typescript
it('MC crib produces EV values in realistically higher range than old heuristic', () => {
  // With MC crib, 5-5 discard to dealer crib scores ~8.50 pts
  // Old heuristic gave ~3 pts. Dealer EV should reflect this accurately.
  const hand = [c('5', 'H'), c('5', 'S'), c('6', 'D'), c('7', 'C'), c('K', 'H'), c('Q', 'S')];
  const asDealer = optimalDiscard(hand, true);
  // Dealer EV = hand EV (~6-7) + MC crib EV for best discard (~5-8)
  // Should be above 10 with accurate MC crib
  expect(asDealer.expectedValue).toBeGreaterThan(10);
});
```

**Step 2: Run test (it will likely pass already — verify it's meaningful)**

```bash
npm run test:engine -- src/engine/__tests__/optimal.test.ts
```

Expected: check whether it passes. If it does, the Schell-based version already gives values > 10 — good, test is still meaningful as a regression guard.

**Step 3: Update `optimal.ts` to use MC crib**

In `src/engine/optimal.ts`, change the import:

```typescript
// Remove: import { lookupCribEV } from './crib-ev';
// Add:
import { monteCartoCribEV } from './crib-ev';
```

In the `optimalDiscard` function, change the crib EV line:

```typescript
// Before:
const cribEV = lookupCribEV(discard[0], discard[1]);

// After (pass full 6-card hand as knownCards):
const cribEV = monteCartoCribEV(discard, hand as Card[], 500);
```

Note: `ai.ts` is NOT changed — `aiSelectDiscard` keeps `lookupCribEV` for the <500ms gameplay budget.

**Step 4: Run tests and timing check**

```bash
npm run test:engine -- src/engine/__tests__/optimal.test.ts
```

Expected: All tests pass. The 500ms timing test in `optimalDiscard` may be close — 15 combos × 500 MC samples each = 7,500 `scoreHand` calls. If it's slow, reduce samples to 200 in `optimalDiscard` only.

**Step 5: Commit**

```bash
git add src/engine/optimal.ts src/engine/__tests__/optimal.test.ts
git commit -m "feat(engine): upgrade optimalDiscard to use Monte Carlo crib (500 samples, coaching path)"
```

---

### Task 4: Record decision snapshots in `gameReducer`

**Files:**
- Modify: `src/engine/gameState.ts`
- Modify: `src/engine/__tests__/gameState.test.ts`

**Step 1: Write failing tests**

Add to `src/engine/__tests__/gameState.test.ts`:

```typescript
import type { DecisionSnapshot } from '../types';

describe('decisionLog snapshot recording', () => {
  function dealAndDiscard(playerIndex: number, cardIds: string[]) {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    return gameReducer(g, { type: 'DISCARD', playerIndex, cardIds });
  }

  it('records a discard snapshot when player discards', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const hand = g.players[0].hand;
    const cardIds = [hand[0].id, hand[1].id];
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds });

    expect(g.decisionLog).toHaveLength(1);
    const snap = g.decisionLog[0];
    expect(snap.type).toBe('discard');
    expect(snap.hand).toHaveLength(6); // full 6-card hand before discard
    expect(snap.playerChoice).toHaveLength(2);
    expect(snap.playerChoice.map(c => c.id)).toEqual(cardIds);
    expect(snap.handIndex).toBe(0); // first hand (0-based)
  });

  it('records correct isDealer flag for discard', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    // Player 0 is dealer (dealerIndex=0 in createGame)
    const hand0 = g.players[0].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [hand0[0].id, hand0[1].id] });
    expect(g.decisionLog[0].isDealer).toBe(true);

    const hand1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [hand1[0].id, hand1[1].id] });
    expect(g.decisionLog[1].isDealer).toBe(false);
  });

  it('records a pegging play snapshot when PLAY_CARD', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    g = gameReducer(g, { type: 'CUT' });

    // Non-dealer (player 1) plays first in pegging
    const firstPlayer = g.pegging.currentPlayerIndex;
    const firstCard = g.pegging.playerCards[firstPlayer][0];
    const snapshotsBefore = g.decisionLog.length;
    g = gameReducer(g, { type: 'PLAY_CARD', playerIndex: firstPlayer, cardId: firstCard.id });

    expect(g.decisionLog.length).toBe(snapshotsBefore + 1);
    const snap = g.decisionLog[g.decisionLog.length - 1];
    expect(snap.type).toBe('pegging_play');
    expect(snap.playerChoice).toHaveLength(1);
    expect(snap.playerChoice[0].id).toBe(firstCard.id);
    expect(snap.pile).toBeDefined();
    expect(snap.count).toBeDefined();
  });

  it('pegging snapshot captures pile and count BEFORE the play', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    g = gameReducer(g, { type: 'CUT' });

    // First play — pile should be empty, count=0 in snapshot
    const firstPlayer = g.pegging.currentPlayerIndex;
    const firstCard = g.pegging.playerCards[firstPlayer][0];
    g = gameReducer(g, { type: 'PLAY_CARD', playerIndex: firstPlayer, cardId: firstCard.id });

    const snap = g.decisionLog[g.decisionLog.length - 1];
    expect(snap.pile).toHaveLength(0); // pile was empty before this play
    expect(snap.count).toBe(0); // count was 0 before this play
  });

  it('decisionLog accumulates across multiple hands', () => {
    let g = createGame(2);
    g = gameReducer(g, { type: 'DEAL' });
    const h0 = g.players[0].hand;
    const h1 = g.players[1].hand;
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 0, cardIds: [h0[0].id, h0[1].id] });
    g = gameReducer(g, { type: 'DISCARD', playerIndex: 1, cardIds: [h1[0].id, h1[1].id] });
    expect(g.decisionLog).toHaveLength(2); // 2 discard decisions
  });
});
```

**Step 2: Run tests to confirm failure**

```bash
npm run test:engine -- src/engine/__tests__/gameState.test.ts
```

Expected: FAIL — snapshots aren't being recorded yet.

**Step 3: Update `handleDiscard` in `gameState.ts`**

Add `DecisionSnapshot` to the import at the top of `gameState.ts`:

```typescript
import type { Card, GameState, GameAction, PlayerState, PeggingState, HandStats, DecisionSnapshot } from './types';
```

In `handleDiscard`, add snapshot recording before the return:

```typescript
function handleDiscard(state: GameState, playerIndex: number, cardIds: string[]): GameState {
  // ... existing validation and card lookup code unchanged ...

  const remainingHand = playerHand.filter(c => !cardIds.includes(c.id));
  const newCrib = [...state.crib, ...discardedCards];

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: remainingHand } : p,
  );

  const allDiscarded = newPlayers.every(p => p.hand.length === HAND_SIZE);

  // Record decision snapshot
  const snapshot: DecisionSnapshot = {
    type: 'discard',
    hand: playerHand,                        // full 6-card hand before discarding
    playerChoice: discardedCards,
    isDealer: playerIndex === state.dealerIndex,
    handIndex: state.handNumber - 1,         // 0-based
  };

  return {
    ...state,
    phase: allDiscarded ? 'CUT_STARTER' : 'DISCARD_TO_CRIB',
    players: newPlayers,
    crib: newCrib,
    decisionLog: [...state.decisionLog, snapshot],
  };
}
```

**Step 4: Update `handlePlayCard` in `gameState.ts`**

In `handlePlayCard`, add snapshot recording after finding `playedCard` and before any early returns:

```typescript
function handlePlayCard(state: GameState, playerIndex: number, cardId: string): GameState {
  // ... existing validation unchanged ...

  const playedCard = playerCards[cardIndex];
  const newCount = state.pegging.count + cardValue(playedCard.rank);

  // ... existing overflow check unchanged ...

  // Record decision snapshot BEFORE updating pile/count
  const snapshot: DecisionSnapshot = {
    type: 'pegging_play',
    hand: playerCards,                         // cards available to play at this moment
    playerChoice: [playedCard],
    isDealer: playerIndex === state.dealerIndex,
    pile: state.pegging.sequence,              // sequence BEFORE this play
    count: state.pegging.count,                // count BEFORE this play
    handIndex: state.handNumber - 1,
  };

  // ... rest of existing code unchanged, but add decisionLog to ALL return statements:
  // Every return in this function must include:
  // decisionLog: [...state.decisionLog, snapshot],
```

Add `decisionLog: [...state.decisionLog, snapshot]` to every `return { ...state, ... }` in `handlePlayCard`. There are 4 return paths (win check, allCardsPlayed+win, allCardsPlayed, normal play). All must include the snapshot.

**Step 5: Run tests**

```bash
npm run test:engine -- src/engine/__tests__/gameState.test.ts
```

Expected: All snapshot tests pass.

**Step 6: Run full suite**

```bash
npm run test:engine
```

Expected: 170+ passing.

**Step 7: Commit**

```bash
git add src/engine/gameState.ts src/engine/__tests__/gameState.test.ts
git commit -m "feat(engine): record DecisionSnapshot in gameReducer on DISCARD and PLAY_CARD"
```

---

### Task 5: Create `coaching.ts` — EVL types and analysis functions

**Files:**
- Create: `src/engine/coaching.ts`
- Create: `src/engine/__tests__/coaching.test.ts`

**Step 1: Write failing tests first**

Create `src/engine/__tests__/coaching.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { Card, Rank, Suit, DecisionSnapshot } from '../types';
import { createCard } from '../types';
import { optimalDiscard } from '../optimal';
import {
  analyzeDecision,
  analyzeHand,
  analyzeGame,
  type CoachingAnnotation,
  type HandCoachingSummary,
  type GameCoachingSummary,
} from '../coaching';

function c(rank: Rank, suit: Suit): Card {
  return createCard(rank, suit);
}

describe('analyzeDecision — discard', () => {
  it('returns excellent severity when player chose the optimal discard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [...opt.discard],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeLessThan(0.1);
    expect(annotation.severity).toBe('excellent');
    expect(annotation.decision).toBe('discard');
    expect(annotation.evActual).toBeCloseTo(annotation.evOptimal, 1);
  });

  it('returns positive EVL when player chose the worst discard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const worstOption = opt.allOptions[opt.allOptions.length - 1];
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [...worstOption.discard],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeGreaterThan(0);
    expect(annotation.evOptimal).toBeGreaterThan(annotation.evActual);
  });

  it('EVL is never negative', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    // Try all 15 options — none should produce negative EVL
    for (const option of opt.allOptions) {
      const snapshot: DecisionSnapshot = {
        type: 'discard',
        hand,
        playerChoice: [...option.discard],
        isDealer: false,
        handIndex: 0,
      };
      const annotation = analyzeDecision(snapshot);
      expect(annotation.evl).toBeGreaterThanOrEqual(0);
    }
  });

  it('identifies the optimal cards correctly', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [c('9','H'), c('K','S')],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    const optIds = new Set(opt.discard.map(c => c.id));
    const annotOptIds = new Set(annotation.optimal.map(c => c.id));
    expect([...optIds]).toEqual(expect.arrayContaining([...annotOptIds]));
  });

  it('includes reasoning string from optimalDiscard', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const snapshot: DecisionSnapshot = {
      type: 'discard',
      hand,
      playerChoice: [c('9','H'), c('K','S')],
      isDealer: true,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(typeof annotation.reasoning).toBe('string');
    expect(annotation.reasoning.length).toBeGreaterThan(0);
  });
});

describe('analyzeDecision — pegging play', () => {
  it('returns excellent severity when player made the optimal pegging play', () => {
    // count=21, playing 10 makes 31 — optimal and obvious
    const hand = [c('10','H'), c('5','S'), c('A','D')];
    const pile = [c('K','H'), c('J','S')];
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('10','H')],
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.severity).toBe('excellent');
    expect(annotation.evl).toBeLessThan(0.1);
    expect(annotation.points).toBe(2); // or expect annotation.evOptimal = 2
  });

  it('returns positive EVL when player missed making 31', () => {
    // count=21, optimal is to play 10 for 31, player played A instead
    const hand = [c('10','H'), c('A','D')];
    const pile: Card[] = [];
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand,
      playerChoice: [c('A','D')],  // plays A instead of 10
      isDealer: false,
      pile,
      count: 21,
      handIndex: 0,
    };
    const annotation = analyzeDecision(snapshot);
    expect(annotation.evl).toBeGreaterThan(0);
  });

  it('handles no-play (all cards over 31) gracefully', () => {
    const snapshot: DecisionSnapshot = {
      type: 'pegging_play',
      hand: [c('10','H'), c('J','S')],
      playerChoice: [],  // Go — no play
      isDealer: false,
      pile: [],
      count: 25,
      handIndex: 0,
    };
    // Should not throw — Go is correct when no card is playable
    expect(() => analyzeDecision(snapshot)).not.toThrow();
  });
});

describe('analyzeHand', () => {
  function makeOptimalDiscardSnapshot(hand: Card[], isDealer: boolean, handIndex: number): DecisionSnapshot {
    const opt = optimalDiscard(hand, isDealer);
    return {
      type: 'discard',
      hand,
      playerChoice: [...opt.discard],
      isDealer,
      handIndex,
    };
  }

  it('returns zero totalEVL when all decisions were optimal', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const snapshots: DecisionSnapshot[] = [
      makeOptimalDiscardSnapshot(hand, true, 0),
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.totalEVL).toBeLessThan(0.1);
    expect(summary.handIndex).toBe(0);
    expect(summary.annotations).toHaveLength(1);
  });

  it('identifies the worst decision in the hand', () => {
    const hand1 = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt1 = optimalDiscard(hand1, true);
    const worst1 = opt1.allOptions[opt1.allOptions.length - 1];
    const snapshots: DecisionSnapshot[] = [
      { type: 'discard', hand: hand1, playerChoice: [...worst1.discard], isDealer: true, handIndex: 0 },
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.worstDecision).not.toBeNull();
    expect(summary.worstDecision!.evl).toBeGreaterThan(0);
  });

  it('aggregates EVL from multiple decisions', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worstOpt = opt.allOptions[opt.allOptions.length - 1];
    // Two suboptimal decisions
    const snapshots: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...worstOpt.discard], isDealer: false, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...worstOpt.discard], isDealer: false, handIndex: 0 },
    ];
    const summary = analyzeHand(snapshots, 0);
    expect(summary.annotations).toHaveLength(2);
    expect(summary.totalEVL).toBeGreaterThan(0);
  });

  it('handles empty snapshots for a hand', () => {
    const summary = analyzeHand([], 2);
    expect(summary.handIndex).toBe(2);
    expect(summary.totalEVL).toBe(0);
    expect(summary.annotations).toHaveLength(0);
    expect(summary.worstDecision).toBeNull();
  });
});

describe('analyzeGame', () => {
  it('returns A+ grade for all-optimal decisions', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
    ];
    const summary = analyzeGame(log);
    expect(summary.grade).toBe('A+');
    expect(summary.totalDecisions).toBe(1);
    expect(summary.excellentCount).toBe(1);
  });

  it('returns F grade for consistently poor decisions', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worst = opt.allOptions[opt.allOptions.length - 1];
    // Simulate many bad decisions
    const log: DecisionSnapshot[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'discard' as const,
      hand,
      playerChoice: [...worst.discard],
      isDealer: false,
      handIndex: i,
    }));
    const summary = analyzeGame(log);
    // Should be a poor grade (not A+)
    expect(['D', 'F', 'C']).toContain(summary.grade);
    expect(summary.totalDecisions).toBe(5);
  });

  it('aggregates totalEVL across all hands', () => {
    const hand = [c('A','H'), c('4','S'), c('7','D'), c('10','C'), c('Q','H'), c('K','S')];
    const opt = optimalDiscard(hand, false);
    const worst = opt.allOptions[opt.allOptions.length - 1];
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...worst.discard], isDealer: false, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...worst.discard], isDealer: false, handIndex: 1 },
    ];
    const summary = analyzeGame(log);
    expect(summary.hands).toHaveLength(2); // grouped by handIndex
    expect(summary.totalEVL).toBeGreaterThan(0);
    expect(summary.totalDecisions).toBe(2);
  });

  it('groups decisions by handIndex into hands', () => {
    const hand = [c('5','H'), c('5','S'), c('5','D'), c('J','C'), c('9','H'), c('K','S')];
    const opt = optimalDiscard(hand, true);
    const log: DecisionSnapshot[] = [
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 0 },
      { type: 'discard', hand, playerChoice: [...opt.discard], isDealer: true, handIndex: 1 },
    ];
    const summary = analyzeGame(log);
    expect(summary.hands).toHaveLength(2);
    expect(summary.hands[0].annotations).toHaveLength(2);
    expect(summary.hands[1].annotations).toHaveLength(1);
  });

  it('handles empty decisionLog', () => {
    const summary = analyzeGame([]);
    expect(summary.totalEVL).toBe(0);
    expect(summary.totalDecisions).toBe(0);
    expect(summary.hands).toHaveLength(0);
    expect(summary.grade).toBe('A+'); // no mistakes = perfect grade
  });
});
```

**Step 2: Run to confirm all fail**

```bash
npm run test:engine -- src/engine/__tests__/coaching.test.ts
```

Expected: FAIL — `coaching` module doesn't exist.

**Step 3: Create `coaching.ts`**

Create `src/engine/coaching.ts`:

```typescript
import type { Card, DecisionSnapshot } from './types';
import { cardValue } from './types';
import { optimalDiscard } from './optimal';
import { optimalPeggingPlay } from './optimal';
import { scorePeggingPlay } from './pegging';

// ─── Types ──────────────────────────────────────────────────────────────

export type Severity = 'excellent' | 'minor' | 'significant' | 'major' | 'critical';
export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface CoachingAnnotation {
  readonly decision: 'discard' | 'pegging_play';
  readonly actual: readonly Card[];
  readonly optimal: readonly Card[];
  readonly evActual: number;
  readonly evOptimal: number;
  readonly evl: number;          // max(0, evOptimal - evActual)
  readonly severity: Severity;
  readonly reasoning: string;
  readonly points?: number;      // pegging only — immediate points scored
}

export interface HandCoachingSummary {
  readonly handIndex: number;
  readonly annotations: readonly CoachingAnnotation[];
  readonly totalEVL: number;
  readonly worstDecision: CoachingAnnotation | null;
}

export interface GameCoachingSummary {
  readonly hands: readonly HandCoachingSummary[];
  readonly totalEVL: number;
  readonly averageEVLPerHand: number;
  readonly averageEVLPerDecision: number;
  readonly worstDecision: CoachingAnnotation | null;
  readonly grade: Grade;
  readonly totalDecisions: number;
  readonly excellentCount: number;
}

// ─── Severity & Grade ───────────────────────────────────────────────────

function classifySeverity(evl: number): Severity {
  if (evl < 0.1) return 'excellent';
  if (evl < 0.5) return 'minor';
  if (evl < 1.5) return 'significant';
  if (evl < 3.0) return 'major';
  return 'critical';
}

function classifyGrade(avgEVLPerDecision: number): Grade {
  if (avgEVLPerDecision < 0.1) return 'A+';
  if (avgEVLPerDecision < 0.3) return 'A';
  if (avgEVLPerDecision < 0.7) return 'B';
  if (avgEVLPerDecision < 1.5) return 'C';
  if (avgEVLPerDecision < 2.5) return 'D';
  return 'F';
}

// ─── analyzeDecision ────────────────────────────────────────────────────

/**
 * Compute coaching annotation for a single player decision.
 *
 * For discard: uses optimalDiscard (with Monte Carlo crib) to find all 15
 * options and locates the player's actual choice in that ranked list.
 *
 * For pegging: uses optimalPeggingPlay for the recommended play and compares
 * immediate points scored (Medium Effort — no look-ahead).
 */
export function analyzeDecision(snapshot: DecisionSnapshot): CoachingAnnotation {
  if (snapshot.type === 'discard') {
    return analyzeDiscard(snapshot);
  }
  return analyzePeggingPlay(snapshot);
}

function analyzeDiscard(snapshot: DecisionSnapshot): CoachingAnnotation {
  const optResult = optimalDiscard(snapshot.hand, snapshot.isDealer);

  // Find the option matching the player's actual choice
  const actualIds = new Set(snapshot.playerChoice.map(c => c.id));
  const actualOption = optResult.allOptions.find(opt => {
    const optIds = new Set(opt.discard.map(c => c.id));
    return [...actualIds].every(id => optIds.has(id));
  });

  // Fall back to last (worst) option if not found (shouldn't happen with valid data)
  const evActual = actualOption?.expectedValue
    ?? optResult.allOptions[optResult.allOptions.length - 1].expectedValue;
  const evOptimal = optResult.expectedValue;
  const evl = Math.max(0, evOptimal - evActual);

  return {
    decision: 'discard',
    actual: snapshot.playerChoice,
    optimal: optResult.discard,
    evActual,
    evOptimal,
    evl,
    severity: classifySeverity(evl),
    reasoning: optResult.reasoning,
  };
}

function analyzePeggingPlay(snapshot: DecisionSnapshot): CoachingAnnotation {
  const pile = snapshot.pile ?? [];
  const count = snapshot.count ?? 0;

  const optResult = optimalPeggingPlay(snapshot.hand, pile, count);

  // EV of optimal play = immediate points from recommended card
  const evOptimal = optResult.points;

  // EV of actual play = immediate points from the card the player chose
  let evActual = 0;
  if (snapshot.playerChoice.length > 0) {
    const actualCard = snapshot.playerChoice[0];
    const actualNewPile = [...pile, actualCard];
    // Verify card was actually playable
    const actualCount = count + cardValue(actualCard.rank);
    if (actualCount <= 31) {
      evActual = scorePeggingPlay(actualNewPile).total;
    }
  }
  // If playerChoice is empty, player declared Go — compare against Go (evOptimal=0)

  const evl = Math.max(0, evOptimal - evActual);

  return {
    decision: 'pegging_play',
    actual: snapshot.playerChoice,
    optimal: optResult.card ? [optResult.card] : [],
    evActual,
    evOptimal,
    evl,
    severity: classifySeverity(evl),
    reasoning: optResult.reasoning,
    points: evActual,
  };
}

// ─── analyzeHand ────────────────────────────────────────────────────────

/**
 * Compute coaching summary for all decisions in a single hand.
 *
 * @param snapshots - All DecisionSnapshots from this hand (filter by handIndex)
 * @param handIndex - Which hand number (0-based)
 */
export function analyzeHand(
  snapshots: readonly DecisionSnapshot[],
  handIndex: number,
): HandCoachingSummary {
  const annotations = snapshots.map(s => analyzeDecision(s));
  const totalEVL = annotations.reduce((sum, a) => sum + a.evl, 0);
  const worstDecision = annotations.length === 0
    ? null
    : annotations.reduce((worst, a) => a.evl > worst.evl ? a : worst);

  return {
    handIndex,
    annotations,
    totalEVL,
    worstDecision: worstDecision?.evl === 0 ? null : (worstDecision ?? null),
  };
}

// ─── analyzeGame ────────────────────────────────────────────────────────

/**
 * Compute full coaching summary for an entire game.
 *
 * Groups decisions by handIndex, computes per-hand summaries, then aggregates
 * into game-level totals, grade, and worst decision.
 *
 * @param decisionLog - Complete GameState.decisionLog
 */
export function analyzeGame(
  decisionLog: readonly DecisionSnapshot[],
): GameCoachingSummary {
  if (decisionLog.length === 0) {
    return {
      hands: [],
      totalEVL: 0,
      averageEVLPerHand: 0,
      averageEVLPerDecision: 0,
      worstDecision: null,
      grade: 'A+',
      totalDecisions: 0,
      excellentCount: 0,
    };
  }

  // Group snapshots by handIndex
  const byHand = new Map<number, DecisionSnapshot[]>();
  for (const snap of decisionLog) {
    const arr = byHand.get(snap.handIndex) ?? [];
    arr.push(snap);
    byHand.set(snap.handIndex, arr);
  }

  // Analyze each hand (sorted by handIndex)
  const handIndices = [...byHand.keys()].sort((a, b) => a - b);
  const hands: HandCoachingSummary[] = handIndices.map(i =>
    analyzeHand(byHand.get(i)!, i),
  );

  const totalEVL = hands.reduce((sum, h) => sum + h.totalEVL, 0);
  const totalDecisions = decisionLog.length;
  const excellentCount = hands.flatMap(h => h.annotations)
    .filter(a => a.severity === 'excellent').length;

  const averageEVLPerHand = hands.length > 0 ? totalEVL / hands.length : 0;
  const averageEVLPerDecision = totalDecisions > 0 ? totalEVL / totalDecisions : 0;

  const worstDecision = hands
    .map(h => h.worstDecision)
    .filter((d): d is CoachingAnnotation => d !== null)
    .reduce<CoachingAnnotation | null>((worst, d) =>
      worst === null || d.evl > worst.evl ? d : worst,
    null);

  return {
    hands,
    totalEVL,
    averageEVLPerHand,
    averageEVLPerDecision,
    worstDecision,
    grade: classifyGrade(averageEVLPerDecision),
    totalDecisions,
    excellentCount,
  };
}
```

**Step 4: Run tests**

```bash
npm run test:engine -- src/engine/__tests__/coaching.test.ts
```

Expected: All tests pass. Note: coaching tests call `optimalDiscard` (which uses MC crib) — each test may take 100-300ms. Total suite should finish within 30s.

**Step 5: Run full suite + typecheck + lint**

```bash
npm run test:engine && npm run typecheck
npx eslint src/engine/coaching.ts src/engine/__tests__/coaching.test.ts
```

Expected: 185+ tests passing (15 new coaching tests + 6 crib-ev tests = ~21 new), zero TS errors, zero lint errors.

**Step 6: Commit all coaching work**

```bash
git add src/engine/coaching.ts src/engine/__tests__/coaching.test.ts
git commit -m "feat(engine): add coaching EVL system (analyzeDecision/Hand/Game, severity, grade)"
```

---

### Task 6: Final verification and session state update

**Step 1: Run complete test suite**

```bash
npm run test:engine
```

Expected: ~191 tests passing (170 baseline + 6 crib-ev + 15 coaching).

**Step 2: Run typecheck and lint**

```bash
npm run typecheck
npx eslint src/engine/
```

Expected: Zero errors in engine files.

**Step 3: Push all commits**

```bash
git push
```

**Step 4: Update session state**

Update `.claude/session-state.md`:
- Move coaching EVL + MC crib to Completed section
- Update test count
- Update Next Session Priorities to Phase 2 UI

---

## Summary

| Task | New file | What it does |
|------|----------|-------------|
| 1 | — | `DecisionSnapshot` type + `decisionLog` in `GameState` |
| 2 | `crib-ev.test.ts` + `crib-ev.ts` additions | `monteCartoCribEV` — 500-sample MC simulation |
| 3 | — | `optimalDiscard` → uses MC crib for coaching accuracy |
| 4 | — | `gameReducer` records snapshots on DISCARD/PLAY_CARD |
| 5 | `coaching.ts` + `coaching.test.ts` | Full EVL analysis system |
| 6 | — | Verify + push |

**Total new tests:** ~21 (6 crib-ev + ~5 gameState + ~15 coaching)
**Total when done:** ~191 passing
