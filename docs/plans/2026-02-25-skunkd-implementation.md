# SKUNK'D Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a PWA cribbage game called SKUNK'D with multiplayer, LLM coaching, and bold branding.

**Architecture:** React 18 + TypeScript frontend with pure-TS game engine, Supabase backend (Postgres + Realtime + Auth + Edge Functions), Gemini API for LLM features. Mobile-first PWA with offline vs-AI support.

**Tech Stack:** React 18, TypeScript 5, Vite, Tailwind CSS, shadcn/ui, Supabase, Gemini API, Vitest, Playwright, vite-plugin-pwa

**Design Doc:** `docs/plans/2026-02-25-skunkd-design.md`

**Build Priority (from LLM build instructions):**
1. Scoring engine first
2. Game state machine second
3. AI decision logic third
4. Visual design and layout fourth
5. Animations fifth
6. Chat/social features last

**GitHub Repo:** https://github.com/Msenfleben03/skunkd

**ECC Foundation:** Everything Claude Code (ECC) plugin provides the foundation for directory processes, pipelines, documentation, and task handling. All ECC rules and skills are installed at `.claude/rules/` and `.claude/skills/`.

---

## Phase 0: Project Foundation

### Task 0.1: Initialize Git Repository -- DONE

Git repo initialized, GitHub repo created at https://github.com/Msenfleben03/skunkd, initial commit pushed with design docs, prototypes, and research.

---

### Task 0.2: Scaffold Vite + React + TypeScript Project -- DONE

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

**Step 1: Scaffold project in repo root (not in a subfolder)**

```bash
cd C:/Users/msenf/cribbage
npm create vite@latest . -- --template react-ts
```

Note: If prompted about existing files, select to scaffold anyway — it won't overwrite `docs/` or `prototypes/`.

**Step 2: Install dependencies**

```bash
npm install
```

**Step 3: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server on `http://localhost:5173` with React template.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 0.3: Configure Tailwind CSS + shadcn/ui -- DONE

**Files:**
- Modify: `package.json` (add deps)
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Modify: `src/index.css`
- Create: `components.json` (shadcn config)

**Step 1: Install Tailwind CSS**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure Tailwind with SKUNK'D design tokens**

Create `tailwind.config.ts` with custom colors from the design doc:
- `felt` (dark green table surface)
- `walnut` (wood accents)
- `gold` (highlights, player pegs)
- `burgundy` (card backs)
- `cream` (text on dark)
- `skunk-green` (mascot green smoke from logo)
- `skunk-dark` (dark background)

Also configure fonts: Playfair Display (display), DM Sans (body).

**Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init
```

Select: TypeScript, Default style, CSS variables, `src/` alias.

**Step 4: Install core shadcn components needed immediately**

```bash
npx shadcn@latest add button card dialog sheet tabs accordion toast
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure Tailwind CSS with SKUNK'D tokens and shadcn/ui"
```

---

### Task 0.4: Configure Vitest -- DONE

**Files:**
- Modify: `package.json` (add vitest deps)
- Modify: `vite.config.ts` (add test config)
- Create: `src/__tests__/setup.ts`

**Step 1: Install Vitest + Testing Library**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Add test config to vite.config.ts**

Add `test` block: environment `jsdom`, globals `true`, setup files.

**Step 3: Add test script to package.json**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

**Step 4: Write a smoke test**

```typescript
// src/__tests__/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 5: Run test to verify setup**

```bash
npm run test:run
```

Expected: 1 test passing.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: configure Vitest with Testing Library"
```

---

### Task 0.5: Configure PWA Plugin -- DONE

**Files:**
- Modify: `package.json` (add vite-plugin-pwa)
- Modify: `vite.config.ts` (add PWA plugin)
- Create: `public/manifest.json` (or let plugin generate)
- Create: `public/skunkd-icon-192.png`, `public/skunkd-icon-512.png`

**Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

**Step 2: Add PWA config to vite.config.ts**

Configure with SKUNK'D name, theme color (skunk-dark), icons, and `registerType: 'autoUpdate'`.

**Step 3: Add placeholder icons**

Copy the skunk logo from `prototypes/add-components/cribbage-skunkd-logo.png` and resize to 192x192 and 512x512.

**Step 4: Verify build includes service worker**

```bash
npm run build
```

Check `dist/` for `sw.js` or `registerSW.js`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure PWA with vite-plugin-pwa"
```

---

### Task 0.6: Create Project CLAUDE.md -- DONE (completed as Task 0.5.2)

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write project-level CLAUDE.md**

```markdown
# SKUNK'D — Cribbage PWA

## Project Overview
PWA cribbage game with multiplayer and LLM coaching. See `docs/plans/2026-02-25-skunkd-design.md` for full design.

## Tech Stack
- Frontend: React 18 + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase (Postgres, Realtime, Auth, Edge Functions)
- LLM: Gemini API
- Testing: Vitest (unit) + Playwright (E2E)
- PWA: vite-plugin-pwa

## Directory Structure
- `src/engine/` — Pure TypeScript game engine (scoring, state, AI, rules). Zero UI dependencies.
- `src/components/` — React components (game UI, shared UI)
- `src/hooks/` — React hooks (useGame, useSupabase, etc.)
- `src/lib/` — Utilities, Supabase client, Gemini client
- `src/pages/` — Route-level page components
- `supabase/` — Migrations, Edge Functions, seed data
- `docs/` — Design docs, plans
- `prototypes/` — Reference prototypes (read-only, do not modify)

## Key Conventions
- Game engine is pure TypeScript with zero React dependencies. Test it independently.
- All scoring must handle edge cases: double-double runs, crib flush, nobs vs His Heels.
- Pegging run detection only considers consecutively played cards.
- Non-dealer always plays first in pegging AND scores first in the Show.
- Game ends THE INSTANT someone reaches 121.
- Use `encoding="utf-8"` for all file operations.
- Run `npm run test:run` before committing.

## Testing
- `npm run test:run` — Run all Vitest tests
- `npm run test:coverage` — Run with coverage report
- Game engine tests: `src/engine/__tests__/`
- Component tests: `src/components/__tests__/`

## Critical Scoring Rules (DO NOT GET WRONG)
- Fifteens: check ALL subsets of size 2-5 (26 possible subsets)
- Runs with duplicate ranks create MULTIPLE runs (3-4-4-5-6 = TWO runs of 4)
- Double-double runs: 3-3-4-4-5 = FOUR runs of 3 = 12 points
- Crib flush: must be 5-card (all 4 + starter). Hand flush: 4-card is OK.
- Nobs: Jack in HAND matching STARTER suit = 1 point
- His Heels: Jack as STARTER = 2 points to dealer
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: add project CLAUDE.md with conventions and rules"
```

---

## Phase 0.5: Claude Code Project Setup (ECC Foundation)

