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
