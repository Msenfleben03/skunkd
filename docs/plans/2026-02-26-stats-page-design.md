# Stats Page Design — SKUNK'D

_Date: 2026-02-26_

## Overview

Add a `/stats` route showing the player's aggregate lifetime statistics, persisted to Supabase after every completed game (local vs-AI and online).

## Architecture

### 1. Routing — `react-router-dom`

Install `react-router-dom`. Wrap `App.tsx` in `<BrowserRouter>` with three routes:

| Route | Component |
|---|---|
| `/` | `GameScreen` |
| `/stats` | `StatsPage` |
| `/join/:code` | `JoinPage` (stub — replaces existing `window.location.href` hack) |

### 2. Saving Game Results — Migration 004

A new Postgres RPC function `record_game_result` handles all stat persistence atomically server-side. Called once from `GameScreen` via a `useEffect` when `phase === 'GAME_OVER'`.

**RPC signature:**
```sql
record_game_result(
  p_user_id       UUID,
  p_won           BOOLEAN,
  p_player_score  INT,
  p_opponent_score INT,
  p_hands_played  INT,
  p_cribbage_grade TEXT   -- e.g. "B+" extracted from MatchAnalysis, or null
)
```

**RPC updates `stats` table:**
- Increments `games_played`, `wins`/`losses`
- Updates `current_streak` and `best_streak`
- Updates `skunks_given` / `skunks_received` / `double_skunks_given` / `double_skunks_received`
- Updates `highest_hand` if applicable
- Updates `avg_cribbage_grade` (running average)

Skipped if `user_id` is null. Guest users have a valid `user_id` so their stats persist within the same session.

### 3. StatsPage Component

Fetches from the `stats` table on mount via `supabase.from('stats').select('*').eq('user_id', userId).single()`. Single card layout on felt background. Handles loading, error, and empty states.

## StatsPage Layout

```
┌─────────────────────────────────┐
│  ← back          Your Stats     │  ← header row
│              [display name]     │
├─────────────────────────────────┤
│         ┌───────────┐           │
│         │    B+     │           │  ← Cribbage Grade (gold circle)
│         └───────────┘           │
│       Avg Cribbage Grade        │
├─────────────────────────────────┤
│  12 / 8                60%      │  ← W / L + win rate
│  Wins / Losses                  │
├─────────────────────────────────┤
│  🔥 3-game win streak           │  ← current streak
│  Best streak: 7                 │
├─────────────────────────────────┤
│  Skunks Given    Skunks Rec'd   │
│       4               2         │
│  Double Given    Double Rec'd   │
│       1               0         │
├─────────────────────────────────┤
│  Highest Hand Score: 24         │
└─────────────────────────────────┘
```

**Empty state** (games_played === 0): "No games yet — deal yourself in."

**Guest nudge**: Soft text below the card — "Sign in to keep your stats across devices" — not a blocker.

## Data Flow

```
GAME_OVER phase
  → useEffect in GameScreen (fires once)
    → supabase.rpc('record_game_result', { ... })
      → Postgres fn updates stats table atomically
        → StatsPage reads updated stats on next visit
```

The `cribbage_grade` param is optional/nullable — passed if the `MatchAnalysis` component has already produced a grade for this game, otherwise null (skipped in RPC average calculation).

## Navigation

Stats button added to the start screen alongside "Deal Me In" and "Play Online". Uses `useNavigate('/stats')` from react-router-dom. Back button on StatsPage uses `useNavigate('/')`.

## Error Handling

- RPC save failure: silent (non-blocking, logged to console). Stats may miss one game but never crash the game flow.
- StatsPage fetch failure: show "Couldn't load stats. Try again." with retry button.
- No user: StatsPage redirects to `/` (guest users always have a user_id via auto sign-in, so this is only a safety guard).

## Testing

- Unit test for skunk tier logic (score → single/double/none)
- Component test for `StatsPage`: mock Supabase response, assert all stat fields render correctly
- Component test: empty state renders when `games_played === 0`
- Integration: `GameScreen` `useEffect` calls RPC with correct args on GAME_OVER

## Out of Scope

- Per-game history list (no `game_history` table — aggregate only)
- `generate-avatar` / avatar display (needs Imagen 3 paid tier)
- Leaderboard (Phase 7+)