> **ECC is the project's process backbone.** All development workflows, pipelines, documentation standards, and task handling flow through ECC skills, agents, rules, and hooks.

### Task 0.5.1: ECC Rules and Skills -- DONE

Installed to `.claude/` (project-level):

**Rules (13 files in `.claude/rules/`):**
- Common: agents.md, coding-style.md, git-workflow.md, hooks.md, patterns.md, performance.md, security.md, testing.md
- TypeScript overrides: coding-style.md, hooks.md, patterns.md, security.md, testing.md

**Skills (10 directories in `.claude/skills/`):**
- frontend-patterns, backend-patterns, coding-standards, api-design
- postgres-patterns, e2e-testing, tdd-workflow
- security-review, verification-loop, cost-aware-llm-pipeline

---

### Task 0.5.2: Project CLAUDE.md with ECC Integration

**Files:**
- Create: `CLAUDE.md`

Write project CLAUDE.md that:
1. References ECC skills by name for each workflow phase
2. Defines directory structure with ECC conventions
3. Establishes ECC verification loop as the quality gate
4. Maps ECC agents to project tasks:
   - `build-error-resolver` → TypeScript/Vite build errors
   - `e2e-runner` → Playwright tests for game flows
   - `security-reviewer` → Supabase RLS, auth, Edge Functions
   - `tdd-guide` → Game engine scoring tests
5. Defines ECC commands for project workflows:
   - `/tdd` → Enforce test-first for engine code
   - `/e2e` → Generate and run game flow E2E tests
   - `/verify` → Run full verification loop (build + type + lint + test)

Include critical cribbage scoring rules (from build instructions) as guardrails.

```bash
git add CLAUDE.md
git commit -m "chore: add project CLAUDE.md with ECC workflow integration"
```

---

### Task 0.5.3: Custom Cribbage Scoring Guardrail Skill

**Files:**
- Create: `.claude/skills/cribbage-scoring/SKILL.md`

A domain guardrail skill that activates when modifying `src/engine/scoring.ts`, `src/engine/pegging.ts`, or any scoring-related file. Content:

```markdown
---
name: cribbage-scoring
description: Cribbage scoring rules guardrail. Activates when working on scoring engine, pegging, or hand evaluation. Prevents the most common cribbage scoring bugs.
---

# Cribbage Scoring Rules (MUST NOT VIOLATE)

## Fifteens
- Check ALL subsets of size 2-5 (26 possible for a 5-card hand)
- Do NOT use shortcuts that miss combinations
- Use bitmask or recursive subset generation

## Runs with Duplicates (THE #1 BUG)
- 3-4-4-5-6 = TWO runs of 4 = 8 points (each 4 forms its own run)
- 3-3-4-4-5 = FOUR runs of 3 = 12 points (double-double run)
- 3-3-3-4-5 = THREE runs of 3 = 9 points (triple run)

## Flush Rules
- Hand: 4-card flush (all 4 in hand same suit) = 4 points
- Hand: 5-card flush (hand + starter) = 5 points
- Crib: MUST be 5-card flush or NOTHING (4-card crib flush = 0 points)

## Nobs vs His Heels
- Nobs: Jack in HAND matching STARTER suit = 1 point
- His Heels: Jack AS the STARTER = 2 points to dealer
- These are different scoring events

## Pegging
- Run detection: only CONSECUTIVELY played cards count
- Pairs: must be CONSECUTIVE (a different rank breaks the sequence)
- "Go" means CANNOT play (not a choice) — validate before allowing
- After Go, other player keeps playing until they also can't

## Game Flow
- Non-dealer ALWAYS plays first in pegging AND scores first in Show
- Game ends THE INSTANT someone reaches 121
- Dealer alternates EVERY hand

## Testing Requirements
- Every scoring function MUST have tests for the edge cases above
- Test the 29-point hand (5H, 5S, 5D, JC + starter 5C)
- Test zero-point hands
- Test double-double runs explicitly
```

```bash
git add .claude/skills/cribbage-scoring/
git commit -m "feat(skill): add cribbage scoring guardrail skill"
```

---

### Task 0.5.4: Custom Supabase RLS Guardrail Skill

**Files:**
- Create: `.claude/skills/supabase-rls/SKILL.md`

Activates when working on Supabase migrations, RLS policies, or Edge Functions. Enforces card security model from design doc.

```markdown
---
name: supabase-rls
description: Supabase Row Level Security guardrail for SKUNK'D multiplayer card game. Activates when writing migrations, RLS policies, or Edge Functions. Prevents card data leaks.
---

# SKUNK'D Card Security Model

## Core Principle
Players must NEVER see opponent cards until the Show phase.

## RLS Requirements
- hand_cards: users see only rows where user_id = auth.uid()
- During Show phase: reveal via server-side state transition, not client query
- Card dealing MUST happen in Edge Function (server-side), never client
- Crib contents hidden until SHOW_CRIB phase

## Edge Function Security
- All card shuffling and dealing: server-side only
- Validate game_id ownership before dealing
- Rate limit deal requests (prevent brute-force deck enumeration)
- Never return opponent hand data in any response

## Auth Requirements
- Guest users get anonymous Supabase auth session
- Guest game data is ephemeral (no stats tracking)
- Account upgrade preserves game history
```

```bash
git add .claude/skills/supabase-rls/
git commit -m "feat(skill): add Supabase RLS card security guardrail"
```

---

### Task 0.5.5: Project-Level Settings and Permissions

**Files:**
- Modify: `.claude/settings.local.json`

Update project settings for SKUNK'D development:

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Bash(npm run :*)",
      "Bash(npx vitest :*)",
      "Bash(npx playwright :*)",
      "Bash(git :*)",
      "Bash(npx shadcn@latest :*)",
      "Bash(npx supabase :*)"
    ],
    "deny": [
      "Read(.env)",
      "Read(.env.local)"
    ]
  }
}
```

```bash
git add .claude/settings.local.json
git commit -m "chore: configure project permissions for SKUNK'D dev workflow"
```

---

### Task 0.5.6: Custom Project Commands

**Files:**
- Create: `.claude/commands/test-engine.md`
- Create: `.claude/commands/check-scoring.md`
- Create: `.claude/commands/deploy-preview.md`

**/test-engine** — Run game engine tests only:
```markdown
Run all game engine unit tests:
npx vitest run src/engine/ --reporter=verbose

If any test fails, use @superpowers:systematic-debugging to diagnose.
Report: total tests, passing, failing, coverage for src/engine/.
```

**/check-scoring** — Validate scoring correctness:
```markdown
Run scoring-specific tests with coverage:
npx vitest run src/engine/__tests__/scoring.test.ts src/engine/__tests__/pegging.test.ts --coverage

