# Milestone 1: "Ship It" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the gaps that prevent the current multiplayer experience from working correctly end-to-end.

**Architecture:** Five focused tasks — one DB migration push, one engine bug fix, one UI feature, and two live verification tasks. No new dependencies.

**Tech Stack:** Supabase CLI (migration push), TypeScript (engine + components), React (GameOver UI), Vitest (TDD)

---

## Task 1: Apply Migration 008 to Remote Supabase DB

**Files:**
- Reference: `supabase/migrations/008_hand_performance_stats.sql`

**Step 1: Verify the migration exists locally**

```bash
cat supabase/migrations/008_hand_performance_stats.sql
```
Expected: SQL adding 10 columns to `user_stats` table (total_pegging_points, total_hand_points, etc.)

**Step 2: Check Supabase link status**

```bash
npx supabase projects list
```
Confirm the project is linked. If not linked:
```bash
npx supabase link --project-ref <your-project-ref>
```
Find `<your-project-ref>` in Supabase dashboard URL: `https://supabase.com/dashboard/project/<ref>`

**Step 3: Push the migration**

```bash
npx supabase db push
```
Expected output: `Applying migration 008_hand_performance_stats.sql...` then `Done.`

If it asks for a password, use the database password from the Supabase dashboard → Project Settings → Database.

**Step 4: Verify columns exist in remote DB**

In Supabase Dashboard → Table Editor → `user_stats` table, confirm these columns exist:
- `total_pegging_points`, `total_hand_points`, `total_crib_points`
- `total_hands_played`, `best_pegging`, `best_hand_score`, `best_crib_score`
- `optimal_discards`, `total_discards`, `total_ev_deficit`

**Step 5: Commit (no code changed — migration was already in repo)**

```bash
git add -A
git commit -m "chore: confirm migration 008 applied to remote DB"
```

---

## Task 2: Fix decisionLog Clearing in Online Mode

**Context:** `handleLoadOnlineDeal` in `src/engine/gameState.ts` sets `decisionLog: []`, clearing the AI's discard decision history. Online games need to preserve the log so HandReview and coaching can explain discard decisions.

**Files:**
- Modify: `src/engine/gameState.ts` (line ~519)
- Test: `src/engine/__tests__/gameState.branches.test.ts`

**Step 1: Write the failing test**

Add to `src/engine/__tests__/gameState.branches.test.ts`, inside the existing `LOAD_ONLINE_DEAL` describe block:

```ts
it('preserves existing decisionLog entries when loading online deal', () => {
  const prior = makeState({
    phase: 'DEALING',
    decisionLog: [
      { type: 'discard', playerIndex: 0, cardIds: ['A-H', '2-H'], reasoning: 'test' },
    ],
  });
  const hand0: Card[] = [
    createCard('3', 'H'), createCard('4', 'H'), createCard('5', 'H'),
    createCard('6', 'H'), createCard('7', 'H'), createCard('8', 'H'),
  ];
  const hand1: Card[] = [
    createCard('9', 'S'), createCard('10', 'S'), createCard('J', 'S'),
    createCard('Q', 'S'), createCard('K', 'S'), createCard('A', 'S'),
  ];
  const next = gameReducer(prior, {
    type: 'LOAD_ONLINE_DEAL',
    hands: [hand0, hand1],
    starter: createCard('2', 'D'),
    dealerIndex: 0,
    handNumber: 2,
  });
  expect(next.decisionLog).toHaveLength(1);
  expect(next.decisionLog[0].type).toBe('discard');
});
```

**Step 2: Run the test to verify it fails**

```bash
npx vitest run src/engine/__tests__/gameState.branches.test.ts --reporter=verbose 2>&1 | grep -A5 "preserves existing decisionLog"
```
Expected: FAIL — `expect(received).toHaveLength(1)` receives 0.

**Step 3: Fix the engine**

In `src/engine/gameState.ts`, find `handleLoadOnlineDeal` (~line 500). Remove `decisionLog: []`:

```ts
// BEFORE (line ~519):
    decisionLog: [],

// AFTER: delete that line entirely — decisionLog spreads from ...state
```

The function becomes:
```ts
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
    // decisionLog intentionally NOT reset — preserve AI discard history for coaching
  };
}
```

**Step 4: Run the test to verify it passes**

