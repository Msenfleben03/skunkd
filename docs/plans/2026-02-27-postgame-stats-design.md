# Post-Game Summary & Cumulative Stats — Design Document

_Date: 2026-02-27_

## Problem

After a game ends, players see a basic win/loss screen with no detailed breakdown. There's no way to review per-hand performance, identify patterns, or understand discard quality. The stats page only shows win/loss/streak/skunk data — no skill metrics.

## Solution

Add a detailed post-game summary screen (accessed from GameOver) with per-hand scoring charts, averages/bests, and discard strategy review. Extend the cumulative stats page with lifetime averages for these metrics.

## Architecture

### Data Flow

```
Engine (in-memory)          Supabase (persistent)
┌──────────────────┐        ┌─────────────────────┐
│ dealtHands[][]   │        │ hand_cards (online)  │
│ handStatsHistory │───────>│ stats table (cum.)   │
│ discardChoices[] │ write  │                      │
└──────────────────┘ at EOG └─────────────────────┘
        │                            │
        v                            v
┌──────────────────┐        ┌─────────────────────┐
│ PostGameSummary  │        │ StatsPage (enhanced) │
│ (new screen)     │        │ Avg/Best + Accuracy  │
└──────────────────┘        └─────────────────────┘
```

### Screen Flow

```
GAME_OVER
  └─ GameOver component (existing)
       ├─ "Play Again"  (existing)
       ├─ "Main Menu"   (existing)
       └─ "View Game Stats" (NEW) → PostGameSummary screen
```

---

## 1. Engine Changes

### Add `dealtHands` to GameState

Track original 6-card hands before discarding. Needed for local (vs AI) games where there's no Supabase `hand_cards` data.

```typescript
export interface GameState {
  // ... existing fields ...
  readonly dealtHands: readonly (readonly Card[])[];  // [player0's 6, player1's 6]
}
```

Set during `DEAL` action (local) and `LOAD_ONLINE_DEAL` action (online). Cleared on `NEXT_HAND` (re-set on next deal). Persists through the hand for post-game computation.

### Accumulate handStatsHistory

Currently `handStats` is `HandStats[]` (one per player for current hand only). Add a cumulative history:

```typescript
export interface GameState {
  // ... existing fields ...
  readonly handStatsHistory: readonly HandStatsSnapshot[];
}

export interface HandStatsSnapshot {
  readonly handNumber: number;
  readonly dealerIndex: number;
  readonly stats: readonly HandStats[];     // [player0, player1]
  readonly dealtHands: readonly Card[][];   // [player0's 6, player1's 6]
  readonly starterCard: Card;
}
```

Appended at `HAND_COMPLETE` phase transition. Contains everything needed for post-game analysis.

---

## 2. Supabase Schema Changes

### Extend `stats` table

Add columns for cumulative hand-level metrics:

```sql
ALTER TABLE public.stats ADD COLUMN IF NOT EXISTS
  total_pegging_points   INT NOT NULL DEFAULT 0,
  total_hand_points      INT NOT NULL DEFAULT 0,
  total_crib_points      INT NOT NULL DEFAULT 0,
  total_hands_played     INT NOT NULL DEFAULT 0,
  best_pegging           INT NOT NULL DEFAULT 0,
  best_hand_score        INT NOT NULL DEFAULT 0,
  best_crib_score        INT NOT NULL DEFAULT 0,
  optimal_discards       INT NOT NULL DEFAULT 0,
  total_discards         INT NOT NULL DEFAULT 0,
  total_ev_deficit       REAL NOT NULL DEFAULT 0;
```

Derived stats (computed client-side from these columns):
- Avg Pegging = `total_pegging_points / total_hands_played`
- Avg Hand = `total_hand_points / total_hands_played`
- Avg Crib = `total_crib_points / total_hands_played` (divide by ~half since only dealer gets crib)
- Strategic Rounds % = `optimal_discards / total_discards * 100`
- Avg Point Deficit = `total_ev_deficit / total_discards`

### Update `record_game_result` RPC

Enhance to accept per-hand aggregate data:

```sql
CREATE OR REPLACE FUNCTION public.record_game_result(
  p_won              BOOLEAN,
  p_player_score     INT,
  p_opponent_score   INT,
  -- NEW params:
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
```

New params all have defaults so existing callers (without stats) still work.

---

## 3. Post-Game Summary Screen

### Route

New route: `/game-stats` (or inline modal — TBD in plan). Receives game data via React Router state (same pattern as Join page).

### Layout (single scroll, mobile-first)

