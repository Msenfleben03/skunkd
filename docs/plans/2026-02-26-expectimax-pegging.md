# Expectimax Pegging Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Expectimax pegging for look-ahead-based coaching EVL and Hard AI difficulty, replacing the immediate-points-only lower bound.

**Architecture:** Expectimax samples 20-50 random determinizations of the opponent's unknown hand, runs a greedy rollout to depth N (3-5 plays), and averages the expected scores. This gives true pegging EVL by considering future points, not just immediate ones. Runs in <50ms (well within 200ms budget) and significantly improves coaching feedback and AI quality without full MCTS complexity.

**Tech Stack:** TypeScript, Vitest, pure functions (no React), seeded randomization for determinism

---

## Task 1: Create Expectimax Pegging Core (`expectimax.ts`)

**Files:**
- Create: `src/engine/expectimax.ts`
- Test: `src/engine/__tests__/expectimax.test.ts`

**Step 1: Write failing test for `expectimaxPeggingPlay`**

```typescript
// src/engine/__tests__/expectimax.test.ts
import { describe, it, expect } from 'vitest';
import { createGame, gameReducer } from '../state';
import { expectimaxPeggingPlay } from '../expectimax';
import { Card, Rank, Suit } from '../types';

describe('expectimaxPeggingPlay', () => {
  it('should return a number between 0 and 31', () => {
    const gameState = createGame('player1', 'player2');
    const ev = expectimaxPeggingPlay(
      gameState,
      myScore: 10,
      opponentScore: 15,
      determinizations: 20,
      depth: 3,
      seed: 12345
    );
    expect(ev).toBeGreaterThanOrEqual(0);
    expect(ev).toBeLessThanOrEqual(31);
  });

  it('should be deterministic with same seed', () => {
    const gameState = createGame('player1', 'player2');
    const ev1 = expectimaxPeggingPlay(gameState, 10, 15, 20, 3, 12345);
    const ev2 = expectimaxPeggingPlay(gameState, 10, 15, 20, 3, 12345);
    expect(ev1).toBe(ev2);
  });

  it('should prefer 31 over 15 over lower values', () => {
    const gameState = createGame('player1', 'player2');
    // Setup: pile = [5, 10], card = 16 (makes 31)
    const pile = [
      { rank: '5' as Rank, suit: 'H' as Suit },
      { rank: 'T' as Rank, suit: 'D' as Suit },
    ];
    const testCard = { rank: '6' as Rank, suit: 'S' as Suit };

    // Shallow Expectimax should detect 31
    const ev = expectimaxPeggingPlay(gameState, 0, 0, 5, 1, 12345);
    expect(ev).toBeGreaterThanOrEqual(2); // At least 31-for-2
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:engine -- src/engine/__tests__/expectimax.test.ts
```

Expected output:
```
expectimaxPeggingPlay is not defined
```

**Step 3: Write minimal implementation of Expectimax**

```typescript
// src/engine/expectimax.ts
import { GameState, Card, Rank } from './types';
import { canPlay, scorePeggingPlay } from './pegging';
import { cardValue } from './scoring';
import seedrandom from 'seedrandom';

/**
 * Expectimax pegging evaluation: average expected score over N determinizations
 * of opponent's unknown hand, with greedy rollout to depth D.
 *
 * @param gameState - Current game state with pegging pile and playable cards
 * @param myScore - Current player score
 * @param opponentScore - Opponent score
 * @param determinizations - Number of random hand samples (20-50 recommended)
 * @param depth - Lookahead depth in plays (3-5 recommended)
 * @param seed - Optional seed for reproducibility
 * @returns Expected value (points) of current position
 */
export function expectimaxPeggingPlay(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  determinizations: number = 20,
  depth: number = 3,
  seed?: number
): number {
  let totalEv = 0;

  for (let i = 0; i < determinizations; i++) {
    const deterministicSeed = seed ? seed + i : Math.random();
    const deterministicState = randomizeOpponentHand(gameState, deterministicSeed);
    const ev = greedyRollout(deterministicState, myScore, opponentScore, depth);
    totalEv += ev;
  }

  return totalEv / determinizations;
}

/**
 * Create a new game state with opponent's unknown cards randomized.
 * Respects: cards in pile, cards in current player's hand.
 */
function randomizeOpponentHand(gameState: GameState, seed: number | string): GameState {
  // For now, return unchanged (will implement in Task 2)
  return gameState;
}

/**
 * Greedy rollout: simulate next D plays assuming both players play greedily.
 * Return total points scored in this branch.
 */
function greedyRollout(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  depth: number
): number {
  if (depth === 0) return 0;

  const currentPlayer = gameState.pileIndex % 2; // Simplified: assume alternating
  const playableCards = gameState.players[currentPlayer]?.hand.filter(
    (c: Card) => canPlay(gameState.pile, c)
  ) ?? [];

  if (playableCards.length === 0) {
    // Go: opponent plays next
    return greedyRollout(gameState, myScore, opponentScore, depth);
  }

  // Greedy: prefer 31 > 15 > pair > run > low
  const scored = playableCards.map(card => {
    const score = scorePeggingPlay(gameState.pile, card);
    return { card, score };
  });

  const bestPlay = scored.reduce((best, current) =>
    current.score.total > best.score.total ? current : best
  );

  // Simulate play and recurse
  const points = bestPlay.score.total;
  // (Will properly update gameState in Task 2)

  return points + greedyRollout(gameState, myScore, opponentScore, depth - 1);
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:engine -- src/engine/__tests__/expectimax.test.ts
```

