# Independent Show-Phase Pacing — Design

_Date: 2026-02-26_

## Problem

In multiplayer, whichever player taps "Continue" or "Next Hand" first forces both players to advance through scoring screens. Players can't review hand scores, crib scores, or LLM analysis at their own pace.

## Solution

Each player advances through show phases (SHOW_NONDEALER → SHOW_DEALER → SHOW_CRIB → HAND_COMPLETE) independently on their local engine. Only the "Next Hand" transition requires mutual readiness via a broadcast-based ready gate.

## Approach: Broadcast-Based Ready Gate

### Why This Works

Show-phase scoring is deterministic — both engines compute identical scores from the same hand + starter. So independent local advancement produces identical final states at HAND_COMPLETE. No synchronization needed until the next deal.

### Changes

**1. `handleAdvanceShow` — stop broadcasting**

In online mode, `ADVANCE_SHOW` is applied locally only. No broadcast sent. Both engines converge at HAND_COMPLETE independently.

**2. `handleNextHand` — ready gate**

Instead of broadcasting `NEXT_HAND` immediately:

- Broadcast `{ type: 'ready_next_hand' }` and set `localReadyNextHand = true`
- When receiving `ready_next_hand` from opponent, set `opponentReadyNextHand = true`
- When both are true, dispatch `NEXT_HAND` locally (both sides trigger simultaneously)
- Reset both flags on each new hand

**3. `onRemoteAction` handler — ignore stale ADVANCE_SHOW**

If an `ADVANCE_SHOW` game_action is received from the opponent, ignore it in online mode (safety guard).

**4. UI — waiting state at HAND_COMPLETE**

After tapping "Next Hand":

- Button text changes to "Waiting for opponent..."
- Button becomes disabled
- When opponent is also ready, both advance automatically

**5. New broadcast type**

Add `ready_next_hand` to `OnlineBroadcast` type union.

### What Doesn't Change

- Offline/AI mode — completely unchanged
- Engine reducer — no changes
- Show-phase UI (scoring screens) — unchanged
- Disconnect overlay — already handles opponent going offline

### Edge Cases

- **Opponent disconnects before signaling ready**: Disconnect overlay appears (existing behavior)
- **Both tap near-simultaneously**: Both set local + receive remote — both advance. No race condition (just two booleans)
- **Player refreshes mid-show**: Rejoins at local engine state. Opponent's ready state resets on reconnect