```
┌──────────────────────────────┐
│   📊 Game Summary            │
│   Hand N · You [Win/Lost]    │
├──────────────────────────────┤
│ Score Breakdown              │
│                              │
│   Total Score      95 / 121  │
│   Pegging Points   28        │
│   Hand Points      52        │
│   Crib Points      15        │
├──────────────────────────────┤
│ Hand-by-Hand Chart           │
│                              │
│  [line chart - Recharts]     │
│                              │
│  [TOTAL] [PEG] [HAND] [CRIB]│
├──────────────────────────────┤
│ Averages & Bests             │
│                              │
│   Avg Pegging    3.1         │
│   Best Pegging   7           │
│   Avg Hand       5.8         │
│   Best Hand      14          │
│   Avg Crib       3.3         │
│   Best Crib      8           │
├──────────────────────────────┤
│ Discard Strategy Review      │
│                              │
│  Strategic Rounds: 70%       │
│  Avg EV Deficit:  -1.2       │
│                              │
│  Hand 1 (Dealer)             │
│  Your Pick: [2♠][5♥] → 8.3  │
│  Best:      [3♦][7♣] → 9.1  │
│  Delta: -0.8                 │
│                              │
│  Hand 2 (Pone)               │
│  Your Pick: [K♠][Q♥] → 6.0  │
│  Best: ✓ Optimal!            │
│  ... more hands ...          │
├──────────────────────────────┤
│  [Play Again]  [Main Menu]   │
└──────────────────────────────┘
```

### Components

1. **PostGameSummary** — container page component
2. **ScoreBreakdown** — total/pegging/hand/crib table
3. **HandByHandChart** — Recharts `<LineChart>` with category toggle buttons
4. **AveragesBests** — simple stat grid
5. **DiscardStrategyReview** — per-hand discard analysis with optimal comparison

### Chart Details (Recharts)

- Dark theme: background transparent, grid lines white/10, text cream
- Two lines: player (gold #d4a843) — player only (per design decision)
- Toggle buttons: TOTAL, PEGGING, HAND, CRIB — filter which data series shows
- X-axis: hand number (1, 2, 3, ...)
- Y-axis: points per hand
- Tooltip on tap/hover showing exact values

---

## 4. Discard Strategy Review

### Computation

For each hand in `handStatsHistory`:
1. Get `dealtHands[playerIndex]` — the original 6 cards
2. Call `optimalDiscard(dealtHands, isDealer)` to get all 15 options ranked
3. Find which option the player actually chose (compare kept cards)
4. Compute: `delta = playerChoice.expectedValue - optimal.expectedValue`
5. Grade: 100 if player picked optimal (delta = 0), lower otherwise

### Aggregate Metrics

- **Strategic Rounds %**: `(count where delta === 0) / totalHands * 100`
- **Avg EV Deficit**: `sum(deltas) / totalHands` (negative number, closer to 0 is better)

### Player's Actual Discard

To know what the player discarded, compare `dealtHands[i]` (6 cards) with `players[i].hand` after discard phase. The 2 missing cards are the discard. This is already available in `handStatsHistory.dealtHands` + the engine's post-discard hand.

**Problem**: After discarding, the engine only stores the 4-card hand — the 2 discarded cards go to the crib array (shared). We need to record the player's specific discard choices.

**Solution**: Add `discardChoices` tracking to GameState:

```typescript
export interface HandStatsSnapshot {
  // ... existing fields ...
  readonly discardChoices: readonly Card[][];  // [player0's 2, player1's 2]
}
```

Populated when DISCARD actions are processed.

---

## 5. Stats Page Enhancements

### New stat rows (below existing stats)

**Scoring Averages section:**
- Avg Pegging (per hand)
- Best Pegging (single hand)
- Avg Hand Score (per hand)
- Best Hand Score (single hand)
- Avg Crib Score (per hand, dealer hands only)
- Best Crib Score (single hand)

**Discard Accuracy section:**
- Strategic Rounds % (optimal discard rate)
- Avg EV Deficit from Optimal

### Data source

Query from `stats` table (already fetched by `fetchStats`). Compute averages client-side from the new cumulative columns.

---

## 6. What Doesn't Change

- Engine scoring functions (scoring.ts, pegging.ts)
- Existing GameOver component (only adds one button)
- Existing HandSummary / HandReview (between-hand screens)
- Existing game flow / phase transitions
- LLM integration (no AI commentary in stats)
- Offline/AI mode gameplay

## 7. Dependencies

- **Recharts**: `npm install recharts` (~40KB gzipped)
- No other new dependencies

## 8. Testing Strategy

- **Engine**: Unit tests for dealtHands tracking, handStatsHistory accumulation, discardChoices recording
- **Discard grading**: Unit tests comparing known discard choices against optimalDiscard output
- **Components**: Render tests for PostGameSummary sections, chart toggle behavior, waiting states
- **Integration**: GameOver → PostGameSummary navigation
- **Stats page**: Updated tests for new stat rows
- **Supabase**: Migration test, RPC test with new params
