# Post-Game Summary & Cumulative Stats — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a detailed post-game summary screen with per-hand scoring charts, averages/bests, and discard strategy review — plus extend the cumulative stats page with lifetime performance metrics.

**Architecture:** Engine already has `decisionLog` with dealt hands + discard choices. Add `handStatsHistory` to GameState to persist per-hand scoring across hands. New `PostGameSummary` screen with Recharts accessed via "View Game Stats" button on GameOver. Extend Supabase `stats` table + `record_game_result` RPC for cumulative averages. Pure data — no LLM.

**Tech Stack:** React 18, TypeScript, Recharts, Vitest, Supabase (Postgres RPC + migration)

---

## Phase 1: Engine — handStatsHistory

### Task 1: Add HandStatsSnapshot type and handStatsHistory to GameState

**Files:**
- Modify: `src/engine/types.ts:87-117`
- Test: `src/engine/__tests__/gameState.test.ts`

**Step 1: Write the failing test**

Add to `src/engine/__tests__/gameState.test.ts`:

```typescript
describe('handStatsHistory', () => {
  it('starts with empty handStatsHistory', () => {
    const state = createGame(2);
    expect(state.handStatsHistory).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/__tests__/gameState.test.ts`
Expected: FAIL — `handStatsHistory` property doesn't exist

**Step 3: Add types and update createGame**

In `src/engine/types.ts`, after the `HandStats` interface (line 91), add:

```typescript
export interface HandStatsSnapshot {
  readonly handNumber: number;
  readonly dealerIndex: number;
  readonly stats: readonly HandStats[];
  readonly starterCard: Card;
}
```

Add to `GameState` interface (after `decisionLog`):

```typescript
readonly handStatsHistory: readonly HandStatsSnapshot[];
```

In `src/engine/gameState.ts`, update `createGame` return to include:

```typescript
handStatsHistory: [],
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/__tests__/gameState.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/gameState.ts src/engine/__tests__/gameState.test.ts
git commit -m "feat(engine): add HandStatsSnapshot type and handStatsHistory to GameState"
```

---

### Task 2: Append handStatsHistory at HAND_COMPLETE

**Files:**
- Modify: `src/engine/gameState.ts:471` (handleAdvanceShow SHOW_CRIB case)
- Modify: `src/engine/gameState.ts:449,459` (GAME_OVER returns from show phases)
- Test: `src/engine/__tests__/gameState.test.ts`

**Step 1: Write the failing test**

```typescript
it('appends to handStatsHistory when reaching HAND_COMPLETE', () => {
  // Set up a game at SHOW_CRIB phase with known stats
  let state = createGame(2);
  state = gameReducer(state, { type: 'DEAL' });
  // Discard for both players
  const p0Cards = state.players[0].hand.slice(0, 2).map(c => c.id);
  state = gameReducer(state, { type: 'DISCARD', playerIndex: 0, cardIds: p0Cards });
  const p1Cards = state.players[1].hand.slice(0, 2).map(c => c.id);
  state = gameReducer(state, { type: 'DISCARD', playerIndex: 1, cardIds: p1Cards });
  // Cut
  state = gameReducer(state, { type: 'CUT' });
  // Play all pegging cards (play/go until done)
  while (state.phase === 'PEGGING') {
    const currentPlayer = state.pegging.currentPlayerIndex;
    const playable = state.pegging.playerCards[currentPlayer];
    if (playable.length > 0) {
      const canPlayCard = playable.find(c => state.pegging.count + cardValue(c.rank) <= 31);
      if (canPlayCard) {
        state = gameReducer(state, { type: 'PLAY_CARD', playerIndex: currentPlayer, cardId: canPlayCard.id });
      } else {
        state = gameReducer(state, { type: 'DECLARE_GO', playerIndex: currentPlayer });
      }
    } else {
      state = gameReducer(state, { type: 'DECLARE_GO', playerIndex: currentPlayer });
    }
  }
  // Advance through show phases
  expect(state.phase).toBe('SHOW_NONDEALER');
  state = gameReducer(state, { type: 'ADVANCE_SHOW' }); // → SHOW_DEALER
  state = gameReducer(state, { type: 'ADVANCE_SHOW' }); // → SHOW_CRIB
  state = gameReducer(state, { type: 'ADVANCE_SHOW' }); // → HAND_COMPLETE

  if (state.phase === 'HAND_COMPLETE') {
    expect(state.handStatsHistory).toHaveLength(1);
    expect(state.handStatsHistory[0].handNumber).toBe(1);
    expect(state.handStatsHistory[0].stats).toHaveLength(2);
    expect(state.handStatsHistory[0].starterCard).toBeDefined();
  }
  // If GAME_OVER (someone hit 121), handStatsHistory should still be appended
  if (state.phase === 'GAME_OVER') {
    expect(state.handStatsHistory).toHaveLength(1);
  }
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/engine/__tests__/gameState.test.ts`
Expected: FAIL — handStatsHistory is empty

**Step 3: Implement — snapshot handStats at phase transitions**

In `handleAdvanceShow`, before every return that transitions to `HAND_COMPLETE` or `GAME_OVER`, create and append the snapshot:

```typescript
// Helper function — add near the other helpers at bottom of file
function appendHandStatsSnapshot(state: GameState, handStats: readonly HandStats[]): readonly HandStatsSnapshot[] {
  const snapshot: HandStatsSnapshot = {
    handNumber: state.handNumber,
    dealerIndex: state.dealerIndex,
    stats: handStats,
    starterCard: state.starter!,
  };
  return [...state.handStatsHistory, snapshot];
}
```

