# Independent Show-Phase Pacing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let each multiplayer player advance through scoring screens at their own pace, with a mutual ready-gate only at "Next Hand."

**Architecture:** Stop broadcasting `ADVANCE_SHOW` in online mode (scoring is deterministic, so local-only dispatch keeps engines in sync). Add a new `ready_next_hand` broadcast type. Track local/opponent readiness with two booleans in GameScreen state. When both are ready, both dispatch `NEXT_HAND` locally. HandSummary gets a new `waitingForOpponent` prop to show waiting UI.

**Tech Stack:** React state + Supabase Broadcast (existing channel), no new dependencies.

---

### Task 1: Add `ready_next_hand` to OnlineBroadcast type

**Files:**
- Modify: `src/components/game/GameScreen.tsx:34-38`

**Step 1: Add the new type to the union**

```typescript
type OnlineBroadcast =
  | { type: 'deal_complete'; handNumber: number; creatorHand: Card[]; starter: Card; handId: string }
  | { type: 'joiner_ready'; joinerHand: Card[] }
  | { type: 'game_action'; action: GameAction }
  | { type: 'game_complete'; winnerIndex: number }
  | { type: 'ready_next_hand' };
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors (new type is additive, no breaking change)

---

### Task 2: Add ready-gate state and reset logic

**Files:**
- Modify: `src/components/game/GameScreen.tsx:60-64` (near existing state declarations)

**Step 1: Add ready-gate state variables**

After the existing state declarations (around line 63), add:

```typescript
const [localReadyNextHand, setLocalReadyNextHand] = useState(false);
const [opponentReadyNextHand, setOpponentReadyNextHand] = useState(false);
```

**Step 2: Reset ready flags when phase leaves HAND_COMPLETE**

Add a `useEffect` that resets both flags whenever `phase` changes away from `HAND_COMPLETE`:

```typescript
// Reset ready-gate when advancing past HAND_COMPLETE
useEffect(() => {
  if (phase !== 'HAND_COMPLETE') {
    setLocalReadyNextHand(false);
    setOpponentReadyNextHand(false);
  }
}, [phase]);
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 3: Handle incoming `ready_next_hand` broadcast

**Files:**
- Modify: `src/components/game/GameScreen.tsx:248-252` (the `game_action` case in `onRemoteAction`)

**Step 1: Add `ready_next_hand` case to the broadcast handler**

In the `onRemoteAction` handler's switch statement (around line 205), add a new case **before** `game_action`:

```typescript
case 'ready_next_hand': {
  setOpponentReadyNextHand(true);
  break;
}
```

**Step 2: Filter out remote `ADVANCE_SHOW` actions**

In the `game_action` case (line 248-252), skip `ADVANCE_SHOW` in online mode so stale/accidental broadcasts don't force-advance the local player:

```typescript
case 'game_action': {
  // In online mode, ignore ADVANCE_SHOW — each player advances locally
  if (gameMode === 'online' && (msg.action as GameAction).type === 'ADVANCE_SHOW') {
    break;
  }
  dispatchRemoteAction(msg.action);
  break;
}
```

**Step 3: Update the useEffect dependency array**

The `onRemoteAction` useEffect (line 261) already has all needed deps. No change needed — `setOpponentReadyNextHand` is a state setter (stable reference).

**Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 4: Stop broadcasting `ADVANCE_SHOW` in online mode

**Files:**
- Modify: `src/components/game/GameScreen.tsx:392-397` (`handleAdvanceShow`)

**Step 1: Remove the broadcast from `handleAdvanceShow`**

Replace the current `handleAdvanceShow`:

```typescript
const handleAdvanceShow = useCallback(() => {
  // Online: no broadcast — each player advances scoring screens independently
  advanceShow();
}, [advanceShow]);
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 5: Implement ready-gate in `handleNextHand`

**Files:**
- Modify: `src/components/game/GameScreen.tsx:399-404` (`handleNextHand`)

**Step 1: Replace `handleNextHand` with ready-gate logic**

```typescript
const handleNextHand = useCallback(() => {
  if (gameMode === 'online') {
    // Signal readiness to opponent
    setLocalReadyNextHand(true);
    channel.broadcastAction({ type: 'ready_next_hand' });
    return; // Don't advance yet — wait for opponent
  }
  nextHand();
}, [nextHand, gameMode, channel]);
```

**Step 2: Add effect to advance when both ready**

Add a `useEffect` that fires `nextHand()` when both players are ready:

```typescript
// Both players ready → advance to next hand
useEffect(() => {
  if (localReadyNextHand && opponentReadyNextHand) {
    nextHand();
  }
}, [localReadyNextHand, opponentReadyNextHand, nextHand]);
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 6: Update HandSummary to show waiting state