Verify these critical edge cases are covered:
- 29-point hand (5H,5S,5D,JC + 5C starter)
- Double-double run (3-3-4-4-5)
- Triple run (3-3-3-4-5)
- Crib flush (must be 5-card)
- Pegging run break detection

Use @cribbage-scoring skill for rules reference.
```

**/deploy-preview** — Deploy preview to Vercel:
```markdown
Build and deploy a preview:
1. npm run build
2. npx vercel --yes
3. Report the preview URL
4. Remind user to test on mobile viewport
```

```bash
mkdir -p .claude/commands
git add .claude/commands/
git commit -m "feat(commands): add /test-engine, /check-scoring, /deploy-preview commands"
```

---

### Task 0.5.7: Custom Project Agents

**Files:**
- Create: `.claude/agents/scoring-validator.md`

**scoring-validator** agent — Autonomous scoring test validator:

```markdown
---
name: scoring-validator
description: Use this agent when modifying scoring logic, adding new scoring tests, or when a scoring test fails. Validates all cribbage scoring edge cases.

<example>
Context: Developer modified the scoring engine
user: "I updated the run detection algorithm in scoring.ts"
assistant: "Let me use the scoring-validator agent to verify all edge cases still pass"
<commentary>Scoring changes require comprehensive validation to prevent regression</commentary>
</example>

model: haiku
color: red
tools: ["Read", "Bash", "Grep", "Glob"]
---

You are a cribbage scoring validation specialist. When triggered:

1. Run all scoring tests: `npx vitest run src/engine/__tests__/scoring.test.ts --reporter=verbose`
2. Run all pegging tests: `npx vitest run src/engine/__tests__/pegging.test.ts --reporter=verbose`
3. Verify these specific edge cases are tested and passing:
   - 29-point hand (5H,5S,5D,JC + 5C starter) = 29
   - Zero-point hand = 0
   - Double run (3-4-4-5-6) = 8
   - Double-double run (3-3-4-4-5) = 12
   - Triple run (3-3-3-4-5) = 9
   - Crib 4-card flush = 0, Hand 4-card flush = 4
   - Nobs (J in hand matching starter suit) = 1
   - Pegging run break (3,7,K,5,6 = no run)
   - Pegging consecutive pairs break (5,5,7,5 = no pair)
4. If any test fails, report EXACTLY which rule was violated
5. If any edge case lacks a test, report the gap

Never modify scoring code. Only validate and report.
```

```bash
mkdir -p .claude/agents
git add .claude/agents/
git commit -m "feat(agent): add scoring-validator agent for cribbage edge cases"
```

---

### Task 0.5.8: ECC Continuous Learning Setup

**Files:**
- Create: `.claude/skills/continuous-learning-v2/config.json`

Configure ECC's continuous learning to capture patterns specific to SKUNK'D development:

```json
{
  "enabled": true,
  "instinct_dir": ".claude/homunculus/instincts",
  "min_confidence": 0.6,
  "max_instincts": 100,
  "categories": ["scoring", "supabase", "react-game-ui", "multiplayer", "pwa", "llm-integration"],
  "auto_evolve": false
}
```

```bash
mkdir -p .claude/homunculus/instincts
git add .claude/skills/continuous-learning-v2/ .claude/homunculus/
git commit -m "chore: configure ECC continuous learning for SKUNK'D patterns"
```

---

## Phase 1: Game Engine (Pure TypeScript — No UI)

> **Critical:** This is the foundation. Every scoring function must be correct before any UI work. Reference `prototypes/cribbage-llm-build-instructions.md` for pitfalls.

### Task 1.1: Card Types and Utilities -- DONE

**Files:**
- Create: `src/engine/types.ts`
- Test: `src/engine/__tests__/types.test.ts`

**Step 1: Write failing tests for card utilities**

```typescript
// src/engine/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import { cardValue, rankOrder, isRed, cardLabel, createCard } from '../types';

