# SKUNK'D — Product Design Document

**Date:** 2026-02-25
**Status:** Approved
**Version:** 1.0

---

## 1. Product Vision

SKUNK'D is a Progressive Web App (PWA) mobile cribbage game with a bold, edgy personality. Multiplayer-first with LLM-powered coaching, chat, and avatar generation. The skunk mascot and irreverent tone differentiate it from every other cribbage app on the market.

**Name:** SKUNK'D
**Tagline:** TBD (the working title "Get Pegged" is retired)
**Domain:** TBD

---

## 2. Game Modes

| Mode | Phase | Players | Description |
|------|-------|---------|-------------|
| vs AI | 1 | 1 human + 1 AI | Offline-capable, full coaching available |
| vs Human (real-time) | 1 | 2 humans | Live play via WebSocket, share link invite |
| vs Human (async) | 1 | 2 humans | Turn-based with push notifications |
| 3-player (1v1v1) | 2 | 3 humans or 2+AI | Standard 3-hand cribbage |
| 3-player (Captain) | 2 | 3 humans | Captain rules variant |

- Phase 1 ships 2-player modes only (vs AI + vs human)
- Phase 2 adds 3-player modes
- Engine architecture anticipates 3-player from day one (flexible player count in data models)

---

## 3. Architecture Overview

```
+---------------------------------------------+
|                SKUNK'D PWA                   |
|       React 18 + TypeScript + Vite           |
|      Tailwind CSS + shadcn/ui + PWA          |
+-------------+---------------+---------------+
| Game Engine  | UI Layer      | PWA Shell     |
| (pure TS)    | (React)       | (SW+manifest) |
| - scoring    | - game views  | - offline AI  |
| - state      | - chat        | - push notifs |
| - AI logic   | - stats       | - installable |
| - rules      | - profiles    |               |
+------+-------+-------+-------+-------+------+
       |               |               |
       v               v               v
+----------------------------------------------+
|            Supabase (Free Tier)              |
+----------+----------+----------+-------------+
| Postgres | Realtime | Auth     | Edge         |
| - games  | -broadcast| - guest | Functions    |
| - stats  | -presence | - email | - LLM proxy  |
| - users  | -db subs  | - Google| - coaching   |
| - chat   |           | - Apple | - avatars    |
+----------+----------+----------+-------------+
|                  Storage                     |
|            (profile pictures)                |
+----------------------------------------------+
       |
       v
+----------------+
|  Gemini API    |
|  (paid tier)   |
|  - coaching    |
|  - chat assist |
|  - avatars     |
|  - score explain|
+----------------+
```

---

## 4. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + TypeScript | Existing prototype, strong ecosystem |
| Bundler | Vite + vite-plugin-pwa | Fast dev, zero-config PWA support |
| Styling | Tailwind CSS + shadcn/ui | Existing prototype, rapid UI dev |
| Backend | Supabase (free tier) | Postgres + Realtime + Auth + Edge Functions + Storage |
| Database | Postgres (via Supabase) | Relational data, analytics-ready, RLS for security |
| Real-time | Supabase Realtime | Broadcast + Presence + DB subscriptions |
| Auth | Supabase Auth | Guest + email + social, free tier |
| Server Logic | Supabase Edge Functions | LLM proxy, card dealing, security enforcement |
| LLM | Gemini API | Coaching, chat suggestions, avatars, scoring |
| Image Gen | Gemini Imagen (or similar) | Profile picture caricatures |
| Hosting | Vercel / Cloudflare Pages | Free tier static hosting for PWA |
| Storage | Supabase Storage (1GB free) | Profile pictures |
| Testing | Vitest (unit) + Playwright (E2E) | Full coverage for game logic and UI flows |

---

## 5. Branding & Visual Design