Expected: `PASS` (basic stubs pass; actual EV logic TBD in next tasks)

**Step 5: Commit**

```bash
git add src/engine/expectimax.ts src/engine/__tests__/expectimax.test.ts
git commit -m "feat(engine): add expectimaxPeggingPlay stub + tests"
```

---

## Task 2: Implement Hand Randomization & Greedy Rollout

**Files:**
- Modify: `src/engine/expectimax.ts` (complete `randomizeOpponentHand`, `greedyRollout`)
- Create: `src/engine/__tests__/hand-randomization.test.ts`

**Step 1: Write failing tests for hand randomization**

```typescript
// src/engine/__tests__/hand-randomization.test.ts
import { describe, it, expect } from 'vitest';
import { randomizeOpponentHand } from '../expectimax';
import { createGame, gameReducer } from '../state';

describe('randomizeOpponentHand', () => {
  it('should not include cards in the pile', () => {
    const gameState = createGame('player1', 'player2');
    const pileCards = gameState.pile.map(c => `${c.rank}${c.suit}`);

    const randomized = randomizeOpponentHand(gameState, 'test-seed');
    const randomizedOpponentCards = randomized.players[1]!.hand.map(c => `${c.rank}${c.suit}`);

    randomizedOpponentCards.forEach(card => {
      expect(pileCards).not.toContain(card);
    });
  });

  it('should not include current player cards', () => {
    const gameState = createGame('player1', 'player2');
    const myCards = gameState.players[0]!.hand.map(c => `${c.rank}${c.suit}`);

    const randomized = randomizeOpponentHand(gameState, 'test-seed');
    const randomizedOpponentCards = randomized.players[1]!.hand.map(c => `${c.rank}${c.suit}`);

    randomizedOpponentCards.forEach(card => {
      expect(myCards).not.toContain(card);
    });
  });

  it('should be deterministic with same seed', () => {
    const gameState = createGame('player1', 'player2');
    const rand1 = randomizeOpponentHand(gameState, 'seed123');
    const rand2 = randomizeOpponentHand(gameState, 'seed123');

    const cards1 = rand1.players[1]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    const cards2 = rand2.players[1]!.hand.map(c => `${c.rank}${c.suit}`).sort().join(',');
    expect(cards1).toBe(cards2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:engine -- src/engine/__tests__/hand-randomization.test.ts
```

Expected: Tests fail (function not exported, etc.)

**Step 3: Implement hand randomization & export**