**Files:**
- Modify: `src/components/game/HandSummary.tsx:4-18` (props interface)
- Modify: `src/components/game/HandSummary.tsx:176-187` (button render)

**Step 1: Add `waitingForOpponent` prop**

```typescript
export interface HandSummaryProps {
  handNumber: number;
  playerStats: HandStats;
  opponentStats: HandStats;
  playerTotalScore: number;
  opponentTotalScore: number;
  onNextHand: () => void;
  onNewGame?: () => void;
  /** When true, show "Waiting for opponent..." instead of "Next Hand" */
  waitingForOpponent?: boolean;
  className?: string;
}
```

**Step 2: Update the button to show waiting state**

Replace the "Next Hand" button (lines 177-187):

```tsx
<button
  className={cn(
    'w-full rounded-xl py-3.5 px-6 font-bold text-base',
    'transition-all duration-150',
    waitingForOpponent
      ? 'bg-white/10 text-cream/50 cursor-not-allowed'
      : 'bg-gold text-skunk-dark shadow-lg shadow-gold/20 hover:bg-gold-bright active:scale-[0.97]',
  )}
  onClick={onNextHand}
  disabled={waitingForOpponent}
  data-testid="next-hand-btn"
>
  {waitingForOpponent ? 'Waiting for opponent...' : 'Next Hand'}
</button>
```

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 7: Wire `waitingForOpponent` prop from GameScreen

**Files:**
- Modify: `src/components/game/GameScreen.tsx:675-681` (HandSummary render in HAND_COMPLETE block)

**Step 1: Pass the waiting prop to HandSummary**

```tsx
<HandSummary
  handNumber={handNumber}
  playerStats={handStats[humanPlayerIndex]}
  opponentStats={handStats[opponentPlayerIndex]}
  playerTotalScore={player.score}
  opponentTotalScore={opponent.score}
  onNextHand={handleNextHand}
  waitingForOpponent={gameMode === 'online' && localReadyNextHand && !opponentReadyNextHand}
/>
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: 0 errors

---

### Task 8: Write tests for the ready-gate behavior

**Files:**
- Create: `src/components/game/__tests__/showPacingOnline.test.tsx`

**Step 1: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HandSummary } from '../HandSummary';

const baseStats = { pegging: 2, hand: 6, crib: 4 };

describe('HandSummary waiting state', () => {
  it('shows "Next Hand" when not waiting', () => {
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={vi.fn()}
      />
    );
    const btn = screen.getByTestId('next-hand-btn');
    expect(btn).toHaveTextContent('Next Hand');
    expect(btn).not.toBeDisabled();
  });

  it('shows "Waiting for opponent..." when waitingForOpponent is true', () => {
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={vi.fn()}
        waitingForOpponent
      />
    );
    const btn = screen.getByTestId('next-hand-btn');
    expect(btn).toHaveTextContent('Waiting for opponent...');
    expect(btn).toBeDisabled();
  });

  it('does not call onNextHand when disabled', () => {
    const onNextHand = vi.fn();
    render(
      <HandSummary
        handNumber={1}
        playerStats={baseStats}
        opponentStats={baseStats}
        playerTotalScore={12}
        opponentTotalScore={12}
        onNextHand={onNextHand}
        waitingForOpponent
      />
    );
    fireEvent.click(screen.getByTestId('next-hand-btn'));
    expect(onNextHand).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run the test to verify it passes**

Run: `npm run test -- src/components/game/__tests__/showPacingOnline.test.tsx`
Expected: 3 tests PASS

---

### Task 9: Run full verification suite

**Step 1: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

**Step 2: Lint**

Run: `npm run lint`
Expected: 0 new warnings

**Step 3: Full test suite**

Run: `npm run test`
Expected: All tests pass (366 existing + 3 new = 369)

**Step 4: Production build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 10: Commit

**Step 1: Stage and commit**

```bash
git add src/components/game/GameScreen.tsx src/components/game/HandSummary.tsx src/components/game/__tests__/showPacingOnline.test.tsx docs/plans/2026-02-26-independent-show-pacing-design.md docs/plans/2026-02-26-independent-show-pacing.md
git commit -m "feat(multiplayer): independent show-phase pacing with ready gate

Each player advances through scoring screens at their own pace.
Only Next Hand requires both players to be ready.
Adds ready_next_hand broadcast type and waiting UI."
```