- **Tone:** Edgy, playful, bold, irreverent
- **Mascot:** Skunk character — central throughout the app (from the Skunk'd logo holding 5-5-5-J with green smoke)
- **Aesthetic:** Cartoon-influenced, vibrant. Not a stuffy card room.
- **Card/board surfaces:** Clean and readable, but all UI chrome, animations, onboarding, coaching, and chat carry the SKUNK'D personality
- **Color palette:** Built around the green smoke / dark background from the logo, with accent colors
- **Cribbage lore:** Woven into coaching responses, trash talk suggestions, and the history/rules section

---

## 6. Core UI/UX Requirements

### 6.1 Realistic Cribbage Board
- Full 121-hole board rendered in SVG
- U-shape or classic track layout
- Skunk line at hole 91, double-skunk line at hole 61 — visually marked with "S" and "2S" labels
- Wood grain / physical board aesthetic (classy surface even with cartoon UI chrome)
- Both players' peg tracks clearly distinguishable (distinct colors)
- Number markers at key positions (15, 30, 45, 75, 90, 105)

### 6.2 Peg Animations
- Animated peg movement on every score event (pegging, hand scoring, crib scoring, His Heels)
- Leapfrog behavior — back peg jumps over front peg (matches real cribbage)
- Cubic-bezier easing with slight overshoot for physical "click into hole" feel
- Staggered timing between front/back peg for visual clarity
- GPU-composited animations only (transform + opacity)

### 6.3 Card Dealing Animation
- Animated card deal at start of each hand — cards fly from deck to each player's hand
- Staggered timing (not all cards at once) — alternating player/opponent like a real deal
- GPU-composited (transform + opacity only, no layout-thrashing properties)

### 6.4 Auto-Sorted Hands
- Player's hand auto-arranges lowest to highest rank after deal
- Maintains sort order throughout the hand
- Cards fan out in an arc (mobile-friendly touch targets)

### 6.5 Scoring Transparency

**During pegging:**
- Real-time display of what scored (fifteen for 2, pair for 2, run of 3, etc.)
- Visual highlighting of contributing cards

**During Show phase:**
- Step-by-step breakdown of each scoring combination
- Visual highlighting of which cards contribute to each combination
- Powered by LLM score explanations at every scoring turn

### 6.6 End-of-Hand Summary Scorecard

After each hand, display a scorecard with cumulative game stats:

| Stat | You | Opponent |
|------|-----|----------|
| **Total Score** | Running total | Running total |
| **Pegging** | Cumulative pegging points | Cumulative pegging points |
| **Hands** | Cumulative hand scoring | Cumulative hand scoring |
| **Cribs** | Cumulative crib points | Cumulative crib points |

- Round number header (Round 1, Round 2, etc.)
- Side-by-side comparison with color-coded proportion bars
- "New Game" (quit) and "Continue" (next hand) actions

---

## 7. Multiplayer Architecture

### 7.1 Real-Time Mode (Default)
- Supabase Realtime Broadcast for game actions (play card, discard, "Go")
- Supabase Presence for online status, turn indicators, typing in chat
- Turn timers (configurable) to keep games moving

### 7.2 Async Mode (User's Choice)
- Game state persisted in Postgres
- Supabase DB subscriptions for state change notifications
- Push notifications via PWA service worker ("It's your turn!")
- Pegging phase auto-switches to real-time (both players must be online)

### 7.3 Game Invitation
- Host creates game, gets shareable URL (e.g., `skunkd.app/join/ABC123`)
- Guest users can join without an account
- PWA deep linking — tapping the link opens the installed PWA or browser
- No matchmaking — players connect directly via shared links
- No friend system for MVP (social features can come later)

### 7.4 Card Security Model
- All card dealing and hand assignment happens server-side (Supabase Edge Function)
- Row Level Security (RLS) policies ensure each player only receives their own cards
- Shared state (starter card, pegging pile, scores) is visible to all
- Hidden state (hands, crib contents pre-show) is player-scoped
- Client never receives opponent hand data until the Show phase

---

## 8. Authentication

| Method | Use Case |
|--------|----------|
| Anonymous/Guest | Instant play for vs-AI, join a game via link |
| Email/Password | Traditional account creation |
| Google OAuth | Social login (mobile-friendly) |
| Apple Sign-In | iOS users |
| Account upgrade | Guest prompted to link account for stats/multiplayer |

All methods supported via Supabase Auth. Strategy is maximum flexibility — cast a wide net for onboarding.

---

## 9. LLM Features (Gemini API via Edge Functions)

### 9.1 Score Explanations
- **Trigger:** Every scoring turn (pegging and Show phase)
- **Output:** Step-by-step math breakdown of how a hand scored
- **Example:** "Fifteens: 5+J=15 (2pts), 5+5+5=15 (2pts). Pairs: three 5s = pair royal (6pts). Total: 10pts"

### 9.2 Post-Play Coaching

**End-of-Hand Review:**
- "Review My Plays" button after each hand scores
- Shows discard decision vs optimal choice with brief explanation
- Shows each pegging play vs optimal with explanation
- Available in all game modes (player already committed to decisions)

**End-of-Game Analysis:**
- "Match Analysis" after game ends
- Full game summary: decision quality %, biggest missed opportunities
- Strategic patterns identified, improvement suggestions
- Feeds into Cribbage Grade calculation

**No mid-play indicators** — nothing that interrupts or influences active gameplay.

### 9.3 LLM-Assisted Chat

**Suggestion Bar:**
- While composing a message, LLM offers 2-3 contextual trash talk suggestions
- Based on what just happened in the game (scores, skunks, lucky cuts)
- Infused with cribbage history/lore (Sir Suckling, USS Wahoo, etc.)

**Quick-Tap Reactions:**
- LLM-generated contextual reactions (tap to send instantly)
- Game-context-aware (different reactions for big hands vs getting skunked)

**Free Text:**
- Users can always type their own messages

### 9.4 LLM Profile Picture Generation

- Users generate a cartoon caricature headshot in the "Skunk'd" style
- Default theme: exaggerated facial expressions suggesting foul smell / stink / disgust
- User uploads a photo or describes themselves, LLM generates a skunk-themed caricature
- Uses Gemini Imagen or similar image generation API
- Stored in Supabase Storage

### 9.5 LLM Architecture
- All LLM calls route through Supabase Edge Functions
- API keys stay server-side (never exposed in client JavaScript)
- Rate limiting per user to control costs
- Prompts formatted with game context for relevant responses

---

## 10. Statistics & Analytics

### 10.1 Per-Game Tracking
- Points from pegging (broken out per hand)
- Points from hand scoring (broken out per hand)
- Points from crib scoring (broken out per hand)
- Decision quality % (optimal vs actual plays, from coaching engine)

### 10.2 All-Time Stats
- Win/loss record, win rate
- Highest hand ever scored
- Games skunked opponent (won by 30+)
- Games double-skunked opponent (won by 60+)
- Times been skunked / double-skunked
- Current win streak, best win streak

### 10.3 Cribbage Grade
- Composite rating based on % of optimal plays per game
- Tracked over time (improvement curve)
- Incorporates both discard decisions and pegging play quality

### 10.4 Data Visualizations (Focused)
- Scoring trend line (grade over last N games)
- Pegging vs hand vs crib scoring distribution (pie or bar chart)
- Grade progression chart over time
- Keep it clean — not a dashboard overload

---

## 11. Data Model (Postgres)

```sql
-- Core tables
users           (id, display_name, avatar_url, cribbage_grade, created_at)
games           (id, mode, status, created_by, invite_code, is_async, created_at)
game_players    (game_id, user_id, seat, is_dealer, is_ai)

-- Hand tracking
hands           (id, game_id, hand_number, dealer_user_id, starter_card)
hand_cards      (hand_id, user_id, card, destination: hand|crib|pegging)

-- Scoring
scores          (hand_id, user_id, source: pegging|hand|crib, points, breakdown_json)
decisions       (hand_id, user_id, phase, action, was_optimal, optimal_action)

-- All-time stats (denormalized for fast reads)
stats           (user_id, games_played, wins, losses, skunks_given, skunks_received,
                 double_skunks_given, double_skunks_received, highest_hand,
                 best_streak, current_streak, avg_cribbage_grade)

-- Social
messages        (id, game_id, user_id, content, is_ai_suggested, created_at)
```

- RLS policies on all tables for multiplayer security
- `hand_cards` with destination enum prevents revealing crib/hand to wrong player
- `decisions` table feeds the coaching engine and Cribbage Grade
- `stats` table is denormalized — updated via Postgres triggers after each game

---

## 12. PWA Configuration

- **Installable:** Add to home screen on iOS/Android
- **Offline support:** vs-AI mode fully playable offline (service worker caches game engine + assets)
- **Push notifications:** Async turn alerts, game invitations
- **Responsive:** Mobile-first, functional on tablet/desktop
- **Implementation:** vite-plugin-pwa for zero-config service worker and manifest generation

---

## 13. Cost Model

| Service | Cost | Notes |
|---------|------|-------|
| Supabase | Free | 500MB DB, 50K MAU, 200 concurrent realtime, 1GB storage |
| Hosting (Vercel/CF Pages) | Free | Static PWA hosting |
| Gemini API | Paid (usage-based) | Coaching, chat, avatars, score explanations |
| Everything else | Free | No app store fees (PWA), no other paid services |

**Cost tolerance:** LLM API costs are acceptable. All infrastructure must be zero-cost.

---

## 14. Existing Prototypes (Reference)

Three prototypes exist in `prototypes/`:

| Prototype | Location | Key Strength | Reuse Strategy |
|-----------|----------|-------------|----------------|
| cribbage-charm | `prototypes/cribbage-charm-prototype/cribbage-charm-main/` | Polished React/TS architecture, modular engine, SVG board | **Primary base** — game engine, component structure, scoring logic |
| gemini-engine | `prototypes/gemini-cribbage-game-engine/` | Live Gemini API integration, AI personas, coaching features | **LLM patterns** — API call architecture, prompt templates, coaching UX |
| get-pegged.tsx | `prototypes/cribbage-get-pegged.tsx` | Compact single-file reference | **Reference only** — scoring edge cases, alternative board layout |

Additional reference documents:
- `prototypes/cribbage-llm-build-instructions.md` — Engineering spec with build priority, scoring pitfalls, animation rules, AI guardrails
- `prototypes/add-components/cribbage-origin-story.md` — Comprehensive cribbage history (content for History page and coaching context)

---

## 15. Out of Scope

- Matchmaking / random opponents
- Friend lists / social features (beyond share links)
- Monetization / in-app purchases
- Audio / sound effects
- Native app store distribution
- Full game replay
- Detailed opponent-specific stats (beyond win/loss)

---

## 16. Development Tooling

### Enabled Plugins
| Plugin | Purpose |
|--------|---------|
| superpowers | Structured TDD workflow, planning, code review |
| context7 | Current docs for React, Supabase, Tailwind, Vite |
| everything-claude-code | Coding standards, frontend/backend patterns, TDD, security |
| supabase | Database ops, auth, realtime, RLS, storage |
| frontend-design | Distinctive SKUNK'D visual direction |
| code-review | Code quality enforcement |
| typescript-lsp | Real type checking |
| ralph-wiggum | Autonomous batch task loops |
| firecrawl | Web research, docs fetching |
| playground | Interactive HTML prototyping |
| vitest MCP | AI-optimized test runner with coverage |

### Phase-Specific Tools (Install When Needed)
- Gemini MCP — when building AI opponent / LLM features
- Gemini Imagen 3.0 — when building profile picture generator
- Game Asset MCP — when creating card art / skunk sprites
- BrowserTools MCP — when debugging PWA / WebSockets
- Playwright Skill — when writing E2E tests
- Vercel Deploy — when deploying preview URLs

---

## 17. Open Questions

1. **Domain name** — TBD, not a blocker
2. **Gemini model selection** — Flash vs Pro for different LLM features (cost vs quality tradeoff)
3. **Turn timer duration** — What's the right timeout for real-time multiplayer?
4. **Cribbage Grade formula** — Exact weighting of discard quality vs pegging quality
5. **3-player scoring rules** — Exact variant rules for Phase 2 (reference origin story doc)
