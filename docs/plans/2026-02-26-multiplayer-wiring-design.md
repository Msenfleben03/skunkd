# Multiplayer Wiring Design

**Date:** 2026-02-26
**Status:** Approved
**Approach:** Hybrid — Broadcast GameActions + Edge Function for deals

## Problem

The multiplayer UI scaffolding exists (create game, share invite code, join page) but the actual game synchronization layer is missing. Three gaps:

1. **Joiner lands on start screen:** `Join.tsx` navigates to `/` with `{ state: { joinedCode } }` but GameScreen never reads it.
2. **Creator never detects opponent joining:** The "Waiting for Opponent" screen has no Realtime subscription.
3. **No multiplayer game bridge:** `useGame()` runs locally with AI logic. `useGameChannel` and `useAsyncGame` hooks exist but are unused.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sync model | Both clients run engine locally | Engine is pure/deterministic. Same actions = same state. Simplest to build. |
| Card dealing | deal-hand Edge Function | Already built. RLS ensures card security. Each client fetches own cards. |
| Scope | Real-time only | Both players online simultaneously. Async deferred to future iteration. |

## Architecture

### Game Mode

GameScreen tracks whether it's a local or online game:

```
gameMode: 'local' | 'online'
onlineGameId: string | null       // Supabase game UUID
localPlayerSeat: 0 | 1            // 0 = creator, 1 = joiner
opponentUserId: string | null     // for presence tracking
```

When `gameMode === 'online'`, AI auto-play effects in `useGame` are skipped. Remote actions arrive via Broadcast and are dispatched to the local engine.

### Connection Flow

**Creator (Device A):**
1. Creates game via `createGame('vs_human')` — gets gameId + invite_code
2. Shows "Waiting for Opponent" screen
3. Subscribes to Realtime `postgres_changes` on `game_players` table for this game
4. When joiner's INSERT detected: fetches player list, stores opponent userId
5. Transitions to multiplayer game, connects to Broadcast channel `game:{gameId}`

**Joiner (Device B):**
1. `Join.tsx` calls `joinGame(code)`, receives `GameSummary`
2. Navigates to `/` with full `GameSummary` in `location.state` (not just the code)
3. GameScreen reads `location.state`, sets `gameMode = 'online'`, `localPlayerSeat = 1`
4. Connects to Broadcast channel `game:{gameId}`

**Game start:** Once both clients detect each other via Presence, the creator initiates the first deal.

### Deal Phase

1. Creator calls `dealHand(gameId, handNumber)` via Edge Function
2. Creator receives own cards, broadcasts `{ type: 'deal_ready', handNumber, starterCard }`
3. Joiner receives broadcast, calls `dealHand(gameId, handNumber)` to fetch own cards
4. Both clients dispatch new `LOAD_HAND` action (replaces local `DEAL`):

```typescript
{ type: 'LOAD_HAND', hand: Card[], starter: Card, dealerIndex: number }
```

This sets the player's hand + starter from server data without local shuffle.

### Discard Phase

Each player discards 2 cards locally via existing `DISCARD` action, then broadcasts:
```typescript
{ action: { type: 'DISCARD', playerIndex, cardIds } }
```
Remote client dispatches the same action. Neither client sees the other's discards — the engine puts them face-down in `crib` until `SHOW_CRIB`.

### Pegging Phase

1. Active player selects card → `PLAY_CARD` dispatched locally
2. Broadcast: `{ action: { type: 'PLAY_CARD', playerIndex, cardId } }`
3. Remote client dispatches same action
4. Engine advances `currentPlayerIndex`
5. `DECLARE_GO` handled identically

### Show Phase

**Hand reveal problem:** Each client only has their own hand. During Show, both hands must be visible.

**Solution:** When transitioning to SHOW_NONDEALER, each client broadcasts:
```typescript
{ type: 'reveal_hand', cards: Card[] }
```

Receiving client injects opponent's cards via new action:
```typescript
{ type: 'LOAD_OPPONENT_HAND', playerIndex: number, hand: Card[] }
```

`ADVANCE_SHOW` is broadcast by whichever player taps to advance. Both clients step through SHOW_NONDEALER → SHOW_DEALER → SHOW_CRIB → HAND_COMPLETE in lockstep.

### Next Hand

After HAND_COMPLETE, either player taps "Next Hand" → broadcasts `NEXT_HAND`. Creator initiates the next deal. Dealer alternates per existing engine logic.

### Game Over

When either client's engine reaches `GAME_OVER`:
- Broadcast `{ type: 'game_complete', winnerIndex }`
- Both show GameOver screen
- Winning client calls `updateGameStatus(gameId, 'complete')` + `recordGameResult()`

## New Engine Actions

```typescript
// Added to GameAction union in types.ts
| { type: 'LOAD_HAND'; hand: Card[]; starter: Card; dealerIndex: number }
| { type: 'LOAD_OPPONENT_HAND'; playerIndex: number; hand: Card[] }
```

## Edge Cases

**Disconnection:** Show "Opponent disconnected" overlay via Presence tracking. Keep game state. If opponent reconnects mid-hand, the hand is lost — restart from current scores. Full state recovery deferred.

**Race conditions:** Duplicate `ADVANCE_SHOW` taps are harmless (engine ignores). Only creator initiates deals (enforced by `localPlayerSeat === 0` check).

**Duplicate broadcasts:** Each client ignores actions from its own userId (already in `useGameChannel`).

## Out of Scope (v1)

- Async / turn-based play
- Reconnection with full state recovery
- Anti-cheat server validation
- Spectator mode
- 3-player online

## Files Changed

| File | Change |
|------|--------|
| `src/engine/types.ts` | Add `LOAD_HAND`, `LOAD_OPPONENT_HAND` to `GameAction` |
| `src/engine/gameState.ts` | Handle new actions in `gameReducer` |
| `src/hooks/useGame.ts` | Add `isOnline` mode, skip AI when online, expose `dispatchRemoteAction` |
| `src/components/game/GameScreen.tsx` | Wire `useGameChannel`, handle join state, deal coordination, broadcast all actions |
| `src/pages/Join.tsx` | Pass `GameSummary` in navigation state |