Then in each `SHOW_CRIB` case and every `GAME_OVER` return in `handleAdvanceShow`, add `handStatsHistory: appendHandStatsSnapshot(state, newHandStats)` to the returned state.

Specifically update these returns:
- `SHOW_NONDEALER` GAME_OVER return (~line 449)
- `SHOW_DEALER` GAME_OVER return (~line 459)
- `SHOW_CRIB` GAME_OVER return (~line 469)
- `SHOW_CRIB` HAND_COMPLETE return (~line 471)

Also ensure `handleNextHand` does NOT reset `handStatsHistory` (it currently doesn't touch it since the field is new, but verify). And ensure `handleLoadOnlineDeal` does NOT clear `handStatsHistory` (currently it doesn't touch it since the field is new).

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/engine/__tests__/gameState.test.ts`
Expected: PASS

**Step 5: Run full suite**

Run: `npm run test`
Expected: All passing (will need to update createGame calls in other tests if they check shape)

**Step 6: Commit**

```bash
git add src/engine/gameState.ts src/engine/__tests__/gameState.test.ts
git commit -m "feat(engine): append handStatsHistory at HAND_COMPLETE and GAME_OVER"
```

---

### Task 3: Verify handStatsHistory accumulates across multiple hands

**Files:**
- Test: `src/engine/__tests__/gameState.test.ts`

**Step 1: Write the test**

```typescript
it('accumulates handStatsHistory across NEXT_HAND', () => {
  // Play two full hands using a helper
  let state = createGame(2);
  // ... play hand 1 to HAND_COMPLETE (same loop as Task 2)
  // ... assert handStatsHistory.length === 1
  state = gameReducer(state, { type: 'NEXT_HAND' });
  // ... play hand 2 to HAND_COMPLETE
  // ... assert handStatsHistory.length === 2
  expect(state.handStatsHistory[0].handNumber).toBe(1);
  expect(state.handStatsHistory[1].handNumber).toBe(2);
});
```

**Step 2: Run test**

Run: `npm run test -- src/engine/__tests__/gameState.test.ts`
Expected: PASS (should work from Task 2 implementation since NEXT_HAND doesn't clear it)

**Step 3: Commit**

```bash
git add src/engine/__tests__/gameState.test.ts
git commit -m "test(engine): verify handStatsHistory accumulates across hands"
```

---

## Phase 2: Install Recharts

### Task 4: Install recharts

**Step 1: Install**

Run: `npm install recharts`

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install recharts for post-game charts"
```

---

## Phase 3: Post-Game Summary UI Components

### Task 5: ScoreBreakdown component

**Files:**
- Create: `src/components/stats/ScoreBreakdown.tsx`
- Create: `src/components/stats/__tests__/ScoreBreakdown.test.tsx`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBreakdown } from '../ScoreBreakdown';