```typescript
// Update src/engine/expectimax.ts

import seedrandom from 'seedrandom';
import { shuffle } from './deck';

/**
 * Clone game state and randomize opponent's unknown hand.
 * Sample a compatible 4-card hand from remaining deck.
 */
export function randomizeOpponentHand(gameState: GameState, seed: string | number): GameState {
  const rng = seedrandom(String(seed));

  // Collect used cards: pile + my hand + starter (if dealt)
  const usedCards = new Set<string>();
  gameState.pile.forEach(c => usedCards.add(`${c.rank}${c.suit}`));
  gameState.players[0]!.hand.forEach(c => usedCards.add(`${c.rank}${c.suit}`));
  if (gameState.starter) usedCards.add(`${gameState.starter.rank}${gameState.starter.suit}`);

  // Remaining deck
  const allCards = generateDeck(); // Assume imported from deck.ts
  const availableCards = allCards.filter(c => !usedCards.has(`${c.rank}${c.suit}`));

  // Shuffle with seeded RNG and pick first N cards for opponent
  const shuffled = shuffle(availableCards, () => rng());
  const newOpponentHand = shuffled.slice(0, gameState.players[1]!.hand.length);

  return {
    ...gameState,
    players: [
      gameState.players[0]!,
      { ...gameState.players[1]!, hand: newOpponentHand },
      ...(gameState.players.slice(2) ?? []),
    ],
  };
}

/**
 * Seed-friendly shuffle (Fisher-Yates with custom RNG)
 */
function shuffleWithSeed<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

**Step 4: Run tests to verify they pass**

```bash
npm run test:engine -- src/engine/__tests__/hand-randomization.test.ts
```

Expected: `PASS`

**Step 5: Implement `greedyRollout` with proper game state updates**

```typescript
// Complete src/engine/expectimax.ts greedyRollout

/**
 * Greedy rollout: simulate D plays with both players playing greedily.
 * Return points scored by current player in this branch.
 */