describe('Card utilities', () => {
  it('cardValue returns correct pip values', () => {
    expect(cardValue('A')).toBe(1);
    expect(cardValue('5')).toBe(5);
    expect(cardValue('10')).toBe(10);
    expect(cardValue('J')).toBe(10);
    expect(cardValue('Q')).toBe(10);
    expect(cardValue('K')).toBe(10);
  });

  it('rankOrder returns sort order', () => {
    expect(rankOrder('A')).toBe(1);
    expect(rankOrder('2')).toBe(2);
    expect(rankOrder('K')).toBe(13);
  });

  it('isRed identifies red suits', () => {
    expect(isRed('H')).toBe(true);
    expect(isRed('D')).toBe(true);
    expect(isRed('S')).toBe(false);
    expect(isRed('C')).toBe(false);
  });

  it('cardLabel formats display string', () => {
    expect(cardLabel(createCard('A', 'S'))).toBe('A of Spades');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/engine/__tests__/types.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement types.ts**

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/src/engine/types.ts`

Define: `Rank`, `Suit`, `Card`, `Phase` enum (GAME_START through GAME_OVER), `PeggingState`, `ScoreBreakdown`, `GameState`, `GameAction` union type.

Key design decisions:
- `GameState.players` is an array (not hardcoded player1/player2) to anticipate 3-player in Phase 2
- `GameState.handStats` tracks cumulative pegging/hand/crib points per player (for the end-of-hand scorecard)

**Step 4: Run tests**

```bash
npx vitest run src/engine/__tests__/types.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/engine/
git commit -m "feat(engine): add card types, utilities, and game state types"
```

---

### Task 1.2: Deck Creation and Shuffling -- DONE

**Files:**
- Create: `src/engine/deck.ts`
- Test: `src/engine/__tests__/deck.test.ts`

**Step 1: Write failing tests**

```typescript
// src/engine/__tests__/deck.test.ts
import { describe, it, expect } from 'vitest';
import { createDeck, shuffle } from '../deck';

describe('Deck', () => {
  it('createDeck returns 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('createDeck has no duplicates', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.rank}-${c.suit}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('createDeck has 13 of each suit', () => {
    const deck = createDeck();
    const suits = ['H', 'D', 'S', 'C'] as const;
    for (const suit of suits) {
      expect(deck.filter(c => c.suit === suit)).toHaveLength(13);
    }
  });

  it('shuffle returns same cards in different order', () => {
    const deck = createDeck();
    const shuffled = shuffle([...deck]);
    expect(shuffled).toHaveLength(52);
    // Statistically near-impossible to stay in same order
    const samePosition = deck.filter((c, i) =>
      c.rank === shuffled[i].rank && c.suit === shuffled[i].suit
    );
    expect(samePosition.length).toBeLessThan(52);
  });
});
```

**Step 2: Run to verify failure, implement, run to verify pass, commit.**

```bash
git commit -m "feat(engine): add deck creation and Fisher-Yates shuffle"
```

---

### Task 1.3: Scoring — Fifteens -- DONE

**Files:**
- Create: `src/engine/scoring.ts`
- Test: `src/engine/__tests__/scoring.test.ts`

**Step 1: Write failing tests for fifteens**

```typescript
describe('scoreFifteens', () => {
  it('scores 5+10 = 2 points', () => {
    const cards = [card('5','H'), card('10','S'), card('2','D'), card('3','C'), card('7','H')];
    expect(scoreFifteens(cards)).toBe(2);
  });

  it('scores multiple fifteens', () => {
    // 5+10, 5+J, 5+Q, 5+K = but we only have 5 cards
    // 5,5,5,J,K: 5+J=15, 5+J=15, 5+J=15 (three 5s with J) + 5+K x3 + 5+5+5=15 = 8 fifteens
    const cards = [card('5','H'), card('5','S'), card('5','D'), card('J','C'), card('K','H')];
    expect(scoreFifteens(cards)).toBe(16); // 8 fifteens x 2pts
  });

  it('scores zero when no fifteens', () => {
    const cards = [card('A','H'), card('2','S'), card('3','D'), card('4','C'), card('6','H')];
    expect(scoreFifteens(cards)).toBe(0);
  });
});
```

**CRITICAL:** Must check ALL subsets of size 2-5. Use bitmask or combinatorial generation. Do NOT use shortcuts that miss combinations.

**Step 2-5: Red-green-refactor-commit cycle.**

```bash
git commit -m "feat(engine): add fifteens scoring with subset enumeration"
```

---

### Task 1.4: Scoring — Pairs -- DONE

**Files:**
- Modify: `src/engine/scoring.ts`
- Modify: `src/engine/__tests__/scoring.test.ts`

**Tests must cover:**
- Single pair = 2 points
- Pair royal (three of a kind) = 6 points
- Double pair royal (four of a kind) = 12 points
- No pairs = 0

```bash
git commit -m "feat(engine): add pairs scoring"
```

---

### Task 1.5: Scoring — Runs -- DONE

**Files:**
- Modify: `src/engine/scoring.ts`
- Modify: `src/engine/__tests__/scoring.test.ts`

**Tests MUST cover these edge cases (the #1 scoring bug in cribbage implementations):**

```typescript
describe('scoreRuns', () => {
  it('scores a simple run of 3', () => {
    const cards = [card('3','H'), card('4','S'), card('5','D'), card('9','C'), card('K','H')];
    expect(scoreRuns(cards)).toBe(3);
  });

  it('scores a run of 5', () => {
    const cards = [card('A','H'), card('2','S'), card('3','D'), card('4','C'), card('5','H')];
    expect(scoreRuns(cards)).toBe(5);
  });

  it('scores double run (duplicate rank in run)', () => {
    // 3-4-4-5-6: TWO runs of 4 = 8 points
    const cards = [card('3','H'), card('4','S'), card('4','D'), card('5','C'), card('6','H')];
    expect(scoreRuns(cards)).toBe(8);
  });

  it('scores double-double run', () => {
    // 3-3-4-4-5: FOUR runs of 3 = 12 points
    const cards = [card('3','H'), card('3','S'), card('4','D'), card('4','C'), card('5','H')];
    expect(scoreRuns(cards)).toBe(12);
  });

  it('scores triple run', () => {
    // 3-3-3-4-5: THREE runs of 3 = 9 points
    const cards = [card('3','H'), card('3','S'), card('3','D'), card('4','C'), card('5','H')];
    expect(scoreRuns(cards)).toBe(9);
  });

  it('scores no run when cards are not consecutive', () => {
    const cards = [card('2','H'), card('4','S'), card('6','D'), card('8','C'), card('10','H')];
    expect(scoreRuns(cards)).toBe(0);
  });
});
```

```bash
git commit -m "feat(engine): add run scoring with duplicate-rank multipliers"
```

---

### Task 1.6: Scoring — Flush and Nobs -- DONE

**Files:**
- Modify: `src/engine/scoring.ts`
- Modify: `src/engine/__tests__/scoring.test.ts`

**Tests must cover:**
- 4-card hand flush = 4 points
- 5-card flush (hand + starter) = 5 points
- Crib flush: MUST be 5-card or nothing (4-card crib flush = 0)
- Nobs: Jack in hand matching starter suit = 1 point
- No nobs when Jack is the starter (that's His Heels, handled elsewhere)

```bash
git commit -m "feat(engine): add flush and nobs scoring with crib flush rule"
```

---

### Task 1.7: Scoring — Combined scoreHand() -- DONE

**Files:**
- Modify: `src/engine/scoring.ts`
- Modify: `src/engine/__tests__/scoring.test.ts`

**Step 1: Write integration tests for full hand scoring**

```typescript
describe('scoreHand', () => {
  it('scores the perfect 29-point hand', () => {
    // 5H, 5S, 5D, JC with starter 5C
    const hand = [card('5','H'), card('5','S'), card('5','D'), card('J','C')];
    const starter = card('5','C');
    const result = scoreHand(hand, starter, false);
    expect(result.total).toBe(29);
    expect(result.fifteens).toBe(16); // 8 fifteens
    expect(result.pairs).toBe(12);    // double pair royal
    expect(result.nobs).toBe(1);      // Jack matches starter suit
  });

  it('scores a zero-point hand', () => {
    const hand = [card('A','H'), card('3','S'), card('6','D'), card('8','C')];
    const starter = card('K','H');
    const result = scoreHand(hand, starter, false);
    expect(result.total).toBe(0);
  });

  it('differentiates hand vs crib flush scoring', () => {
    // 4-card flush in hand = 4pts, in crib = 0pts
    const hand = [card('2','H'), card('5','H'), card('8','H'), card('J','H')];
    const starter = card('K','S'); // different suit
    expect(scoreHand(hand, starter, false).flush).toBe(4); // hand
    expect(scoreHand(hand, starter, true).flush).toBe(0);  // crib
  });
});
```

**Step 2: Implement scoreHand combining all sub-scores.**

```bash
git commit -m "feat(engine): add combined scoreHand with full breakdown"
```

---

### Task 1.8: Pegging Scoring -- DONE

**Files:**
- Create: `src/engine/pegging.ts`
- Test: `src/engine/__tests__/pegging.test.ts`

**Tests must cover:**
- Fifteen during pegging (count hits exactly 15) = 2 points
- Thirty-one = 2 points
- Consecutive pairs = 2, pair royal = 6, double pair royal = 12
- Runs during pegging (only consecutive cards count, a break resets)
- Last card = 1 point (or 2 if count = 31)
- Go handling

**Critical edge case test:**

```typescript
it('run detection only considers consecutive plays', () => {
  // Play sequence: 3, 7, 4, 5, 6 — run of 4 (4,5,6,7)
  const pile = [card('3','H'), card('7','S'), card('4','D'), card('5','C'), card('6','H')];
  expect(scorePeggingPlay(pile).runs).toBe(4);
});

it('broken sequence has no run', () => {
  // Play sequence: 3, 7, K, 5, 6 — K breaks it, no run
  const pile = [card('3','H'), card('7','S'), card('K','D'), card('5','C'), card('6','H')];
  expect(scorePeggingPlay(pile).runs).toBe(0);
});

it('consecutive pairs broken by different rank', () => {
  // 5, 5, 7, 5 — NOT three of a kind (7 breaks it)
  const pile = [card('5','H'), card('5','S'), card('7','D'), card('5','C')];
  expect(scorePeggingPlay(pile).pairs).toBe(0);
});
```

```bash
git commit -m "feat(engine): add pegging scoring with run/pair detection"
```

---

### Task 1.9: Game State Machine -- DONE

**Files:**
- Create: `src/engine/gameState.ts`
- Test: `src/engine/__tests__/gameState.test.ts`

This is the core reducer. Implement the full phase flow:

```
GAME_START → DEALING → DISCARD_TO_CRIB → CUT_STARTER → PEGGING →
SHOW_NONDEALER → SHOW_DEALER → SHOW_CRIB → HAND_COMPLETE → (loop)
→ GAME_OVER (when any player hits 121)
```

**Key rules to test:**
- His Heels: Jack as starter = 2 points to dealer
- Non-dealer always plays first in pegging
- Non-dealer always scores first in Show
- Game ends THE INSTANT someone reaches 121 (even mid-show)
- Dealer alternates every hand
- "Go" validation: player cannot say Go if they have a playable card
- Count resets after both players Go (or 31 reached)

**Tests:**

```typescript
describe('Game state machine', () => {
  it('complete phase flow for one hand', () => {
    // Test full cycle from GAME_START through HAND_COMPLETE
  });

  it('game ends immediately when player hits 121 during show', () => {
    // Set up state where non-dealer is at 115, hand scores 8
    // Non-dealer reaches 121 during SHOW_NONDEALER
    // Dealer hand and crib are NEVER scored
  });

  it('His Heels awards 2 to dealer on Jack starter', () => {
    // Cut starter, it's a Jack → dealer gets 2
  });

  it('rejects Go when player has playable card', () => {
    // Player has a 3, count is 25 → 3+25=28 ≤ 31, cannot Go
  });

  it('tracks cumulative hand stats (pegging, hand, crib)', () => {
    // After scoring, verify handStats updated correctly
  });
});
```

```bash
git commit -m "feat(engine): add game state machine with full phase flow"
```

---

### Task 1.10: AI Decision Logic

**Files:**
- Create: `src/engine/ai.ts`
- Test: `src/engine/__tests__/ai.test.ts`

**AI discard selection:**
- Evaluate all 15 possible 2-card discard combinations
- Score remaining 4-card hand using quickScore (average over possible starters)
- Apply crib modifier: dealer gets bonus for strong crib discards, pone penalized
- Select best discard pair

**AI play selection:**
- Prioritize making 31 (2 points)
- Then making 15 (2 points)
- Then pairs
- Avoid leaving count at 5 or 21 (easy fifteens for opponent)
- Fall back to lowest playable card

**Tests:**

```typescript
describe('AI', () => {
  it('never makes an illegal play', () => {
    // AI must not play a card that exceeds 31
  });

  it('never fails to play when it has a valid card', () => {
    // If AI has a card ≤ 31-count, it must play (not Go)
  });

  it('selects discard within 500ms', () => {
    // Performance test — AI must not take too long
  });
});
```

```bash
git commit -m "feat(engine): add AI discard and play selection logic"
```

---

### Task 1.11: Optimal Play Calculator (for Coaching)

**Files:**
- Create: `src/engine/optimal.ts`
- Test: `src/engine/__tests__/optimal.test.ts`

This calculates what the OPTIMAL play would have been for a given hand. Used by the coaching engine (end-of-hand review, end-of-game analysis, Cribbage Grade).

- `optimalDiscard(hand: Card[], isDealer: boolean)`: returns best 2-card discard and expected hand value
- `optimalPeggingPlay(hand: Card[], pile: Card[], count: number)`: returns best card to play and reasoning

```bash
git commit -m "feat(engine): add optimal play calculator for coaching engine"
```

---

## Phase 2: Core Game UI

> **Prerequisite:** Phase 1 complete. All engine tests passing.
> **Skill:** Use @frontend-design for SKUNK'D visual direction before writing components.

### Task 2.1: Card Component

**Files:**
- Create: `src/components/game/GameCard.tsx`
- Create: `src/components/game/GameCard.css`
- Test: `src/components/game/__tests__/GameCard.test.tsx`

Card component renders face (rank + suit symbol) and back (SKUNK'D branded). States: default, selected (lifted + glow), dimmed (not playable), face-down.

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/src/components/game/GameCard.tsx`

```bash
git commit -m "feat(ui): add GameCard component with face/back/selected states"
```

---

### Task 2.2: Player Hand with Fan Layout and Auto-Sort

**Files:**
- Create: `src/components/game/PlayerHand.tsx`
- Test: `src/components/game/__tests__/PlayerHand.test.tsx`

- Cards fan out in arc (CSS transforms, mobile-friendly touch targets)
- Auto-sorted lowest to highest rank after deal
- Tap to select (lifted + gold glow), tap again to deselect
- During discard: select exactly 2 cards
- During pegging: select 1 card to play

```bash
git commit -m "feat(ui): add PlayerHand with arc fan layout and auto-sort"
```

---

### Task 2.3: Card Dealing Animation

**Files:**
- Create: `src/components/game/DealAnimation.tsx`

- Cards fly from deck position to each player's hand
- Staggered timing — alternating player/opponent like a real deal
- GPU-composited: `transform` + `opacity` only
- Duration: ~1.5s total, individual cards ~200ms each

```bash
git commit -m "feat(ui): add card dealing animation with staggered timing"
```

---

### Task 2.4: Play Area

**Files:**
- Create: `src/components/game/PlayArea.tsx`

Center area showing:
- Pegging pile (cards played this round, fanned)
- Current count display
- Starter card (face up after cut)
- Crib (face down during play, face up during Show)

```bash
git commit -m "feat(ui): add PlayArea with pegging pile, count, starter, crib"
```

---

### Task 2.5: SVG Cribbage Board

**Files:**
- Create: `src/components/game/CribbageBoard.tsx`
- Test: `src/components/game/__tests__/CribbageBoard.test.tsx`

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/src/components/game/CribbageBoard.tsx`

- Full 121-hole U-shape track in SVG
- Two peg tracks (player: gold inner, opponent: red/skunk-green outer)
- Skunk line at 91 ("S"), double-skunk at 61 ("2S")
- Number markers at 15, 30, 45, 75, 90, 105
- Wood grain texture on board body
- Responsive sizing (fits mobile viewport)

```bash
git commit -m "feat(ui): add SVG cribbage board with 121-hole track"
```

---

### Task 2.6: Peg Animations

**Files:**
- Modify: `src/components/game/CribbageBoard.tsx`

- Animated peg movement using CSS transitions on SVG `cx`/`cy` via inline style
- Leapfrog: back peg jumps over front peg
- Cubic-bezier easing: `0.34, 1.56, 0.64, 1` (overshoot for "click into hole" feel)
- Back peg: 0.5s, front peg: 0.6s (staggered)

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/.lovable/plan.md`

```bash
git commit -m "feat(ui): add peg animations with leapfrog and overshoot easing"
```

---

### Task 2.7: Score Panel and Action Bar

**Files:**
- Create: `src/components/game/ScorePanel.tsx`
- Create: `src/components/game/ActionBar.tsx`

**ScorePanel:** Score display header. Shows player name, score, dealer indicator.

**ActionBar:** Phase-aware action buttons:
- DEALING: disabled "Dealing..."
- DISCARD: "Send to Crib" (requires 2 selected)
- PEGGING: "Play Card" / "Say Go!" / "Opponent thinking..."
- SHOW: "Continue"
- HAND_COMPLETE: "Next Hand"
- GAME_OVER: "Play Again"

```bash
git commit -m "feat(ui): add ScorePanel and phase-aware ActionBar"
```

---

### Task 2.8: Scoring Display (Show Phase + Pegging)

**Files:**
- Create: `src/components/game/ShowScoring.tsx`
- Create: `src/components/game/PeggingScore.tsx`

**ShowScoring:** Step-by-step scoring breakdown during Show phase. Visual highlighting of which cards form each combination. Animated point tallying.

**PeggingScore:** Real-time display during pegging — shows "fifteen for 2", "pair for 2", "run of 3 for 3", etc. Fades in and out.

```bash
git commit -m "feat(ui): add scoring display for Show phase and pegging"
```

---

### Task 2.9: End-of-Hand Summary Scorecard

**Files:**
- Create: `src/components/game/HandSummary.tsx`

Matches the reference screenshot:
- Round number header
- Side-by-side You vs Opponent columns
- Total Score, Pegging, Hands, Cribs rows
- Color-coded proportion bars
- "New Game" and "Continue" buttons

```bash
git commit -m "feat(ui): add end-of-hand summary scorecard"
```

---

### Task 2.10: Game Screen (Main Container)

**Files:**
- Create: `src/components/game/GameScreen.tsx`
- Create: `src/hooks/useGame.ts`

**useGame hook:** Wraps the engine's state machine reducer. Adds:
- Auto-advance timers (dealing, cutting)
- AI play delays (800-1500ms random)
- Speech bubble management

**GameScreen:** Main container routing between:
- Start screen (SKUNK'D logo, "Deal Me In" button)
- Active game (all components assembled)
- Hand summary (end-of-hand scorecard)
- Game over (win/loss, skunk detection)

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/src/components/game/GameScreen.tsx`

```bash
git commit -m "feat(ui): add GameScreen with useGame hook and phase routing"
```

---

### Task 2.11: Game Over Screen

**Files:**
- Create: `src/components/game/GameOver.tsx`

- Victory/defeat display
- Skunk detection: regular win, skunk (loser < 91), double skunk (loser < 61)
- Final scores with full hand stats
- "Play Again" and "View Match Analysis" buttons
- SKUNK'D branding and mascot celebration/commiseration

```bash
git commit -m "feat(ui): add game over screen with skunk detection"
```

---

## Phase 3: SKUNK'D Branding and Pages

### Task 3.1: SKUNK'D Design System

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`

Apply the full SKUNK'D design system:
- Felt surface with SVG noise texture and radial vignette
- Card back design (SKUNK'D branded)
- Color system: greens, darks, gold accents
- Typography: bold headers, playful but readable body
- Cartoon-influenced UI chrome (rounded, punchy, high-contrast)

```bash
git commit -m "feat(brand): apply SKUNK'D design system and visual identity"
```

---

### Task 3.2: Start Screen / Onboarding

**Files:**
- Modify: `src/components/game/GameScreen.tsx` (start screen section)

- SKUNK'D logo prominently displayed
- Skunk mascot animation (subtle idle animation)
- "Play vs AI" button (primary)
- "Play Online" button (secondary, links to multiplayer — Phase 5)
- "How to Play" / "History" link
- Settings icon

```bash
git commit -m "feat(brand): add SKUNK'D start screen with mascot and game mode selection"
```

---

### Task 3.3: History & Rules Page

**Files:**
- Create: `src/pages/History.tsx`
- Modify: `src/App.tsx` (add route)

Content from `prototypes/add-components/cribbage-origin-story.md`:
- Accordion sections covering history, rules, variants, cultural stories, jargon, probability
- SKUNK'D branding and navigation
- "Deal Me In" button back to game

Reference: `prototypes/cribbage-charm-prototype/cribbage-charm-main/src/pages/History.tsx`

```bash
git commit -m "feat(pages): add History & Rules page with cribbage lore"
```

---

## Phase 4: Supabase Backend

> **Prerequisite:** Phase 1-3 complete. Playable vs-AI game working locally.
> **Action:** Create Supabase project at supabase.com before starting.

### Task 4.1: Create Supabase Project and Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/supabase.ts` (client init)
- Create: `.env.local` (Supabase URL + anon key)

**Step 1: Create Supabase project** at https://supabase.com/dashboard

**Step 2: Write migration with all tables from design doc Section 11**

All tables: users, games, game_players, hands, hand_cards, scores, decisions, stats, messages.

**Step 3: Apply migration**

```bash
npx supabase db push
```

**Step 4: Init Supabase client in app**

```bash
npm install @supabase/supabase-js
```

```bash
git commit -m "feat(db): add Supabase schema with all game tables"
```

---

### Task 4.2: Row Level Security Policies

**Files:**
- Create: `supabase/migrations/002_rls_policies.sql`

Critical RLS policies:
- `hand_cards`: users can only see their OWN cards (destination='hand') until Show phase
- `games`: anyone with invite_code can view, only creator can delete
- `game_players`: visible to all players in same game
- `messages`: visible to all players in same game
- `stats`: users can only read/update their own stats

```bash
git commit -m "feat(db): add RLS policies for multiplayer card security"
```

---

### Task 4.3: Authentication Setup

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/components/auth/AuthModal.tsx`
- Create: `src/hooks/useAuth.ts`

Configure in Supabase dashboard:
- Enable anonymous sign-in
- Enable email/password
- Enable Google OAuth
- Enable Apple Sign-In

Implement:
- `useAuth` hook (session management, sign in/out/up)
- `AuthModal` component (login/signup/guest options)
- Account upgrade flow (guest → registered)

```bash
git commit -m "feat(auth): add Supabase auth with guest, email, and social login"
```

---

### Task 4.4: Server-Side Card Dealing (Edge Function)

**Files:**
- Create: `supabase/functions/deal-hand/index.ts`

This is security-critical. Card dealing MUST happen server-side so clients never see opponent hands.

Edge Function:
1. Receives: game_id, hand_number
2. Creates shuffled deck
3. Deals 6 cards to each player
4. Inserts into `hand_cards` with appropriate `user_id`
5. Returns only the requesting player's cards

```bash
git commit -m "feat(edge): add server-side card dealing Edge Function"
```

---

### Task 4.5: Game CRUD Operations

**Files:**
- Create: `src/lib/gameApi.ts`
- Create: `supabase/functions/create-game/index.ts`

Functions:
- `createGame(mode, isAsync)` → returns game with invite_code
- `joinGame(inviteCode)` → adds player to game
- `getGameState(gameId)` → returns current game state (RLS-filtered)
- `submitAction(gameId, action)` → validates and applies game action

```bash
git commit -m "feat(api): add game CRUD operations with invite codes"
```

---

## Phase 5: Multiplayer

> **Prerequisite:** Phase 4 complete. Supabase backend running.

### Task 5.1: Real-Time Game Channel

**Files:**
- Create: `src/hooks/useGameChannel.ts`

Supabase Realtime Broadcast channel per game:
- Subscribe to game actions (play card, discard, Go)
- Broadcast own actions to other players
- Handle reconnection gracefully

```bash
git commit -m "feat(multiplayer): add real-time game channel with Broadcast"
```

---

### Task 5.2: Presence Tracking

**Files:**
- Modify: `src/hooks/useGameChannel.ts`

Supabase Presence for:
- Online/offline status per player
- "Opponent is thinking..." indicator
- Typing indicator in chat
- Disconnect detection

```bash
git commit -m "feat(multiplayer): add presence tracking for online status"
```

---

### Task 5.3: Game Invitation Flow

**Files:**
- Create: `src/pages/Join.tsx`
- Modify: `src/App.tsx` (add `/join/:code` route)
- Create: `src/components/game/ShareLink.tsx`

- Host creates game, gets shareable URL
- Join page: validates invite code, shows game info, "Join Game" button
- Guest users can join without account
- Deep linking support for PWA

```bash
git commit -m "feat(multiplayer): add game invitation via share links"
```

---

### Task 5.4: Async Mode

**Files:**
- Create: `src/hooks/useAsyncGame.ts`
- Modify: `src/lib/gameApi.ts`

- DB subscriptions for game state changes
- Push notification on turn change (via PWA service worker)
- Auto-switch to real-time for pegging phase
- Persist game state between sessions

```bash
git commit -m "feat(multiplayer): add async mode with DB subscriptions"
```

---

### Task 5.5: Turn Timers

**Files:**
- Create: `src/components/game/TurnTimer.tsx`
- Modify: `src/hooks/useGameChannel.ts`

- Configurable turn timer for real-time games
- Visual countdown display
- Auto-play (random valid card) when timer expires
- No timer for async mode

```bash
git commit -m "feat(multiplayer): add configurable turn timers"
```

---

## Phase 6: LLM Integration

> **Prerequisite:** Phase 5 complete. Multiplayer working.
> **Action:** Install Gemini MCP for development: `claude mcp add gemini -- cmd /c npx -y @google/gemini-cli`

### Task 6.1: Gemini API Edge Function Proxy

**Files:**
- Create: `supabase/functions/llm-proxy/index.ts`
- Create: `src/lib/gemini.ts`

Edge Function that:
- Accepts prompt + context from client
- Adds system prompt for SKUNK'D personality
- Calls Gemini API (Flash for quick tasks, Pro for analysis)
- Rate limits per user (X calls per hour)
- Returns response to client

```bash
git commit -m "feat(llm): add Gemini API Edge Function proxy with rate limiting"
```

---

### Task 6.2: Score Explanations

**Files:**
- Create: `src/components/game/ScoreExplanation.tsx`
- Modify: `src/components/game/ShowScoring.tsx`

- After each scoring phase, generate LLM explanation
- Step-by-step math breakdown
- Contextual cribbage tips
- Displayed inline in the Show scoring UI

```bash
git commit -m "feat(llm): add LLM-powered score explanations during Show"
```

---

### Task 6.3: End-of-Hand Coaching Review

**Files:**
- Create: `src/components/game/HandReview.tsx`
- Create: `supabase/functions/coaching-review/index.ts`

- "Review My Plays" button on hand summary
- Edge Function computes: what you did vs optimal (using engine/optimal.ts)
- LLM generates natural language explanation
- Shows for both discard and pegging decisions

```bash
git commit -m "feat(llm): add end-of-hand coaching review"
```

---

### Task 6.4: End-of-Game Match Analysis

**Files:**
- Create: `src/components/game/MatchAnalysis.tsx`
- Create: `supabase/functions/match-analysis/index.ts`

- Full game summary after game ends
- Decision quality % (from decisions table)
- Biggest missed opportunities
- Strategic patterns
- Cribbage Grade calculation
- Improvement suggestions

```bash
git commit -m "feat(llm): add end-of-game match analysis with Cribbage Grade"
```

---

### Task 6.5: LLM-Assisted Chat

**Files:**
- Create: `src/components/chat/ChatPanel.tsx`
- Create: `src/components/chat/SuggestionBar.tsx`
- Create: `src/components/chat/QuickReactions.tsx`
- Create: `supabase/functions/chat-suggest/index.ts`

- Chat panel slides up from bottom
- Suggestion bar: 2-3 contextual trash talk lines while typing
- Quick-tap reactions: LLM-generated one-tap reactions
- Free text input
- Messages stored in `messages` table, broadcast via Realtime

```bash
git commit -m "feat(llm): add LLM-assisted chat with suggestions and reactions"
```

---

### Task 6.6: Profile Picture Generation

**Files:**
- Create: `src/components/profile/AvatarGenerator.tsx`
- Create: `supabase/functions/generate-avatar/index.ts`

- User uploads photo or types description
- Edge Function calls Gemini Imagen
- Generates SKUNK'D-style caricature (stink/disgust expression)
- Stores in Supabase Storage
- Updates user avatar_url

```bash
git commit -m "feat(llm): add SKUNK'D-style profile picture generation"
```

---

## Phase 7: Statistics & Analytics

> **Prerequisite:** Phase 6 complete. Coaching engine populating decisions table.

### Task 7.1: Stats Tracking and Postgres Triggers

**Files:**
- Create: `supabase/migrations/003_stats_triggers.sql`
- Create: `src/hooks/useStats.ts`

Postgres triggers:
- After game ends → update `stats` table (wins, losses, skunks, streaks)
- After decisions inserted → compute decision quality %
- After hand scored → update highest_hand if new record

```bash
git commit -m "feat(stats): add Postgres triggers for stats tracking"
```

---

### Task 7.2: Stats Page

**Files:**
- Create: `src/pages/Stats.tsx`
- Modify: `src/App.tsx` (add route)

Display all stats from design doc Section 10:
- Win/loss record, win rate, streaks
- Skunks given/received
- Highest hand
- Cribbage Grade with trend

```bash
git commit -m "feat(stats): add stats page with all-time statistics"
```

---

### Task 7.3: Data Visualizations

**Files:**
- Create: `src/components/stats/GradeChart.tsx`
- Create: `src/components/stats/ScoringBreakdown.tsx`
- Create: `src/components/stats/TrendLine.tsx`

Install: `npm install recharts` (already in prototype deps)

Three focused charts:
1. Cribbage Grade progression over last N games (line chart)
2. Pegging vs hand vs crib scoring distribution (bar chart)
3. Win rate trend line

```bash
git commit -m "feat(stats): add data visualizations for scoring and grade trends"
```

---

## Phase 8: PWA Polish & Deployment

### Task 8.1: Offline Support for vs-AI

**Files:**
- Modify: `vite.config.ts` (PWA precache config)

Configure service worker to cache:
- All game engine code
- All UI assets and components
- Skunk mascot images and icons
- Index page for offline shell

vs-AI mode should work fully offline. Multiplayer features gracefully degrade with "No connection" message.

```bash
git commit -m "feat(pwa): configure offline caching for vs-AI mode"
```

---

### Task 8.2: Push Notifications

**Files:**
- Create: `src/lib/notifications.ts`
- Modify: service worker config

Notifications for:
- "It's your turn!" (async mode)
- "You've been invited to a game!"
- Permission request on first multiplayer game

```bash
git commit -m "feat(pwa): add push notifications for async turns and invites"
```

---

### Task 8.3: Deploy to Hosting

**Files:**
- Create: `vercel.json` (or equivalent)

**Step 1: Deploy to Vercel (or Cloudflare Pages)**

```bash
npx vercel --prod
```

**Step 2: Verify PWA install prompt on mobile**

**Step 3: Verify offline vs-AI works**

**Step 4: Verify share links work (`/join/:code` routing)**

```bash
git commit -m "chore: configure production deployment"
```

---

### Task 8.4: E2E Tests with Playwright

**Files:**
- Create: `e2e/game-flow.spec.ts`
- Create: `e2e/scoring.spec.ts`
- Create: `e2e/multiplayer.spec.ts`
- Create: `playwright.config.ts`

Install: `npm install -D @playwright/test`

Critical E2E test scenarios:
1. Full game flow: start → deal → discard → cut → peg → show → next hand
2. Scoring correctness: known hands score correctly in UI
3. Game over: skunk detection displays correctly
4. Share link: create game → copy link → join in new tab
5. PWA: install prompt appears on mobile viewport

```bash
git commit -m "test(e2e): add Playwright E2E tests for game flow and multiplayer"
```

---

## Phase Summary

| Phase | Tasks | Description | Depends On |
|-------|-------|-------------|------------|
| 0 | 0.1-0.6 | Project foundation (git, Vite, Tailwind, Vitest, PWA, CLAUDE.md) | — |
| 0.5 | 0.5.1-0.5.8 | Claude Code project setup (ECC rules/skills, custom skills, agents, commands, permissions, continuous learning) | Phase 0 |
| 1 | 1.1-1.11 | Game engine (pure TS: types, deck, scoring, pegging, state, AI, optimal) | Phase 0.5 |
| 2 | 2.1-2.11 | Core game UI (cards, board, animations, scoring display, game screen) | Phase 1 |
| 3 | 3.1-3.3 | SKUNK'D branding, start screen, history page | Phase 2 |
| 4 | 4.1-4.5 | Supabase backend (schema, RLS, auth, Edge Functions, game API) | Phase 3 |
| 5 | 5.1-5.5 | Multiplayer (realtime, presence, invites, async, timers) | Phase 4 |
| 6 | 6.1-6.6 | LLM integration (Gemini proxy, coaching, chat, avatars) | Phase 5 |
| 7 | 7.1-7.3 | Statistics & analytics (triggers, stats page, visualizations) | Phase 6 |
| 8 | 8.1-8.4 | PWA polish & deployment (offline, notifications, deploy, E2E) | Phase 7 |

**Total tasks: 52** (44 original + 8 new Phase 0.5)

### ECC Workflow Integration

ECC serves as the foundation for ALL development workflows:

| Workflow | ECC Component | When Used |
|----------|--------------|-----------|
| **Writing code** | `coding-standards` skill + `coding-style.md` rule | Every task |
| **Testing** | `tdd-workflow` skill + `testing.md` rule + `tdd-guide` agent | Every task (TDD) |
| **TypeScript** | `patterns.md` (TS) + `security.md` (TS) rules | Every task |
| **React UI** | `frontend-patterns` skill | Phase 2, 3 |
| **Supabase** | `postgres-patterns` + `backend-patterns` skills | Phase 4, 5 |
| **API design** | `api-design` skill | Phase 4, 5, 6 |
| **Security** | `security-review` skill + `security-reviewer` agent | Phase 4, 5, 6 |
| **E2E testing** | `e2e-testing` skill + `e2e-runner` agent | Phase 8 |
| **Build errors** | `build-error-resolver` agent | Any phase (reactive) |
| **Quality gate** | `verification-loop` skill + `/verify` command | Every phase boundary |
| **LLM costs** | `cost-aware-llm-pipeline` skill | Phase 6 |
| **Scoring** | Custom `cribbage-scoring` guardrail + `scoring-validator` agent | Phase 1 (critical) |
| **Card security** | Custom `supabase-rls` guardrail | Phase 4, 5 |
| **Git** | `git-workflow.md` rule | Every commit |
| **Performance** | `performance.md` rule | Phase 2 (animations) |
| **Learning** | `continuous-learning-v2` skill | Ongoing across sessions |

---

## Execution Notes

- **TDD throughout:** Write failing test → implement → verify → commit. Every task.
- **Engine is pure TS:** Zero React imports in `src/engine/`. Test independently with Vitest.
- **Prototype reference:** Read prototypes for patterns but write fresh code. Don't copy-paste.
- **Scoring correctness is non-negotiable:** If a scoring test fails, stop and fix before moving on. Reference `prototypes/cribbage-llm-build-instructions.md` for edge cases.
- **Commit after every task.** Small, atomic commits.
- **Context7:** Use `@context7` for current Supabase, React, and Tailwind docs when implementing.
