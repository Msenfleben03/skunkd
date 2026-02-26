# Coaching EVL System + Monte Carlo Crib — Design

**Date:** 2026-02-25
**Status:** Approved, ready for implementation

---

## Overview

Two related features that form the coaching data layer for SKUNK'D:

1. **EVL Annotation System (#6)** — Captures player decisions during gameplay and computes Expected Value Lost (EVL) at review time. Provides structured coaching summaries for the LLM coaching layer (Phase 7).

2. **Monte Carlo Crib Simulation (#5)** — Replaces the Schell rank-pair lookup in the coaching path (`optimalDiscard`) with 500-sample Monte Carlo simulation for ~97% accuracy. Gameplay AI keeps Schell for speed.

---

## Architecture

```
Game Loop (during play)          Review (on demand)
─────────────────────          ──────────────────────
gameReducer()                  analyzeDecision()
  ├─ DISCARD action              ├─ optimalDiscard() with MC crib
  │   └─ record snapshot         │   └─ compare actual vs optimal
  ├─ PLAY action                 │   └─ compute EVL + severity
  │   └─ record snapshot         ├─ optimalPeggingPlay()
  └─ (no computation here)       │   └─ compare actual vs optimal
                                 └─ aggregate into summaries
```

### Decisions

- **Hybrid capture:** Record state snapshots during play (cheap), compute optimal lazily at review (only when coaching is requested).
- **GameState storage:** `decisionLog: DecisionSnapshot[]` inside GameState — stays in sync with game state, travels with Supabase serialization in Phase 5.
- **Structured summaries:** Per-decision EVL + hand/game aggregates. No prose — the LLM coaching layer (Gemini, Phase 7) generates human-friendly explanations from this data.
- **Uniform MC sampling:** 500 samples, no weighted opponent discard probability (future enhancement).

---

## Types

### DecisionSnapshot (recorded during play)

```typescript
interface DecisionSnapshot {
  readonly type: 'discard' | 'pegging_play';
  readonly hand: readonly Card[];         // player's hand at decision time
  readonly playerChoice: readonly Card[]; // 2 cards for discard, 1 for play
  readonly isDealer: boolean;
  readonly pile?: readonly Card[];        // pegging only
  readonly count?: number;               // pegging only
  readonly handIndex: number;            // which hand in the game (0-based)
}
```

### CoachingAnnotation (computed at review)

```typescript
interface CoachingAnnotation {
  readonly decision: 'discard' | 'pegging_play';
  readonly actual: readonly Card[];
  readonly optimal: readonly Card[];
  readonly evActual: number;
  readonly evOptimal: number;
  readonly evl: number;          // evOptimal - evActual; ≥0 means player lost value
  readonly severity: 'excellent' | 'minor' | 'significant' | 'major' | 'critical';
  readonly reasoning: string;    // from optimalDiscard/optimalPeggingPlay
}
```

### HandCoachingSummary

```typescript
interface HandCoachingSummary {
  readonly handIndex: number;
  readonly annotations: readonly CoachingAnnotation[];
  readonly totalEVL: number;
  readonly worstDecision: CoachingAnnotation | null;
}
```

### GameCoachingSummary

```typescript
interface GameCoachingSummary {
  readonly hands: readonly HandCoachingSummary[];
  readonly totalEVL: number;
  readonly averageEVLPerHand: number;
  readonly averageEVLPerDecision: number;
  readonly worstDecision: CoachingAnnotation | null;
  readonly grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  readonly totalDecisions: number;
  readonly excellentCount: number;
}
```

---

## Severity Scale

| EVL (pts) | Severity | Coaching intent |
|-----------|----------|-----------------|
| < 0.1 | excellent | "Optimal play!" |
| 0.1 – 0.5 | minor | Note better option |
| 0.5 – 1.5 | significant | Explain the tradeoff |
| 1.5 – 3.0 | major | Highlight opportunity |
| > 3.0 | critical | Flag game-changer |

## Cribbage Grade Scale

Based on average EVL per decision across the game:

| Avg EVL/decision | Grade |
|-----------------|-------|
| < 0.1 | A+ |
| 0.1 – 0.3 | A |
| 0.3 – 0.7 | B |
| 0.7 – 1.5 | C |
| 1.5 – 2.5 | D |
| > 2.5 | F |

---

## Monte Carlo Crib Simulation

### Algorithm

```typescript
function monteCartoCribEV(
  discard: readonly [Card, Card],
  knownCards: readonly Card[],  // all cards we can currently see
  samples?: number,             // default 500
): number
```

1. Build remaining deck (52 cards minus `knownCards` minus `discard`)
2. For N samples:
   - Draw 2 random opponent discards from remaining deck
   - Draw 1 random starter from what remains after opponent draw
   - Score the 4-card crib (discard[0], discard[1], opp[0], opp[1]) + starter
3. Return average score across all samples

### Integration

- **`optimalDiscard()`** in `optimal.ts` — replace `lookupCribEV` with `monteCartoCribEV`
- **`aiSelectDiscard()`** in `ai.ts` — keep `lookupCribEV` (fast path, <500ms required)
- **`analyzeDecision()`** — uses `optimalDiscard()` internally, so inherits MC accuracy automatically

---

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `src/engine/coaching.ts` | **NEW** | All coaching types + `analyzeDecision`, `analyzeHand`, `analyzeGame` |
| `src/engine/crib-ev.ts` | **EDIT** | Add `monteCartoCribEV` alongside `lookupCribEV` |
| `src/engine/types.ts` | **EDIT** | Add `DecisionSnapshot` type + `decisionLog` to `GameState` |
| `src/engine/state.ts` | **EDIT** | Reducer records snapshots on DISCARD/PLAY actions |
| `src/engine/optimal.ts` | **EDIT** | Use `monteCartoCribEV` in `optimalDiscard` |
| `src/engine/__tests__/coaching.test.ts` | **NEW** | EVL system tests |
| `src/engine/__tests__/crib-ev.test.ts` | **NEW** | MC crib accuracy + behavior tests |
| `src/engine/__tests__/optimal.test.ts` | **EDIT** | Update for MC crib integration |
| `src/engine/__tests__/gameState.test.ts` | **EDIT** | Snapshot recording tests |

---

## What This Enables (Phase 7)

The coaching data layer will feed the Gemini LLM coaching features:
- End-of-hand review: "You lost 2.3 expected points this hand. Your worst decision was discarding A-4 as pone (cost: 1.8 pts)."
- End-of-game analysis: "Cribbage Grade: B. Your pegging was strong (avg 0.2 EVL/play) but discarding cost you (avg 0.9 EVL/discard)."
- Comparative stats over multiple games as player improves.