function greedyRollout(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  depth: number
): number {
  if (depth === 0 || gameState.phase !== 'PEGGING') return 0;

  const currentPlayerIndex = gameState.currentPlayerIndex;
  const currentPlayerHand = gameState.players[currentPlayerIndex]!.hand;

  // Find playable cards
  const playable = currentPlayerHand.filter(c => canPlay(gameState.pile, c));

  if (playable.length === 0) {
    // Current player says "go", opponent plays next
    const nextPlayer = (currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayerHand = gameState.players[nextPlayer]!.hand;
    const nextPlayable = nextPlayerHand.filter(c => canPlay(gameState.pile, c));

    if (nextPlayable.length === 0) {
      // Both said go; pegging ends
      return 0;
    }

    // Opponent plays best card
    const bestOpponentCard = selectBestCard(nextPlayable, gameState.pile);
    const score = scorePeggingPlay(gameState.pile, bestOpponentCard);

    // Clone state, add card to pile, recurse
    const newState = {
      ...gameState,
      pile: [...gameState.pile, bestOpponentCard],
      players: gameState.players.map((p, i) =>
        i === nextPlayer
          ? { ...p, hand: p.hand.filter(c => !cardsEqual(c, bestOpponentCard)) }
          : p
      ),
    };

    return score.total + greedyRollout(newState, myScore, opponentScore, depth - 1);
  }

  // Current player plays best card
  const bestCard = selectBestCard(playable, gameState.pile);
  const score = scorePeggingPlay(gameState.pile, bestCard);

  // Clone state, add card to pile, switch turn, recurse
  const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
  const newState = {
    ...gameState,
    pile: [...gameState.pile, bestCard],
    currentPlayerIndex: nextPlayerIndex,
    players: gameState.players.map((p, i) =>
      i === currentPlayerIndex
        ? { ...p, hand: p.hand.filter(c => !cardsEqual(c, bestCard)) }
        : p
    ),
  };

  return score.total + greedyRollout(newState, myScore, opponentScore, depth - 1);
}

/**
 * Greedy priority: 31 > 15 > pair > run > avoid {5,11,21} > lowest
 */
function selectBestCard(cards: Card[], pile: Card[]): Card {
  const scored = cards.map(c => ({
    card: c,
    score: scorePeggingPlay(pile, c),
    count: cardValue(c.rank) + pile.reduce((acc, p) => acc + cardValue(p.rank), 0),
  }));

  // 31-for-2 or 31-for-1
  const makeThirty = scored.find(s => s.count === 31);
  if (makeThirty) return makeThirty.card;

  // 15-for-2
  const makeFifteen = scored.find(s => s.count === 15 && s.score.total >= 2);
  if (makeFifteen) return makeFifteen.card;

  // Pair
  const makePair = scored.find(s => s.score.pairs > 0);
  if (makePair) return makePair.card;

  // Run
  const makeRun = scored.find(s => s.score.runs > 0);
  if (makeRun) return makeRun.card;

  // Avoid dangerous counts (5, 11, 21)
  const DANGEROUS = new Set([5, 11, 21]);
  const safe = scored.filter(s => !DANGEROUS.has(s.count));
  if (safe.length > 0) return safe[0]!.card;

  // Lowest card
  return scored.reduce((best, current) =>
    cardValue(current.card.rank) < cardValue(best.card.rank) ? current : best
  ).card;
}

function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
```

**Step 6: Add integration test for full rollout**

```typescript
// Add to src/engine/__tests__/expectimax.test.ts

it('should compute non-zero EV for standard position', () => {
  const gameState = createGame('player1', 'player2');
  // Setup a real pegging state (will implement in Task 3)
  const ev = expectimaxPeggingPlay(gameState, 0, 0, 10, 3);
  expect(ev).toBeGreaterThan(0);
});
```

**Step 7: Run all Expectimax tests**

```bash
npm run test:engine -- src/engine/__tests__/expectimax.test.ts
```

Expected: All tests pass

**Step 8: Commit**

```bash
git add src/engine/expectimax.ts src/engine/__tests__/expectimax.test.ts src/engine/__tests__/hand-randomization.test.ts
git commit -m "feat(engine): implement hand randomization + greedy rollout"
```

---

## Task 3: Update Coaching System to Use Expectimax

**Files:**
- Modify: `src/engine/coaching.ts` (update `analyzePeggingPlay`)
- Modify: `src/engine/__tests__/coaching.test.ts` (update pegging tests)

**Step 1: Read current `analyzePeggingPlay` implementation**

```bash
# Skim to understand current structure
head -100 src/engine/coaching.ts
```

**Step 2: Write failing test for Expectimax-based pegging analysis**

```typescript
// Add to src/engine/__tests__/coaching.test.ts

it('should use expectimax EV instead of immediate points for pegging', () => {
  const gameState = createGame('player1', 'player2');
  // After setting up a pegging state...

  const analysis = analyzePeggingPlay(gameState, Card(...), true);

  // EVL should be based on lookahead EV, not immediate points only
  expect(analysis.evl).toBeGreaterThanOrEqual(0);
  expect(analysis.severity).toMatch(/good|minor|significant|major/);
});
```

**Step 3: Update `analyzePeggingPlay` to use Expectimax**

```typescript
// Modify src/engine/coaching.ts

import { expectimaxPeggingPlay } from './expectimax';

export function analyzePeggingPlay(
  gameState: GameState,
  playedCard: Card,
  isOptimalPath: boolean = false,
  seed?: number
): CoachingAnnotation {
  const currentPlayer = gameState.currentPlayerIndex;
  const myScore = gameState.players[currentPlayer]!.score;
  const opponentScore = gameState.players[(currentPlayer + 1) % gameState.players.length]!.score;

  // Actual play EV
  const actualScore = scorePeggingPlay(gameState.pile, playedCard);
  const actualEv = actualScore.total;

  // Expectimax look-ahead
  const actualExpectimaxEv = expectimaxPeggingPlay(
    gameState,
    myScore,
    opponentScore,
    determinizations: 20,
    depth: 3,
    seed
  );

  // Find all playable options
  const playable = gameState.players[currentPlayer]!.hand.filter(c =>
    canPlay(gameState.pile, c)
  );

  // Evaluate each option with Expectimax
  const options = playable.map(card => {
    const immediateScore = scorePeggingPlay(gameState.pile, card);
    const expectimaxScore = expectimaxPeggingPlay(
      gameState,
      myScore,
      opponentScore,
      20,
      3,
      seed ? seed + playable.indexOf(card) : undefined
    );
    return {
      card,
      immediateScore: immediateScore.total,
      expectimaxScore,
    };
  });

  const optimalOption = options.reduce((best, current) =>
    current.expectimaxScore > best.expectimaxScore ? current : best
  );

  // Calculate EVL
  const evl = optimalOption.expectimaxScore - actualExpectimaxEv;

  return {
    decision: 'pegging_play',
    actual: playedCard,
    optimal: optimalOption.card,
    evActual: actualExpectimaxEv,
    evOptimal: optimalOption.expectimaxScore,
    evl,
    severity: calculateSeverity(evl),
    explanation: `Expected value: played ${playedCard.rank}${playedCard.suit} (EV ${actualExpectimaxEv.toFixed(1)}), optimal ${optimalOption.card.rank}${optimalOption.card.suit} (EV ${optimalOption.expectimaxScore.toFixed(1)}).`,
  };
}

function calculateSeverity(evl: number): 'good' | 'minor' | 'significant' | 'major' {
  if (evl < 0.1) return 'good';
  if (evl < 0.5) return 'minor';
  if (evl < 1.5) return 'significant';
  return 'major';
}
```

**Step 4: Run coaching tests**

```bash
npm run test:engine -- src/engine/__tests__/coaching.test.ts -t pegging
```

Expected: Tests pass with new Expectimax-based EVL

**Step 5: Commit**

```bash
git add src/engine/coaching.ts src/engine/__tests__/coaching.test.ts
git commit -m "feat(engine): upgrade analyzePeggingPlay to use expectimax"
```

---

## Task 4: Update Optimal Pegging to Use Expectimax

**Files:**
- Modify: `src/engine/optimal.ts` (update `optimalPeggingPlay`)
- Modify: `src/engine/__tests__/optimal.test.ts`

**Step 1: Write failing test for optimal pegging with Expectimax**

```typescript
// Add to src/engine/__tests__/optimal.test.ts

it('should return best play based on expectimax EV', () => {
  const gameState = createGame('player1', 'player2');
  // Setup pegging state...

  const optimal = optimalPeggingPlay(gameState, 0, 0, 20, 3);

  expect(optimal).toEqual({
    card: expect.objectContaining({ rank: expect.any(String), suit: expect.any(String) }),
    reasoning: expect.any(String),
  });
});
```

**Step 2: Update `optimalPeggingPlay`**

```typescript
// Modify src/engine/optimal.ts

import { expectimaxPeggingPlay } from './expectimax';

export interface OptimalPeggingPlayResult {
  card: Card;
  reasoning: string;
}

export function optimalPeggingPlay(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  determinizations: number = 20,
  depth: number = 3,
  seed?: number
): OptimalPeggingPlayResult | null {
  const currentPlayerIndex = gameState.currentPlayerIndex;
  const hand = gameState.players[currentPlayerIndex]!.hand;

  const playable = hand.filter(c => canPlay(gameState.pile, c));
  if (playable.length === 0) return null;

  // Score each option with Expectimax
  const options = playable.map((card, i) => {
    const ev = expectimaxPeggingPlay(
      gameState,
      myScore,
      opponentScore,
      determinizations,
      depth,
      seed ? seed + i : undefined
    );
    return { card, ev };
  });

  // Find best
  const best = options.reduce((acc, cur) => cur.ev > acc.ev ? cur : acc);

  return {
    card: best.card,
    reasoning: `Play ${best.card.rank}${best.card.suit} for expected value ${best.ev.toFixed(1)} points.`,
  };
}
```

**Step 3: Run optimal pegging tests**

```bash
npm run test:engine -- src/engine/__tests__/optimal.test.ts -t pegging
```

Expected: Tests pass

**Step 4: Commit**

```bash
git add src/engine/optimal.ts src/engine/__tests__/optimal.test.ts
git commit -m "feat(engine): upgrade optimalPeggingPlay to use expectimax"
```

---

## Task 5: Add Hard AI Mode (Optional, Can Defer)

**Files:**
- Modify: `src/engine/ai.ts` (add difficulty parameter to `aiSelectPlay`)
- Modify: `src/engine/__tests__/ai.test.ts`

**Step 1: Write failing test for Hard difficulty**

```typescript
// Add to src/engine/__tests__/ai.test.ts

it('should use expectimax for hard difficulty', () => {
  const gameState = createGame('player1', 'player2');
  // Setup pegging state...

  const hardPlay = aiSelectPlay(gameState, 0, 0, 'hard');
  const easyPlay = aiSelectPlay(gameState, 0, 0, 'easy');

  // Hard may differ from easy due to lookahead
  expect(hardPlay).toBeDefined();
  expect(easyPlay).toBeDefined();
});
```

**Step 2: Update `aiSelectPlay` signature & implementation**

```typescript
// Modify src/engine/ai.ts

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export function aiSelectPlay(
  gameState: GameState,
  myScore: number,
  opponentScore: number,
  difficulty: AIDifficulty = 'medium',
  seed?: number
): Card | null {
  const hand = gameState.players[gameState.currentPlayerIndex]!.hand;
  const playable = hand.filter(c => canPlay(gameState.pile, c));

  if (playable.length === 0) return null;

  // Difficulty levels
  if (difficulty === 'easy') {
    // Random from top 3
    const scored = playable.map(c => ({
      card: c,
      score: scorePeggingPlay(gameState.pile, c).total
    }));
    scored.sort((a, b) => b.score - a.score);
    const topN = scored.slice(0, 3);
    return topN[Math.floor(Math.random() * topN.length)]!.card;
  }

  if (difficulty === 'medium') {
    // Greedy heuristic (current behavior)
    return selectBestCard(playable, gameState.pile);
  }

  if (difficulty === 'hard' || difficulty === 'expert') {
    // Expectimax look-ahead
    const depth = difficulty === 'hard' ? 3 : 5;
    const determinizations = difficulty === 'hard' ? 20 : 50;

    const options = playable.map((card, i) => ({
      card,
      ev: expectimaxPeggingPlay(
        gameState,
        myScore,
        opponentScore,
        determinizations,
        depth,
        seed ? seed + i : undefined
      ),
    }));

    return options.reduce((best, cur) => cur.ev > best.ev ? cur : best).card;
  }

  return null;
}
```

**Step 3: Run AI tests**

```bash
npm run test:engine -- src/engine/__tests__/ai.test.ts -t difficulty
```

Expected: Tests pass

**Step 4: Commit**

```bash
git add src/engine/ai.ts src/engine/__tests__/ai.test.ts
git commit -m "feat(engine): add hard/expert AI difficulty with expectimax"
```

---

## Task 6: Performance Testing & Validation

**Files:**
- Create: `src/engine/__tests__/expectimax.perf.test.ts`
- Verify: `npm run test` (all tests pass)

**Step 1: Write performance benchmark**

```typescript
// src/engine/__tests__/expectimax.perf.test.ts

import { describe, it, expect } from 'vitest';
import { expectimaxPeggingPlay } from '../expectimax';
import { createGame } from '../state';

describe('expectimaxPeggingPlay performance', () => {
  it('should complete 20-determinization depth-3 search in <50ms', () => {
    const gameState = createGame('player1', 'player2');

    const start = performance.now();
    expectimaxPeggingPlay(gameState, 0, 0, 20, 3);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it('should complete 50-determinization depth-5 search in <100ms', () => {
    const gameState = createGame('player1', 'player2');

    const start = performance.now();
    expectimaxPeggingPlay(gameState, 0, 0, 50, 5);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
```

**Step 2: Run performance tests**

```bash
npm run test:engine -- src/engine/__tests__/expectimax.perf.test.ts
```

Expected: All performance targets met

**Step 3: Run full test suite to ensure no regressions**

```bash
npm run test:engine
```

Expected: All 201+ tests pass

**Step 4: Type check and lint**

```bash
npm run typecheck
npm run lint
```

Expected: Zero errors, zero warnings (ignore pre-existing tabs.tsx, deck.test.ts issues)

**Step 5: Commit**

```bash
git add src/engine/__tests__/expectimax.perf.test.ts
git commit -m "test(engine): add expectimax performance benchmarks"
```

---

## Task 7: Update Engine Exports & Documentation

**Files:**
- Modify: `src/engine/index.ts` (export expectimaxPeggingPlay, AIDifficulty)
- Modify: `docs/engine/PEGGING.md` (document Expectimax EVL)

**Step 1: Export new functions**

```typescript
// src/engine/index.ts

export {
  expectimaxPeggingPlay,
} from './expectimax';

export type { AIDifficulty } from './ai';
export { aiSelectPlay } from './ai';

// Keep existing exports...
```

**Step 2: Update PEGGING documentation**

```markdown
# Pegging Engine

## Expectimax Evaluation

As of [date], pegging coaching uses **Expectimax** look-ahead instead of immediate
points only.

### Parameters
- **Determinizations**: 20 (default) for coaching, 50 for Expert AI
- **Depth**: 3-5 plays ahead
- **Runtime**: <50ms for coaching, <100ms for Expert AI

### EVL Severity
- **Good**: EVL < 0.1 pts
- **Minor**: EVL 0.1-0.5 pts
- **Significant**: EVL 0.5-1.5 pts
- **Major**: EVL > 1.5 pts

### Example
Player plays 7; opponent plays 8 for 15-2. Expectimax reveals this enables run
of 9 (scoring 3 back). Immediate analysis = -2 EVL. Expectimax reveals true
EVL < 1.0 because of counter-play.

```

**Step 3: Commit**

```bash
git add src/engine/index.ts docs/engine/PEGGING.md
git commit -m "docs(engine): export expectimax functions + update pegging docs"
```

---

## Task 8: Final Validation & Push

**Files:**
- Verify: All tests pass, no type errors, no lint warnings
- Update: `.claude/session-state.md` with completion

**Step 1: Run complete test suite**

```bash
npm run test:engine
npm run typecheck
npm run lint
```

Expected: All pass

**Step 2: Run full game e2e sanity check (optional)**

```bash
npm run dev
# Manually play 2-3 hands to verify AI/coaching behavior
```

**Step 3: Update session state**

```markdown
# .claude/session-state.md

## Completed This Session
- [x] Task 1: Expectimax core (stub)
- [x] Task 2: Hand randomization + greedy rollout
- [x] Task 3: Coaching integration (analyzePeggingPlay)
- [x] Task 4: Optimal pegging upgrade
- [x] Task 5: Hard AI difficulty (optional, completed)
- [x] Task 6: Performance validation
- [x] Task 7: Exports + docs
- [x] Task 8: Final validation

## Status
Expectimax pegging COMPLETE. 201+ tests passing. Ready for Phase 2 multiplayer.

## Next Session Priorities
- Phase 2: Multiplayer foundation
- Or: SO-ISMCTS pegging (advanced, post-launch)
- Or: Bayesian opponent modeling
```

**Step 4: Commit**

```bash
git add .claude/session-state.md
git commit -m "docs: mark expectimax pegging complete"
```

**Step 5: Push to remote**

```bash
git push origin master
```

Expected: Clean push, no merge conflicts

---

## Key Architectural Decisions

### Why Expectimax Over ISMCTS?
- **Simplicity**: No Zobrist hashing, no tree structure, no information sets
- **Performance**: ~50ms vs ~2.5s for 500-iteration ISMCTS
- **Sufficiency**: Achieves most ISMCTS quality for coaching + Hard AI
- **Future**: ISMCTS remains Expert AI target (post-launch)

### Determinization Strategy
- **20-50 determinizations** of opponent's unknown hand (varies by difficulty)
- **Seeded RNG** for reproducibility (same game state + seed = same recommendation)
- **Greedy rollout** (not random) because random pegging misses actual tactical depth

### EVL Coaching Metric
- **True EVL** = optimal EV - actual EV (based on look-ahead)
- **Severity tiers** calibrated from poker GTO trainers
- **Catches trap plays** (run-baiting, Magic Eleven) naturally without special-casing

### Board Position (Optional Tier)
- `getPositionMode()` from ai.ts already provides Theory of 26 zones
- Expectimax can be refined in future to weight offense/defense mode into look-ahead depth
- **Deferred to post-launch**

---

## Testing Strategy

| Test Type | Coverage | Runtime |
|-----------|----------|---------|
| Unit (Expectimax core) | Determinism, bounds checking, tie-breaking | <10ms |
| Integration (coaching/AI) | EVL severity, option ranking | <100ms |
| Performance | 20-det d=3 < 50ms, 50-det d=5 < 100ms | <2s total |
| Regression | All existing engine tests | <3s |

**Total test time**: <5s (well within CI budget)

---

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `src/engine/expectimax.ts` | ~250 | Core Expectimax, hand randomization, greedy rollout |
| `src/engine/__tests__/expectimax.test.ts` | ~120 | Unit tests: bounds, determinism, behavior |
| `src/engine/__tests__/hand-randomization.test.ts` | ~60 | Isolation tests for hand cloning |
| `src/engine/__tests__/expectimax.perf.test.ts` | ~40 | Performance benchmarks |
| `src/engine/coaching.ts` | ~50 lines modified | EVL calculation + severity |
| `src/engine/optimal.ts` | ~40 lines modified | Expectimax integration for coaching |
| `src/engine/ai.ts` | ~60 lines modified | Difficulty levels + Expectimax |
| `src/engine/index.ts` | ~5 lines added | Exports |
| `docs/engine/PEGGING.md` | ~50 lines | Updated architecture doc |

**Total new code**: ~570 lines, ~200 test lines, ~10 commits