```bash
npx vitest run src/engine/__tests__/gameState.branches.test.ts --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|preserves)"
```
Expected: PASS

**Step 5: Run full suite to confirm no regressions**

```bash
npm run test 2>&1 | tail -5
```
Expected: `680 passed` (or more if new test added to count).

**Step 6: Commit**

```bash
git add src/engine/gameState.ts src/engine/__tests__/gameState.branches.test.ts
git commit -m "fix: preserve decisionLog across online deal loads for coaching accuracy"
```

---

## Task 3: Rematch Flow

**Context:** After GAME_OVER, "Play Again" calls `newGame()` which works fine for local play. For online play, both players need to start a fresh game together without re-sharing a link. The approach:
- **Local mode**: "Play Again" button already works — no change needed.
- **Online mode**: Add a "Rematch" button. Creator clicks it → creates a new game via API → broadcasts the new invite code on the existing channel before it closes → joiner's client auto-navigates to the new game.

**Files:**
- Modify: `src/components/game/GameOver.tsx` (add `onRematch` prop)
- Modify: `src/components/game/ActiveGameLayout.tsx` (wire `onRematch` prop through)
- Modify: `src/components/game/GameScreen.tsx` (implement rematch logic)
- Test: `src/components/game/__tests__/GameOver.test.tsx`

**Step 1: Write the failing test**

In `src/components/game/__tests__/GameOver.test.tsx`, add:

```tsx
it('renders Rematch button when onRematch prop is provided', () => {
  render(
    <GameOver
      winnerIndex={0}
      playerScore={121}
      opponentScore={80}
      onPlayAgain={vi.fn()}
      onRematch={vi.fn()}
    />
  );
  expect(screen.getByTestId('rematch-btn')).toBeInTheDocument();
  expect(screen.getByTestId('rematch-btn')).toHaveTextContent('Rematch');
});

it('calls onRematch when Rematch button is clicked', () => {
  const onRematch = vi.fn();
  render(
    <GameOver
      winnerIndex={0}
      playerScore={121}
      opponentScore={80}
      onPlayAgain={vi.fn()}
      onRematch={onRematch}
    />
  );
  fireEvent.click(screen.getByTestId('rematch-btn'));
  expect(onRematch).toHaveBeenCalledOnce();
});

it('does not render Rematch button when onRematch is not provided', () => {
  render(
    <GameOver
      winnerIndex={0}
      playerScore={121}
      opponentScore={80}
      onPlayAgain={vi.fn()}
    />
  );
  expect(screen.queryByTestId('rematch-btn')).not.toBeInTheDocument();
});
```

**Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/game/__tests__/GameOver.test.tsx --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|Rematch)"
```
Expected: 3 FAIL — `onRematch` prop doesn't exist yet.

**Step 3: Add `onRematch` to GameOver**

In `src/components/game/GameOver.tsx`:

```tsx
// Add to GameOverProps interface (after onPlayAgain):
  /** Called when user requests a rematch (online mode only) */
  onRematch?: () => void;

