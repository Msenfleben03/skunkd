# MCTS Implementation Reference

## Table of Contents
- [SO-ISMCTS Full Implementation](#so-ismcts-full-implementation)
- [UCT Selection Formula](#uct-selection-formula)
- [Cribbage Determinization](#cribbage-determinization)
- [Expectimax Alternative](#expectimax-alternative)
- [Web Worker Integration](#web-worker-integration)
- [Zobrist Hashing](#zobrist-hashing)
- [Parameter Tuning](#parameter-tuning)

---

## SO-ISMCTS Full Implementation

```typescript
interface MCTSNode {
  visits: number;
  totalReward: number;
  children: Map<string, MCTSNode>;  // key = card.id
  untriedActions: Card[];
  isTerminal: boolean;
}

interface PeggingSearchState {
  myHand: readonly Card[];
  opponentHandSample: readonly Card[];  // Determinized each iteration
  pile: readonly Card[];
  count: number;
  myScore: number;
  opponentScore: number;
  myTurn: boolean;
}
```

### UCT Selection Formula

```typescript
function uctScore(node: MCTSNode, parent: MCTSNode, C = 1.41): number {
  if (node.visits === 0) return Infinity;  // Force exploration
  const exploitation = node.totalReward / node.visits;
  const exploration = C * Math.sqrt(Math.log(parent.visits) / node.visits);
  return exploitation + exploration;
}
```

### Single Iteration

```typescript
function mctsIterate(root: MCTSNode, state: PeggingSearchState): void {
  // 1. SELECTION — descend using UCT until unexpanded node
  let node = root;
  let currentState = { ...state };
  const path: MCTSNode[] = [root];

  while (node.untriedActions.length === 0 && !node.isTerminal) {
    let bestChild: MCTSNode | null = null;
    let bestScore = -Infinity;
    for (const [, child] of node.children) {
      const s = uctScore(child, node);
      if (s > bestScore) { bestScore = s; bestChild = child; }
    }
    node = bestChild!;
    path.push(node);
    // Apply selected child's action to currentState:
    // push card to pile, update count, apply pegging scores, switch turns
  }

  // 2. EXPANSION — add one untried action
  if (node.untriedActions.length > 0 && !node.isTerminal) {
    const idx = Math.floor(Math.random() * node.untriedActions.length);
    const action = node.untriedActions.splice(idx, 1)[0];
    const childNode: MCTSNode = {
      visits: 0, totalReward: 0, children: new Map(),
      untriedActions: getLegalMoves(currentState),
      isTerminal: false,
    };
    node.children.set(action.id, childNode);
    node = childNode;
    path.push(node);
  }

  // 3. SIMULATION — heuristic rollout (NOT random — uses aiSelectPlay)
  const reward = simulateHeuristicPlayout(currentState);

  // 4. BACKPROPAGATION
  for (const n of path) {
    n.visits++;
    n.totalReward += reward;
  }
}
```

### Main Search Function

```typescript
function mctsPeggingPlay(
  myHand: readonly Card[],
  pile: readonly Card[],
  count: number,
  knownCards: Set<string>,  // My hand + starter + played cards
  timeBudgetMs = 500,
): Card | null {
  const playable = myHand.filter(c => cardValue(c.rank) + count <= 31);
  if (playable.length === 0) return null;
  if (playable.length === 1) return playable[0];

  const root: MCTSNode = {
    visits: 0, totalReward: 0, children: new Map(),
    untriedActions: [...playable],
    isTerminal: false,
  };

  const deadline = performance.now() + timeBudgetMs;
  let iterations = 0;

  while (performance.now() < deadline) {
    // Determinize: sample a possible opponent hand
    const oppHand = sampleOpponentHand(knownCards, opponentCardsRemaining);
    const state: PeggingSearchState = {
      myHand: [...myHand], opponentHandSample: oppHand,
      pile: [...pile], count, myScore: 0, opponentScore: 0, myTurn: true,
    };
    mctsIterate(root, state);
    iterations++;
  }

  // Robust selection: most visited child (not highest average)
  let bestCard: Card | null = null;
  let mostVisits = -1;
  for (const [cardId, child] of root.children) {
    if (child.visits > mostVisits) {
      mostVisits = child.visits;
      bestCard = myHand.find(c => c.id === cardId) ?? null;
    }
  }

  return bestCard;
}
```

---

## Cribbage Determinization

```typescript
function sampleOpponentHand(
  knownCardIds: Set<string>,
  numCards: number
): Card[] {
  const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const;
  const SUITS = ['H','D','S','C'] as const;
  const available: Card[] = [];

  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const id = `${rank}-${suit}`;
      if (!knownCardIds.has(id)) {
        available.push({ rank, suit, id });
      }
    }
  }

  // Fisher-Yates shuffle and take first numCards
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }

  return available.slice(0, numCards);
}
```

**Information set for pegging:**
```
I(me) = {
  my_hand: known exactly
  opponent_hand: unknown — constrained by:
    - 52 total - my 6 dealt - starter = 45 possible
    - Minus opponent's played cards (visible)
    - Opponent has (4 - played) cards remaining
  pile: visible to both
  count: visible to both
}
```

---

## Expectimax Alternative

Simpler than ISMCTS, achieves most of the quality benefit:

```typescript
function expectimaxPeggingPlay(
  hand: readonly Card[],
  pile: readonly Card[],
  count: number,
  knownCards: Set<string>,
  iterations = 50,
): Card | null {
  const playable = hand.filter(c => cardValue(c.rank) + count <= 31);
  if (playable.length === 0) return null;
  if (playable.length === 1) return playable[0];

  const scores = new Map<string, number>();

  for (const card of playable) {
    let total = 0;
    for (let i = 0; i < iterations; i++) {
      const oppHand = sampleOpponentHand(knownCards, opponentCardsRemaining);
      const immediateScore = scorePeggingPlay([...pile, card]).total;
      const futureScore = greedyRollout(
        hand.filter(c => c.id !== card.id),
        oppHand,
        [...pile, card],
        count + cardValue(card.rank),
      );
      total += immediateScore + futureScore;
    }
    scores.set(card.id, total / iterations);
  }

  // Return card with highest average score
  let bestId = '';
  let bestScore = -Infinity;
  for (const [id, score] of scores) {
    if (score > bestScore) { bestScore = score; bestId = id; }
  }
  return hand.find(c => c.id === bestId) ?? null;
}
```

---

## Web Worker Integration

The cribbage engine is pure TypeScript with no DOM dependencies — transfers cleanly to workers.

### Vite Configuration (SharedArrayBuffer)

```typescript
// vite.config.ts — required headers
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### Worker File

```typescript
// src/engine/workers/mcts.worker.ts
import { mctsPeggingPlay } from '../ai-mcts';

self.onmessage = (event: MessageEvent) => {
  const { myHand, pile, count, knownCards, timeBudgetMs } = event.data;
  const knownSet = new Set<string>(knownCards);
  const result = mctsPeggingPlay(myHand, pile, count, knownSet, timeBudgetMs);
  self.postMessage({ result });
};
```

### React Hook

```typescript
// src/hooks/useMctsWorker.ts
export function useMctsWorker() {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../engine/workers/mcts.worker.ts', import.meta.url),
      { type: 'module' }
    );
    return () => workerRef.current?.terminate();
  }, []);

  const getBestPlay = useCallback(
    (myHand: Card[], pile: Card[], count: number,
     knownCards: string[]): Promise<Card | null> => {
      return new Promise((resolve) => {
        workerRef.current!.onmessage = (e) => resolve(e.data.result);
        workerRef.current!.postMessage({
          myHand, pile, count, knownCards, timeBudgetMs: 500,
        });
      });
    }, []
  );

  return { getBestPlay };
}
```

---

## Zobrist Hashing

For transposition tables in pegging search — avoids re-evaluating identical positions reached via different play orderings.

```typescript
const ZOBRIST_TABLE: Record<string, bigint> = {};
const MAX_PILE = 8;

function initZobristTable(deck: Card[]): void {
  for (const card of deck) {
    for (let pos = 0; pos < MAX_PILE; pos++) {
      ZOBRIST_TABLE[`${card.id}:${pos}`] =
        BigInt(Math.floor(Math.random() * 2**53)) |
        (BigInt(Math.floor(Math.random() * 2**53)) << 32n);
    }
  }
}

function hashPeggingState(pile: readonly Card[], count: number): bigint {
  let hash = BigInt(count);
  for (let i = 0; i < pile.length; i++) {
    hash ^= ZOBRIST_TABLE[`${pile[i].id}:${i}`];
  }
  return hash;
}

const transpositionTable = new Map<bigint, number>();
```

---

## Parameter Tuning

| Parameter | Starting Value | Range to Test | Notes |
|-----------|---------------|---------------|-------|
| C (UCT constant) | 1.41 (sqrt(2)) | 0.5, 1.0, 1.41, 2.0 | Lower = more exploitation |
| Time budget (AI) | 500ms | 200-1000ms | Must not block UI |
| Time budget (coaching) | 1500ms | 500-3000ms | Quality > speed |
| Min iterations | 100 | 50-200 | Below 50 = too noisy |
| Rollout policy | Heuristic (aiSelectPlay) | Heuristic vs random | Heuristic always better for cribbage |

**Strategy fusion warning:** ISMCTS evaluates moves as if AI knows opponent's exact hand per determinization. This produces slightly overconfident plays. Acceptable for SKUNK'D; use Extended PIMC if accuracy is critical.

---

## CFR / MCCFR Reference

### Regret Matching Formula

Track per-action cumulative regret. Play proportional to positive regret:

```
sigma(a) = max(R(a), 0) / sum(max(R(a'), 0) for all a')
```

If all regrets are non-positive, play uniformly. Average strategies converge to Nash
equilibrium at rate O(1/sqrt(T)).

### MCCFR Variants (Lanctot et al. 2009)

| Variant | Sampling | Variance | Per-iteration cost | Best for |
|---------|----------|----------|-------------------|----------|
| Outcome sampling | One trajectory | Highest | Fastest | Large games |
| External sampling | Opponent + chance | Medium | Moderate | Balanced |
| Chance sampling | Card deals only | Lowest | Slowest | Fixed-card tractable |

For cribbage pegging: external sampling recommended — enumerate own actions (at most 4
cards), sample opponent responses.
