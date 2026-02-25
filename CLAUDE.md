# SKUNK'D — Project Instructions

## Overview
PWA cribbage game. React 18 + TypeScript + Vite + Tailwind + shadcn/ui frontend, Supabase backend, Gemini API for LLM features. Mobile-first.

## Directory Structure
```
src/
  engine/           # Pure TypeScript game engine (NO React imports)
    __tests__/      # Vitest unit tests for engine
    types.ts        # Card, Rank, Suit, GameState types
    deck.ts         # Shuffle, deal, cut
    scoring.ts      # Hand scoring (fifteens, pairs, runs, flush, nobs)
    pegging.ts      # Pegging logic (play, go, count)
    state.ts        # Game state machine
    ai.ts           # AI decision logic
  components/       # React UI components
  hooks/            # React hooks
  pages/            # Route-level page components
  lib/              # Shared utilities, Supabase client
  styles/           # Tailwind config, global styles
supabase/
  migrations/       # SQL migrations
  functions/        # Edge Functions (Deno)
public/             # Static assets, PWA manifest
docs/plans/         # Design doc and implementation plan
prototypes/         # Read-only reference implementations
```

## Commands
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run test` — Run all Vitest tests
- `npm run test:engine` — Run engine tests only
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript type check

## Workflow

### TDD (Test-Driven Development)
All engine code follows strict TDD:
1. Write failing test (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor (IMPROVE)
4. Use `tdd-workflow` skill for enforcement

### Verification Loop
Before every commit:
1. `npm run typecheck` — zero errors
2. `npm run lint` — zero warnings
3. `npm run test` — all passing
4. Use `verification-loop` skill as quality gate

### Agent Mapping
- `build-error-resolver` — TypeScript/Vite build errors
- `e2e-runner` — Playwright tests for game flows
- `security-reviewer` — Supabase RLS, auth, Edge Functions
- `tdd-guide` — Game engine scoring tests
- `scoring-validator` — Cribbage scoring edge case validation

## Critical Cribbage Scoring Rules

These rules are NON-NEGOTIABLE. Every scoring function must implement them correctly.

### Fifteens
- Check ALL subsets of size 2-5 (26 possible for 5-card hand)
- Use bitmask or recursive subset generation — no shortcuts

### Runs with Duplicates (THE #1 BUG SOURCE)
- 3-4-4-5-6 = TWO runs of 4 = 8 points
- 3-3-4-4-5 = FOUR runs of 3 = 12 points (double-double)
- 3-3-3-4-5 = THREE runs of 3 = 9 points (triple run)

### Flush
- Hand: 4-card flush (hand only) = 4 points; 5-card (hand + starter) = 5 points
- Crib: MUST be 5-card flush or 0 points (4-card crib flush = 0)

### Nobs vs His Heels
- Nobs: Jack in HAND matching STARTER suit = 1 point
- His Heels: Jack AS the STARTER = 2 points to dealer

### Pegging
- Runs: only consecutively played cards count
- Pairs: must be consecutive (different rank breaks sequence)
- "Go": player CANNOT play, not a choice — validate before allowing
- After Go, opponent keeps playing until they also can't

### Game Flow
- Non-dealer plays first in pegging AND scores first in Show
- Game ends THE INSTANT someone reaches 121
- Dealer alternates every hand

## Engine Architecture
- Pure TypeScript — NO React, NO DOM, NO side effects
- All functions are pure: input → output
- Game state is immutable — return new state objects
- Engine must work identically in browser and Node.js (for server validation)
