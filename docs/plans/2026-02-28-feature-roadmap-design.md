# SKUNK'D Feature Roadmap — Design Doc

**Date:** 2026-02-28
**Focus:** Multiplayer friends experience
**Framework:** Milestone-based releases

## Context

Core game loop, AI, LLM coaching, real-time + async multiplayer, stats page, and post-game summary are all shipped. The biggest remaining friction is **post-game** — no sense of progression, rivalry, or "let's go again" moment between friends.

## Constraints

- Zero new infrastructure cost (Supabase free tier, browser Web Push only)
- Ship fast — acceptable to have rough edges
- Mobile-first — everything must work great on phone, PWA constraints apply

---

## Milestone 1: "Ship It" — Unblock Real Players

> Close the gaps that prevent the current multiplayer experience from working end-to-end.

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| 1 | Apply migration 008 to remote Supabase DB | S | Post-game stats charts are broken in prod without it |
| 2 | Fix decisionLog clearing in online mode | S | LOAD_ONLINE_DEAL wipes discard history; discard coaching is blind in online games |
| 3 | Rematch button on Game Over screen | S | Reuse existing invite flow; the #1 "let's go again" moment |
| 4 | Live E2E multiplayer re-test + fix | S–M | Show pacing + disconnect never re-verified live after seat bug fix |
| 5 | Verify post-game summary charts in prod | S | Recharts data may be null until migration 008 is applied |

**Effort key:** S = single session · M = 1–2 sessions · L = 3+ sessions

---

## Milestone 2: "Rivalry" — Progression Between Friends

> Give two people a reason to keep coming back. Running W/L record, game history, and turn notifications turn one-off games into a running rivalry.

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| 6 | Head-to-head record (W/L, skunks, best hand vs this opponent) | M | Makes every game part of a series, not a throwaway |
| 7 | Game history list per opponent | M | HistoryPage.tsx scaffolded — needs Supabase query + real data wired in |
| 8 | Persistent rematch flow (skip re-sharing invite link) | S–M | "Rematch" after game over creates new game with same opponent automatically; builds on #3 |
| 9 | Web Push notifications for async turns | M | Free via browser Web Push API + service worker; highest retention lever for async play |

---

## Milestone 3: "Viral" — Shareable Moments & Bragging Rights

> Give players something to show off outside the app.

| # | Feature | Effort | Notes |
|---|---------|--------|-------|
| 10 | PWA install prompt | S | `beforeinstallprompt` banner — mobile players get persistent home screen icon |
| 11 | Share card generator (notable hand → image) | M | Canvas API renders hand + score + branding; triggers on 29-hand, skunk, double-skunk, personal best; native share sheet on mobile |
| 12 | Cribbage Grade badge share | S | Reuse share card pattern — "I scored an A+ Cribbage Grade" after match analysis |
| 13 | Leaderboard (among players you've faced) | L | Defer — complex privacy/fairness concerns; let rivalry data mature first |

---

## Sequencing Rationale

- **Milestone 1 first** — nothing in M2/M3 works well if the existing multiplayer has live bugs
- **Milestone 2 before 3** — viral moments need a foundation of real game history data to be credible
- **#8 (persistent rematch) after #3 (rematch button)** — same surface, progressive enhancement
- **#13 (leaderboard) deferred** — L effort, needs M2 data to be meaningful