// Accept in destructure:
export function GameOver({
  ...
  onRematch,
  ...
}: GameOverProps) {

// Add button after the "Play Again" button (before onViewStats check):
  {onRematch && (
    <button
      className={cn(
        'w-full rounded-xl py-3.5 px-6 font-bold text-base',
        'transition-all duration-150 active:scale-[0.97]',
        'bg-skunk-green/20 text-skunk-green border border-skunk-green/40',
        'hover:bg-skunk-green/30',
      )}
      onClick={onRematch}
      data-testid="rematch-btn"
    >
      Rematch
    </button>
  )}
```

**Step 4: Wire `onRematch` through ActiveGameLayout**

In `src/components/game/ActiveGameLayout.tsx`:

```tsx
// Add to props interface:
  onRematch?: () => void;

// Accept and forward to GameOver:
export function ActiveGameLayout({ ..., onRematch, ... }) {
  ...
  // In the GameOver render:
  <GameOver
    ...
    onRematch={onRematch}
  />
```

**Step 5: Implement rematch logic in GameScreen**

In `src/components/game/GameScreen.tsx`, add a `handleRematch` callback and pass it to `ActiveGameLayout` only when `gameMode === 'online'`:

```tsx
const handleRematch = useCallback(async () => {
  if (!activeOnlineGame) return;
  try {
    // Create a fresh game via API
    const { game } = await createGame('vs_human');
    // Broadcast the new invite code to opponent before channel closes
    broadcastAction({ type: 'rematch', inviteCode: game.invite_code } as never);
    // Reset local state and enter the new game as creator (seat 0)
    newGame();
    setGameMode('online');
    setLocalPlayerSeat(0);
    setPendingOnlineGame({ gameId: game.id, inviteCode: game.invite_code });
    setOnlineStep('waiting');
  } catch {
    // Fallback: just return to menu
    returnToMenu();
  }
}, [activeOnlineGame, broadcastAction, newGame, returnToMenu]);
```

Add handler for incoming `rematch` broadcast in the `onRemoteAction` effect:
```tsx
// Inside the onRemoteAction useEffect or channel message handler:
if (msg.type === 'rematch' && gameMode === 'online') {
  // Joiner auto-navigates to the new game
  navigate(`/join/${msg.inviteCode}`);
}
```

Pass to ActiveGameLayout:
```tsx
<ActiveGameLayout
  ...
  onRematch={gameMode === 'online' ? handleRematch : undefined}
/>
```

**Step 6: Run the tests**

```bash
npx vitest run src/components/game/__tests__/GameOver.test.tsx --reporter=verbose 2>&1 | tail -10
```
Expected: All tests pass including the 3 new ones.

**Step 7: Run full suite**

```bash
npm run test 2>&1 | tail -5
```
Expected: All passing.

**Step 8: Commit**

```bash
git add src/components/game/GameOver.tsx src/components/game/ActiveGameLayout.tsx src/components/game/GameScreen.tsx src/components/game/__tests__/GameOver.test.tsx
git commit -m "feat: add Rematch button to Game Over screen (online mode auto-invites opponent)"
```

---

## Task 4: Live E2E Multiplayer Re-Test

**Context:** The multiplayer flow was last tested live before the show pacing and seat bug fixes. Verify it works on the deployed Vercel app.

**Setup:** Two browsers (or devices) logged in as different users. One creates a game, one joins via invite code.

**Checklist:**

- [ ] Creator presses "Play Online" → "Create Game" → invite code appears in waiting screen
- [ ] Joiner navigates to `/join/:code` → "Accept Challenge" → both see DISCARD_TO_CRIB phase
- [ ] Each player discards 2 cards → both advance to PEGGING
- [ ] Pegging works: cards played by each player appear on opponent's screen
- [ ] Go / 31 / pairs / runs all score correctly
- [ ] Show phase: each player advances independently (no broadcast of ADVANCE_SHOW)
- [ ] "Waiting for opponent..." button shows when opponent hasn't advanced yet
- [ ] Hand complete → "Next Hand" gate works (both must confirm before next hand starts)
- [ ] GAME_OVER: winner overlay shows on both screens
- [ ] Post-game stats save correctly (check Supabase `user_stats` table for both users)
- [ ] Disconnect overlay: close one browser mid-game → other player sees "Opponent disconnected"
- [ ] Rematch: click Rematch on Game Over → opponent's browser auto-navigates to new join URL

**If any check fails:** Note the failure and open a bug fix task.

---

## Task 5: Verify Post-Game Summary Charts in Prod

**Context:** PostGameSummary page uses Recharts with data from `handStatsHistory`. After migration 008, the DB should store per-hand stats for real games.

**Setup:** Play a full game vs AI or online. On Game Over screen, click "View Game Stats".

**Checklist:**

- [ ] PostGameSummary page loads without crashing
- [ ] Score Breakdown chart renders (stacked bar: pegging / hand / crib per hand)
- [ ] Hand-by-Hand chart shows scores over time
- [ ] Averages & Bests panel shows non-zero values
- [ ] Discard Strategy Review shows at least one hand's discard reasoning
- [ ] Stats page (`/stats`) shows updated averages including pegging/hand/crib breakdown

**If charts are blank/zero after a real game:** Check browser console for errors. The most likely cause is `handStatsHistory` not being passed through to the PostGameSummary route — check how GameScreen navigates to `/game-stats` and what state it passes.

---

## Final Verification

After all tasks:

```bash
npm run typecheck && npm run lint src/ && npm run test && npm run build
```

All should pass with zero errors.

Push to master for Vercel auto-deploy:
```bash
git push
```