describe('ScoreBreakdown', () => {
  it('renders total and category scores', () => {
    render(
      <ScoreBreakdown
        totalScore={95}
        totalPegging={28}
        totalHand={52}
        totalCrib={15}
      />
    );
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/stats/__tests__/ScoreBreakdown.test.tsx`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/components/stats/ScoreBreakdown.tsx
import { cn } from '@/lib/utils';

export interface ScoreBreakdownProps {
  totalScore: number;
  totalPegging: number;
  totalHand: number;
  totalCrib: number;
  className?: string;
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-cream/60 text-sm">{label}</span>
      <span className="text-cream font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function ScoreBreakdown({ totalScore, totalPegging, totalHand, totalCrib, className }: ScoreBreakdownProps) {
  return (
    <div className={cn('rounded-xl bg-white/5 border border-white/10 p-4', className)}>
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
        <span className="text-cream/80 font-semibold">Total Score</span>
        <span className="text-2xl font-black tabular-nums" style={{ color: '#d4a843' }}>{totalScore}</span>
      </div>
      <StatRow label="Pegging Points" value={totalPegging} />
      <StatRow label="Hand Points" value={totalHand} />
      <StatRow label="Crib Points" value={totalCrib} />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/stats/__tests__/ScoreBreakdown.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/stats/ScoreBreakdown.tsx src/components/stats/__tests__/ScoreBreakdown.test.tsx
git commit -m "feat(ui): add ScoreBreakdown component for post-game summary"
```

---

### Task 6: HandByHandChart component

**Files:**
- Create: `src/components/stats/HandByHandChart.tsx`
- Create: `src/components/stats/__tests__/HandByHandChart.test.tsx`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandByHandChart } from '../HandByHandChart';
import type { HandStatsSnapshot } from '@/engine/types';

// Minimal mock data — 3 hands
const mockHistory: HandStatsSnapshot[] = [
  { handNumber: 1, dealerIndex: 0, stats: [{ pegging: 3, hand: 8, crib: 4 }, { pegging: 2, hand: 6, crib: 0 }], starterCard: { id: '5-H', rank: '5', suit: 'H' } },
  { handNumber: 2, dealerIndex: 1, stats: [{ pegging: 1, hand: 4, crib: 0 }, { pegging: 5, hand: 10, crib: 3 }], starterCard: { id: 'K-S', rank: 'K', suit: 'S' } },
  { handNumber: 3, dealerIndex: 0, stats: [{ pegging: 4, hand: 6, crib: 2 }, { pegging: 0, hand: 12, crib: 0 }], starterCard: { id: '7-D', rank: '7', suit: 'D' } },
];

describe('HandByHandChart', () => {
  it('renders toggle buttons for TOTAL, PEGGING, HAND, CRIB', () => {
    render(<HandByHandChart history={mockHistory} playerIndex={0} />);
    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    expect(screen.getByText('PEG')).toBeInTheDocument();
    expect(screen.getByText('HAND')).toBeInTheDocument();
    expect(screen.getByText('CRIB')).toBeInTheDocument();
  });

  it('defaults to TOTAL view', () => {
    render(<HandByHandChart history={mockHistory} playerIndex={0} />);
    const totalBtn = screen.getByText('TOTAL');
    expect(totalBtn).toHaveClass('bg-gold');
  });

  it('switches active category on click', () => {
    render(<HandByHandChart history={mockHistory} playerIndex={0} />);
    fireEvent.click(screen.getByText('PEG'));
    expect(screen.getByText('PEG')).toHaveClass('bg-gold');
    expect(screen.getByText('TOTAL')).not.toHaveClass('bg-gold');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/stats/__tests__/HandByHandChart.test.tsx`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/components/stats/HandByHandChart.tsx
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import type { HandStatsSnapshot } from '@/engine/types';

type Category = 'total' | 'pegging' | 'hand' | 'crib';

export interface HandByHandChartProps {
  history: readonly HandStatsSnapshot[];
  playerIndex: number;
  className?: string;
}

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'total', label: 'TOTAL' },
  { key: 'pegging', label: 'PEG' },
  { key: 'hand', label: 'HAND' },
  { key: 'crib', label: 'CRIB' },
];

export function HandByHandChart({ history, playerIndex, className }: HandByHandChartProps) {
  const [category, setCategory] = useState<Category>('total');

  const data = history.map(h => {
    const s = h.stats[playerIndex];
    return {
      hand: h.handNumber,
      total: s.pegging + s.hand + s.crib,
      pegging: s.pegging,
      hand: s.hand,
      crib: s.crib,
    };
  });

  return (
    <div className={cn('rounded-xl bg-white/5 border border-white/10 p-4', className)}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="hand" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8 }}
            labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
            itemStyle={{ color: '#d4a843' }}
          />
          <Line
            type="monotone"
            dataKey={category}
            stroke="#d4a843"
            strokeWidth={2}
            dot={{ fill: '#d4a843', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Toggle buttons */}
      <div className="flex gap-2 mt-3 justify-center">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
              category === c.key
                ? 'bg-gold text-skunk-dark'
                : 'bg-white/10 text-cream/50 hover:bg-white/15',
            )}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/stats/__tests__/HandByHandChart.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/stats/HandByHandChart.tsx src/components/stats/__tests__/HandByHandChart.test.tsx
git commit -m "feat(ui): add HandByHandChart with Recharts and category toggles"
```

---

### Task 7: AveragesBests component

**Files:**
- Create: `src/components/stats/AveragesBests.tsx`
- Create: `src/components/stats/__tests__/AveragesBests.test.tsx`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AveragesBests } from '../AveragesBests';

describe('AveragesBests', () => {
  it('renders average and best stats', () => {
    render(
      <AveragesBests
        avgPegging={3.4}
        bestPegging={9}
        avgHand={6.0}
        bestHand={14}
        avgCrib={4.2}
        bestCrib={8}
      />
    );
    expect(screen.getByText('3.4')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('6.0')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/stats/__tests__/AveragesBests.test.tsx`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/components/stats/AveragesBests.tsx
import { cn } from '@/lib/utils';

export interface AveragesBestsProps {
  avgPegging: number;
  bestPegging: number;
  avgHand: number;
  bestHand: number;
  avgCrib: number;
  bestCrib: number;
  className?: string;
}

function Row({ label, avg, best }: { label: string; avg: number | string; best: number }) {
  return (
    <div className="flex items-center py-1.5">
      <span className="text-cream/60 text-sm flex-1">{label}</span>
      <span className="text-cream font-bold tabular-nums w-16 text-right">{avg}</span>
      <span className="text-cream/50 font-bold tabular-nums w-16 text-right">{best}</span>
    </div>
  );
}

export function AveragesBests({ avgPegging, bestPegging, avgHand, bestHand, avgCrib, bestCrib, className }: AveragesBestsProps) {
  return (
    <div className={cn('rounded-xl bg-white/5 border border-white/10 p-4', className)}>
      <div className="flex items-center mb-2 pb-1.5 border-b border-white/10">
        <span className="text-cream/80 font-semibold flex-1">Category</span>
        <span className="text-cream/50 text-xs font-semibold w-16 text-right">AVG</span>
        <span className="text-cream/50 text-xs font-semibold w-16 text-right">BEST</span>
      </div>
      <Row label="Pegging" avg={avgPegging.toFixed(1)} best={bestPegging} />
      <Row label="Hand" avg={avgHand.toFixed(1)} best={bestHand} />
      <Row label="Crib" avg={avgCrib.toFixed(1)} best={bestCrib} />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/stats/__tests__/AveragesBests.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/stats/AveragesBests.tsx src/components/stats/__tests__/AveragesBests.test.tsx
git commit -m "feat(ui): add AveragesBests component for post-game summary"
```

---

### Task 8: DiscardStrategyReview component

**Files:**
- Create: `src/components/stats/DiscardStrategyReview.tsx`
- Create: `src/components/stats/__tests__/DiscardStrategyReview.test.tsx`

This is the most complex component — it computes discard grades by comparing the player's actual choices against `optimalDiscard()`.

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscardStrategyReview } from '../DiscardStrategyReview';
import type { DecisionSnapshot, Card } from '@/engine/types';

// Mock optimalDiscard to control EV values
vi.mock('@/engine/optimal', () => ({
  optimalDiscard: vi.fn().mockReturnValue({
    discard: [{ id: '3-D', rank: '3', suit: 'D' }, { id: '7-C', rank: '7', suit: 'C' }],
    keep: [],
    expectedValue: 9.1,
    reasoning: '',
    allOptions: [
      { discard: [{ id: '3-D', rank: '3', suit: 'D' }, { id: '7-C', rank: '7', suit: 'C' }], keep: [], expectedValue: 9.1 },
      { discard: [{ id: '2-S', rank: '2', suit: 'S' }, { id: '5-H', rank: '5', suit: 'H' }], keep: [], expectedValue: 8.3 },
    ],
  }),
}));

const mockDecisions: DecisionSnapshot[] = [
  {
    type: 'discard',
    hand: [
      { id: '2-S', rank: '2', suit: 'S' }, { id: '3-D', rank: '3', suit: 'D' },
      { id: '5-H', rank: '5', suit: 'H' }, { id: '7-C', rank: '7', suit: 'C' },
      { id: 'K-H', rank: 'K', suit: 'H' }, { id: 'A-S', rank: 'A', suit: 'S' },
    ],
    playerChoice: [{ id: '2-S', rank: '2', suit: 'S' }, { id: '5-H', rank: '5', suit: 'H' }],
    isDealer: true,
    handIndex: 0,
  },
];

describe('DiscardStrategyReview', () => {
  it('renders strategic rounds percentage', () => {
    render(<DiscardStrategyReview decisions={mockDecisions} />);
    expect(screen.getByText(/Strategic Rounds/)).toBeInTheDocument();
  });

  it('renders per-hand discard comparison', () => {
    render(<DiscardStrategyReview decisions={mockDecisions} />);
    expect(screen.getByText(/Hand 1/)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/stats/__tests__/DiscardStrategyReview.test.tsx`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/components/stats/DiscardStrategyReview.tsx
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { optimalDiscard } from '@/engine/optimal';
import { formatCard } from '@/engine/types';
import type { DecisionSnapshot, Card } from '@/engine/types';

export interface DiscardStrategyReviewProps {
  decisions: readonly DecisionSnapshot[];
  className?: string;
}

interface DiscardGrade {
  handIndex: number;
  isDealer: boolean;
  playerDiscard: readonly Card[];
  optimalDiscard: readonly Card[];
  playerEV: number;
  optimalEV: number;
  delta: number;
  isOptimal: boolean;
}

function gradeDiscards(decisions: readonly DecisionSnapshot[]): DiscardGrade[] {
  return decisions
    .filter(d => d.type === 'discard')
    .map(d => {
      const result = optimalDiscard(d.hand as Card[], d.isDealer);
      // Find the player's chosen option in allOptions
      const choiceIds = new Set(d.playerChoice.map(c => c.id));
      const playerOption = result.allOptions.find(opt =>
        opt.discard.every(c => choiceIds.has(c.id))
      );
      const playerEV = playerOption?.expectedValue ?? 0;
      const delta = playerEV - result.expectedValue;
      return {
        handIndex: d.handIndex,
        isDealer: d.isDealer,
        playerDiscard: d.playerChoice,
        optimalDiscard: [...result.discard],
        playerEV,
        optimalEV: result.expectedValue,
        delta,
        isOptimal: Math.abs(delta) < 0.01,
      };
    });
}

export function DiscardStrategyReview({ decisions, className }: DiscardStrategyReviewProps) {
  const grades = useMemo(() => gradeDiscards(decisions), [decisions]);

  if (grades.length === 0) return null;

  const optimalCount = grades.filter(g => g.isOptimal).length;
  const strategicPct = Math.round((optimalCount / grades.length) * 100);
  const avgDeficit = grades.reduce((sum, g) => sum + g.delta, 0) / grades.length;

  return (
    <div className={cn('rounded-xl bg-white/5 border border-white/10 p-4', className)}>
      <h3 className="text-cream/80 font-semibold mb-3">Discard Strategy Review</h3>

      {/* Aggregate metrics */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-white/10">
        <div className="flex-1">
          <div className="text-xs text-cream/50">Strategic Rounds</div>
          <div className="text-lg font-bold" style={{ color: strategicPct >= 70 ? '#39FF14' : strategicPct >= 40 ? '#d4a843' : '#ff4444' }}>
            {strategicPct}%
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-cream/50">Avg EV Deficit</div>
          <div className={cn('text-lg font-bold tabular-nums', avgDeficit >= -0.5 ? 'text-green-400' : 'text-amber-400')}>
            {avgDeficit >= 0 ? '0.0' : avgDeficit.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Per-hand breakdown */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {grades.map(g => (
          <div key={g.handIndex} className="text-sm">
            <div className="flex justify-between items-center">
              <span className="text-cream/60">
                Hand {g.handIndex + 1} ({g.isDealer ? 'Dealer' : 'Pone'})
              </span>
              {g.isOptimal ? (
                <span className="text-green-400 text-xs font-bold">Optimal</span>
              ) : (
                <span className="text-amber-400 text-xs font-bold tabular-nums">{g.delta.toFixed(1)}</span>
              )}
            </div>
            {!g.isOptimal && (
              <div className="text-xs text-cream/40 mt-0.5">
                You: {g.playerDiscard.map(c => c.id).join(', ')} ({g.playerEV.toFixed(1)})
                {' · '}Best: {g.optimalDiscard.map(c => c.id).join(', ')} ({g.optimalEV.toFixed(1)})
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note: The `formatCard` import may need adjusting — if it doesn't exist, use `c.rank + c.suit` or `c.id` for display. Adapt to existing card formatting patterns in the codebase.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/stats/__tests__/DiscardStrategyReview.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/stats/DiscardStrategyReview.tsx src/components/stats/__tests__/DiscardStrategyReview.test.tsx
git commit -m "feat(ui): add DiscardStrategyReview with optimal discard grading"
```

---

### Task 9: PostGameSummary page component

**Files:**
- Create: `src/pages/PostGameSummary.tsx`
- Create: `src/pages/__tests__/PostGameSummary.test.tsx`

This is the container that assembles all the sub-components.

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostGameSummary } from '../PostGameSummary';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    state: {
      playerIndex: 0,
      totalScore: 95,
      handStatsHistory: [
        { handNumber: 1, dealerIndex: 0, stats: [{ pegging: 3, hand: 8, crib: 4 }, { pegging: 2, hand: 6, crib: 0 }], starterCard: { id: '5-H', rank: '5', suit: 'H' } },
      ],
      decisionLog: [],
    },
  }),
}));

vi.mock('@/engine/optimal', () => ({
  optimalDiscard: vi.fn().mockReturnValue({
    discard: [], keep: [], expectedValue: 0, reasoning: '', allOptions: [],
  }),
}));

describe('PostGameSummary', () => {
  it('renders score breakdown section', () => {
    render(<PostGameSummary />);
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<PostGameSummary />);
    expect(screen.getByText('Play Again')).toBeInTheDocument();
    expect(screen.getByText('Main Menu')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/pages/__tests__/PostGameSummary.test.tsx`
Expected: FAIL

**Step 3: Implement**

```typescript
// src/pages/PostGameSummary.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { ScoreBreakdown } from '@/components/stats/ScoreBreakdown';
import { HandByHandChart } from '@/components/stats/HandByHandChart';
import { AveragesBests } from '@/components/stats/AveragesBests';
import { DiscardStrategyReview } from '@/components/stats/DiscardStrategyReview';
import { cn } from '@/lib/utils';
import type { HandStatsSnapshot, DecisionSnapshot } from '@/engine/types';

interface PostGameState {
  playerIndex: number;
  totalScore: number;
  handStatsHistory: HandStatsSnapshot[];
  decisionLog: DecisionSnapshot[];
}

function computeAveragesBests(history: readonly HandStatsSnapshot[], playerIndex: number) {
  if (history.length === 0) return { avgPegging: 0, bestPegging: 0, avgHand: 0, bestHand: 0, avgCrib: 0, bestCrib: 0 };

  let totalPegging = 0, totalHand = 0, totalCrib = 0;
  let bestPegging = 0, bestHand = 0, bestCrib = 0;
  let cribHands = 0;

  for (const h of history) {
    const s = h.stats[playerIndex];
    totalPegging += s.pegging;
    totalHand += s.hand;
    totalCrib += s.crib;
    if (s.pegging > bestPegging) bestPegging = s.pegging;
    if (s.hand > bestHand) bestHand = s.hand;
    if (s.crib > bestCrib) bestCrib = s.crib;
    if (h.dealerIndex === playerIndex) cribHands++;
  }

  return {
    avgPegging: totalPegging / history.length,
    bestPegging,
    avgHand: totalHand / history.length,
    bestHand,
    avgCrib: cribHands > 0 ? totalCrib / cribHands : 0,
    bestCrib,
  };
}

export function PostGameSummary() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const gameData = state as PostGameState | null;

  if (!gameData) {
    navigate('/');
    return null;
  }

  const { playerIndex, totalScore, handStatsHistory, decisionLog } = gameData;
  const avgs = computeAveragesBests(handStatsHistory, playerIndex);

  // Compute total category scores
  const totalPegging = handStatsHistory.reduce((s, h) => s + h.stats[playerIndex].pegging, 0);
  const totalHand = handStatsHistory.reduce((s, h) => s + h.stats[playerIndex].hand, 0);
  const totalCrib = handStatsHistory.reduce((s, h) => s + h.stats[playerIndex].crib, 0);

  return (
    <div
      className="min-h-screen flex flex-col items-center overflow-y-auto py-6 px-4 gap-4"
      style={{ background: '#0D0D1A' }}
    >
      <h1 className="text-cream font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
        Game Summary
      </h1>

      <ScoreBreakdown
        totalScore={totalScore}
        totalPegging={totalPegging}
        totalHand={totalHand}
        totalCrib={totalCrib}
        className="max-w-sm w-full"
      />

      {handStatsHistory.length > 1 && (
        <HandByHandChart
          history={handStatsHistory}
          playerIndex={playerIndex}
          className="max-w-sm w-full"
        />
      )}

      <AveragesBests {...avgs} className="max-w-sm w-full" />

      {decisionLog.length > 0 && (
        <DiscardStrategyReview
          decisions={decisionLog}
          className="max-w-sm w-full"
        />
      )}

      {/* Navigation buttons */}
      <div className="flex flex-col gap-2.5 max-w-sm w-full mt-2">
        <button
          className={cn(
            'w-full rounded-xl py-3.5 px-6 font-bold text-base',
            'bg-gold text-skunk-dark shadow-lg shadow-gold/20 hover:bg-gold-bright',
            'transition-all duration-150 active:scale-[0.97]',
          )}
          onClick={() => navigate('/')}
        >
          Play Again
        </button>
        <button
          className={cn(
            'w-full rounded-xl py-3 px-6 font-semibold text-sm',
            'border border-white/10 text-cream/55',
            'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
          )}
          onClick={() => navigate('/')}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/pages/__tests__/PostGameSummary.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/PostGameSummary.tsx src/pages/__tests__/PostGameSummary.test.tsx
git commit -m "feat(ui): add PostGameSummary page assembling all stats components"
```

---

### Task 10: Add route and wire "View Game Stats" button

**Files:**
- Modify: `src/App.tsx` (or wherever routes are defined)
- Modify: `src/components/game/GameOver.tsx:4-17,152-177`
- Modify: `src/components/game/GameScreen.tsx:865-874` (GameOver render)

**Step 1: Add route**

Find the route definitions (likely in `src/App.tsx` or `src/main.tsx`). Add:

```typescript
import { PostGameSummary } from '@/pages/PostGameSummary';
// In the routes:
<Route path="/game-stats" element={<PostGameSummary />} />
```

**Step 2: Add `onViewStats` prop to GameOver**

In `GameOver.tsx`, add to props interface:

```typescript
onViewStats?: () => void;
```

Add a button between "Play Again" and "Main Menu":

```tsx
{onViewStats && (
  <button
    className={cn(
      'w-full rounded-xl py-3 px-6 font-semibold text-sm',
      'border border-gold/30 text-gold/80',
      'hover:border-gold/50 hover:text-gold transition-all duration-150',
    )}
    onClick={onViewStats}
    data-testid="view-stats-btn"
  >
    View Game Stats
  </button>
)}
```

**Step 3: Wire in GameScreen**

In `GameScreen.tsx`, add a `handleViewGameStats` callback that navigates to `/game-stats` with the game data:

```typescript
const handleViewGameStats = useCallback(() => {
  navigate('/game-stats', {
    state: {
      playerIndex: humanPlayerIndex,
      totalScore: player.score,
      handStatsHistory: gameState.handStatsHistory,
      decisionLog: gameState.decisionLog,
    },
  });
}, [navigate, humanPlayerIndex, player.score, gameState.handStatsHistory, gameState.decisionLog]);
```

Pass it to GameOver:

```tsx
<GameOver
  winnerIndex={winner}
  playerScore={player.score}
  opponentScore={opponent.score}
  onPlayAgain={newGame}
  onMainMenu={returnToMenu}
  onViewStats={handleViewGameStats}
  handsPlayed={handNumber}
/>
```

**Step 4: Verify typecheck + tests**

Run: `npm run typecheck && npm run test`
Expected: All pass

**Step 5: Commit**

```bash
git add src/App.tsx src/components/game/GameOver.tsx src/components/game/GameScreen.tsx
git commit -m "feat: wire PostGameSummary route and View Game Stats button on GameOver"
```

---

## Phase 4: Supabase Schema & RPC

### Task 11: Migration — extend stats table

**Files:**
- Create: `supabase/migrations/008_hand_performance_stats.sql`

**Step 1: Write migration**

```sql
-- Add hand-level performance tracking to stats table
ALTER TABLE public.stats
  ADD COLUMN IF NOT EXISTS total_pegging_points   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hand_points      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_crib_points      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hands_played     INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_pegging           INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_hand_score        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_crib_score        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimal_discards       INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discards         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ev_deficit       REAL NOT NULL DEFAULT 0;

-- Update record_game_result to accept hand performance data
CREATE OR REPLACE FUNCTION public.record_game_result(
  p_won              BOOLEAN,
  p_player_score     INT,
  p_opponent_score   INT,
  p_total_pegging    INT DEFAULT 0,
  p_total_hand       INT DEFAULT 0,
  p_total_crib       INT DEFAULT 0,
  p_hands_played     INT DEFAULT 0,
  p_best_pegging     INT DEFAULT 0,
  p_best_hand        INT DEFAULT 0,
  p_best_crib        INT DEFAULT 0,
  p_optimal_discards INT DEFAULT 0,
  p_total_discards   INT DEFAULT 0,
  p_ev_deficit       REAL DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid UUID;
  v_new_streak INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Compute new streak
  SELECT CASE WHEN p_won THEN COALESCE(current_streak, 0) + 1 ELSE 0 END
    INTO v_new_streak
    FROM public.stats WHERE user_id = v_uid;

  -- If no row, create one
  IF NOT FOUND THEN
    INSERT INTO public.stats (user_id, games_played, wins, losses, current_streak, best_streak,
      skunks_given, skunks_received, double_skunks_given, double_skunks_received,
      total_pegging_points, total_hand_points, total_crib_points, total_hands_played,
      best_pegging, best_hand_score, best_crib_score, optimal_discards, total_discards, total_ev_deficit)
    VALUES (v_uid, 1,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 0 ELSE 1 END,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN p_won THEN 1 ELSE 0 END,
      CASE WHEN NOT p_won AND p_opponent_score < 91 AND p_opponent_score >= 61 THEN 0 ELSE CASE WHEN p_won AND p_player_score >= 121 AND p_opponent_score < 91 AND p_opponent_score >= 61 THEN 1 ELSE 0 END END,
      CASE WHEN NOT p_won AND p_player_score < 91 AND p_player_score >= 61 THEN 1 ELSE 0 END,
      0, 0,
      p_total_pegging, p_total_hand, p_total_crib, p_hands_played,
      p_best_pegging, p_best_hand, p_best_crib,
      p_optimal_discards, p_total_discards, p_ev_deficit);
    RETURN;
  END IF;

  UPDATE public.stats SET
    games_played          = games_played + 1,
    wins                  = wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    losses                = losses + CASE WHEN p_won THEN 0 ELSE 1 END,
    current_streak        = v_new_streak,
    best_streak           = GREATEST(best_streak, v_new_streak),
    skunks_given          = skunks_given + CASE
                              WHEN p_won AND p_opponent_score < 91 AND p_opponent_score >= 61 THEN 1 ELSE 0 END,
    skunks_received       = skunks_received + CASE
                              WHEN NOT p_won AND p_player_score < 91 AND p_player_score >= 61 THEN 1 ELSE 0 END,
    double_skunks_given   = double_skunks_given + CASE
                              WHEN p_won AND p_opponent_score < 61 THEN 1 ELSE 0 END,
    double_skunks_received = double_skunks_received + CASE
                              WHEN NOT p_won AND p_player_score < 61 THEN 1 ELSE 0 END,
    -- Hand performance accumulators
    total_pegging_points  = total_pegging_points + p_total_pegging,
    total_hand_points     = total_hand_points + p_total_hand,
    total_crib_points     = total_crib_points + p_total_crib,
    total_hands_played    = total_hands_played + p_hands_played,
    best_pegging          = GREATEST(best_pegging, p_best_pegging),
    best_hand_score       = GREATEST(best_hand_score, p_best_hand),
    best_crib_score       = GREATEST(best_crib_score, p_best_crib),
    optimal_discards      = optimal_discards + p_optimal_discards,
    total_discards        = total_discards + p_total_discards,
    total_ev_deficit      = total_ev_deficit + p_ev_deficit,
    updated_at            = NOW()
  WHERE user_id = v_uid;
END;
$$;
```

**Step 2: Apply migration to remote**

Run: `npx supabase db push` (or apply via dashboard)

**Step 3: Commit**

```bash
git add supabase/migrations/008_hand_performance_stats.sql
git commit -m "feat(db): migration 008 — hand performance stats columns + enhanced RPC"
```

---

### Task 12: Update statsApi.ts to send hand performance data

**Files:**
- Modify: `src/lib/statsApi.ts:6-18`

**Step 1: Extend RecordGameResultParams**

```typescript
export interface RecordGameResultParams {
  won: boolean;
  playerScore: number;
  opponentScore: number;
  // Hand performance (optional — backwards compatible)
  totalPegging?: number;
  totalHand?: number;
  totalCrib?: number;
  handsPlayed?: number;
  bestPegging?: number;
  bestHand?: number;
  bestCrib?: number;
  optimalDiscards?: number;
  totalDiscards?: number;
  evDeficit?: number;
}
```

**Step 2: Update recordGameResult to pass new params**

```typescript
export async function recordGameResult(params: RecordGameResultParams): Promise<void> {
  const { error } = await supabase.rpc('record_game_result', {
    p_won: params.won,
    p_player_score: params.playerScore,
    p_opponent_score: params.opponentScore,
    p_total_pegging: params.totalPegging ?? 0,
    p_total_hand: params.totalHand ?? 0,
    p_total_crib: params.totalCrib ?? 0,
    p_hands_played: params.handsPlayed ?? 0,
    p_best_pegging: params.bestPegging ?? 0,
    p_best_hand: params.bestHand ?? 0,
    p_best_crib: params.bestCrib ?? 0,
    p_optimal_discards: params.optimalDiscards ?? 0,
    p_total_discards: params.totalDiscards ?? 0,
    p_ev_deficit: params.evDeficit ?? 0,
  });
  if (error) throw new Error(`Failed to record game result: ${error.message}`);
}
```

**Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: 0 errors (new params are optional, existing callers unaffected)

**Step 4: Commit**

```bash
git add src/lib/statsApi.ts
git commit -m "feat(api): extend recordGameResult with hand performance params"
```

---

### Task 13: Send hand performance data at game over

**Files:**
- Modify: `src/components/game/GameScreen.tsx` (the recordGameResult call in the GAME_OVER useEffect)
- Create: `src/lib/gameStatsHelper.ts` (pure function to compute stats from game state)

**Step 1: Create helper**

```typescript
// src/lib/gameStatsHelper.ts
import { optimalDiscard } from '@/engine/optimal';
import type { GameState, DecisionSnapshot } from '@/engine/types';

export interface GamePerformanceStats {
  totalPegging: number;
  totalHand: number;
  totalCrib: number;
  handsPlayed: number;
  bestPegging: number;
  bestHand: number;
  bestCrib: number;
  optimalDiscards: number;
  totalDiscards: number;
  evDeficit: number;
}

export function computeGamePerformance(
  gameState: GameState,
  playerIndex: number,
): GamePerformanceStats {
  const { handStatsHistory, decisionLog } = gameState;

  let totalPegging = 0, totalHand = 0, totalCrib = 0;
  let bestPegging = 0, bestHand = 0, bestCrib = 0;

  for (const h of handStatsHistory) {
    const s = h.stats[playerIndex];
    totalPegging += s.pegging;
    totalHand += s.hand;
    totalCrib += s.crib;
    if (s.pegging > bestPegging) bestPegging = s.pegging;
    if (s.hand > bestHand) bestHand = s.hand;
    if (s.crib > bestCrib) bestCrib = s.crib;
  }

  // Discard accuracy
  const discardDecisions = decisionLog.filter(
    d => d.type === 'discard' && d.handIndex !== undefined
  );
  // Only grade the human player's discards
  const playerDiscards = discardDecisions.filter(
    d => (d.isDealer ? gameState.dealerIndex : (gameState.dealerIndex + 1) % 2) === playerIndex
      || d.handIndex >= 0 // fallback: grade all if we can't determine player
  );

  let optimalCount = 0;
  let totalEvDeficit = 0;

  for (const d of playerDiscards) {
    const result = optimalDiscard([...d.hand], d.isDealer);
    const choiceIds = new Set(d.playerChoice.map(c => c.id));
    const playerOption = result.allOptions.find(opt =>
      opt.discard.every(c => choiceIds.has(c.id))
    );
    const playerEV = playerOption?.expectedValue ?? 0;
    const delta = playerEV - result.expectedValue;
    if (Math.abs(delta) < 0.01) optimalCount++;
    totalEvDeficit += delta;
  }

  return {
    totalPegging,
    totalHand,
    totalCrib,
    handsPlayed: handStatsHistory.length,
    bestPegging,
    bestHand,
    bestCrib,
    optimalDiscards: optimalCount,
    totalDiscards: playerDiscards.length,
    evDeficit: totalEvDeficit,
  };
}
```

**Step 2: Wire into GameScreen's GAME_OVER save effect**

Find the existing `recordGameResult` call in GameScreen.tsx (around line 322-330) and extend it:

```typescript
import { computeGamePerformance } from '@/lib/gameStatsHelper';

// In the GAME_OVER useEffect:
const perfStats = computeGamePerformance(gameState, humanPlayerIndex);
await recordGameResult({
  won: winner === humanPlayerIndex,
  playerScore: player.score,
  opponentScore: opponent.score,
  ...perfStats,
});
```

**Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm run test`
Expected: All pass

**Step 4: Commit**

```bash
git add src/lib/gameStatsHelper.ts src/components/game/GameScreen.tsx
git commit -m "feat: compute and send hand performance stats at game over"
```

---

## Phase 5: Stats Page Enhancements

### Task 14: Add hand performance stats to StatsPage

**Files:**
- Modify: `src/pages/StatsPage.tsx`
- Modify: `src/pages/__tests__/StatsPage.test.tsx`

**Step 1: Write the test**

Add to existing StatsPage tests:

```typescript
it('renders hand performance stats when available', async () => {
  // Mock fetchStats to return stats with hand performance data
  mockFetchStats.mockResolvedValue({
    ...baseStats,
    total_pegging_points: 100,
    total_hand_points: 200,
    total_crib_points: 60,
    total_hands_played: 30,
    best_pegging: 12,
    best_hand_score: 24,
    best_crib_score: 12,
    optimal_discards: 20,
    total_discards: 30,
    total_ev_deficit: -15.5,
  });

  render(<StatsPage />);
  // Wait for data load
  await screen.findByText(/Avg Pegging/);
  expect(screen.getByText('3.3')).toBeInTheDocument(); // 100/30
  expect(screen.getByText('12')).toBeInTheDocument(); // best_pegging
});
```

**Step 2: Add performance stats section to StatsPage**

Below the existing stat rows, add a new section:

```tsx
{/* Hand Performance section — only show if they've tracked hand data */}
{stats.total_hands_played > 0 && (
  <>
    <h3 className="text-cream/60 text-xs font-semibold uppercase tracking-wider mt-6 mb-2">
      Scoring Averages
    </h3>
    <StatRow label="Avg Pegging" value={(stats.total_pegging_points / stats.total_hands_played).toFixed(1)} testId="stats-avg-pegging" />
    <StatRow label="Best Pegging" value={stats.best_pegging} testId="stats-best-pegging" />
    <StatRow label="Avg Hand" value={(stats.total_hand_points / stats.total_hands_played).toFixed(1)} testId="stats-avg-hand" />
    <StatRow label="Best Hand" value={stats.best_hand_score} testId="stats-best-hand" />
    <StatRow label="Avg Crib" value={(stats.total_crib_points / Math.max(1, Math.ceil(stats.total_hands_played / 2))).toFixed(1)} testId="stats-avg-crib" />
    <StatRow label="Best Crib" value={stats.best_crib_score} testId="stats-best-crib" />

    {stats.total_discards > 0 && (
      <>
        <h3 className="text-cream/60 text-xs font-semibold uppercase tracking-wider mt-6 mb-2">
          Discard Accuracy
        </h3>
        <StatRow
          label="Strategic Rounds"
          value={`${Math.round((stats.optimal_discards / stats.total_discards) * 100)}%`}
          testId="stats-strategic-pct"
        />
        <StatRow
          label="Avg EV Deficit"
          value={(stats.total_ev_deficit / stats.total_discards).toFixed(1)}
          testId="stats-ev-deficit"
        />
      </>
    )}
  </>
)}
```

Adjust `StatRow` if needed to accept `string | number` for the value prop.

**Step 3: Run tests**

Run: `npm run test -- src/pages/__tests__/StatsPage.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/StatsPage.tsx src/pages/__tests__/StatsPage.test.tsx
git commit -m "feat(stats): add hand performance and discard accuracy to stats page"
```

---

## Phase 6: Verification & Deploy

### Task 15: Full verification

**Step 1: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

**Step 2: Lint**

Run: `npm run lint`
Expected: 0 new warnings

**Step 3: Full test suite**

Run: `npm run test`
Expected: All pass (369 existing + new tests)

**Step 4: Production build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Push**

Run: `git push origin master`
Expected: Vercel auto-deploys

---

### Task 16: Deploy migration to Supabase

**Step 1: Apply migration**

Run: `npx supabase db push`
Or apply `008_hand_performance_stats.sql` manually via the Supabase SQL editor.

**Step 2: Verify RPC works**

Test in Supabase SQL editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'stats' AND column_name LIKE 'total_%';
```
Expected: Shows `total_pegging_points`, `total_hand_points`, `total_crib_points`, `total_hands_played`, etc.

---

### Task 17: Update session state

Update `.claude/session-state.md` with implementation completion status.
