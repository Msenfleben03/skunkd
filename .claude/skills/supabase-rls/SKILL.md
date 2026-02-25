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
