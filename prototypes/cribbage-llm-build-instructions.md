# LLM Build Instructions — Cribbage: Get Pegged!

These instructions govern HOW you approach the build. The companion document "Cribbage: Get Pegged! — Artifact Build Prompt" defines WHAT to build. Read both fully before writing any code.

---

## Build Priority Order

Implement in this exact sequence. Each layer must work before moving to the next:

1. **Scoring engine first.** Write and mentally verify `scoreHand()` and `scorePegging()` before touching any UI. These are pure functions with zero visual dependency. If scoring is wrong, the entire game is broken regardless of how good it looks. Test against the three known hands in the spec.

2. **Game state machine second.** Wire up the full phase flow (DEALING → DISCARD → CUT → PEGGING → SHOW → repeat) with placeholder UI. Every phase transition must work, including the game-ending check at 121. Use `useReducer` — this game has too many interrelated state changes for individual `useState` calls.

3. **AI decision logic third.** Implement discard selection, pegging play selection, and Go detection. The AI doesn't need to be brilliant — it needs to be correct. It must never make an illegal play, never exceed 31, and never fail to play when it has a valid card.

4. **Visual design and layout fourth.** Apply the aesthetic spec — felt texture, card design, typography, colors. Structure the mobile layout per the wireframe.

5. **Animations fifth.** Add card dealing, playing, peg movement, and phase transitions. These are polish — they make the game feel good but the game must function without them.

6. **Trash talk system sixth.** Wire AI speech bubbles to game event triggers.

7. **Taunt panel and GIF integration last.** This is the most deferrable feature. If you're running low on space, implement the text taunts only and stub the GIF tab with a "Coming soon" message.

---

## Artifact Size Management

This is a large project for a single artifact. Manage scope actively:

- **Do NOT generate comments explaining what code does.** The code should be self-documenting through clear naming. Comments consume tokens that should go toward functionality.
- **Combine related components.** Don't create separate components for every tiny UI element. A `GameBoard` component that contains the play area, card display, and count is better than five micro-components.
- **Inline styles where Tailwind classes suffice.** Use Tailwind utilities aggressively to avoid writing CSS blocks. Reserve custom CSS only for animations, textures, and effects that Tailwind can't express.
- **Compress trash talk arrays.** Store all trash talk lines in a single object at the top of the file, keyed by trigger event. Don't scatter string literals throughout the game logic.
- **If you must cut something to fit,** cut in this order (least to most important):
  1. GIF integration (replace with text-only taunts)
  2. Card fan arc layout (use a flat row instead)
  3. Felt texture/grain effect (use a flat gradient)
  4. 3D card flip animation (use a simple fade/swap)
  5. Cribbage board visualization (replace with numeric score display only)
  - **Never cut:** Scoring correctness, pegging logic, game flow, or the ability to play a complete game to 121.

---

## Critical Logic Pitfalls

These are the specific bugs that card game implementations commonly ship with. Prevent them:

### Scoring
- **Fifteens require checking ALL subsets.** A 5-card hand has 26 possible subsets of size 2–5. Do not use shortcuts that miss combinations. Generate all subsets programmatically.
- **Runs with duplicate ranks create multiple runs.** Hand: 3-4-4-5 with starter 6 = TWO runs of 4 (3-4-5-6 using each 4), not one run of 4. This is the #1 scoring bug in cribbage implementations.
- **Double-double runs.** Hand: 3-3-4-4 with starter 5 = FOUR runs of 3 = 12 points. Each combination of paired cards forms its own run.
- **Crib flush rule differs from hand flush.** Hand: 4-card flush = 4 points. Crib: must be 5-card flush or nothing.
- **Nobs checks suit match, not rank.** It's the Jack in your HAND that matches the STARTER's suit. Not any Jack. Not a Jack as the starter (that's His Heels).

### Pegging
- **Run detection during pegging considers only consecutively played cards.** If play sequence is 3, 7, 4, 5, 6 — the run is 4-5-6-7 (last four cards form a sequence when sorted), scoring 4 points. But if the sequence were 3, 7, K, 5, 6 — no run, because the K breaks the consecutive sequence.
- **Pairs during pegging must be consecutive.** Playing 5, 5, 7, 5 is NOT three of a kind — the 7 breaks it. Only the last 5 and the 7 are considered for pairing (no pair).
- **"Go" means you CANNOT play, not that you choose not to.** If a player says Go but has a card that could legally play (count + card value ≤ 31), that's a bug.
- **After a Go, the other player keeps playing until THEY also can't go.** Then last-card points are awarded and count resets.

### Game Flow
- **Non-dealer ALWAYS plays first in pegging** and **scores first in the show.** This matters because reaching 121 during the show means non-dealer wins even if dealer had a higher-scoring hand.
- **The game ends THE INSTANT someone reaches 121.** If the dealer gets His Heels and reaches 121, the game is over — the pegging phase never happens. If non-dealer reaches 121 during hand scoring, dealer's hand and crib are never scored.
- **Dealer alternates EVERY hand**, not every game.

---

## Board Layout Decision

The spec defines a fallback hierarchy for the cribbage board:

1. **Try classic straight 121-hole board first.** Render it as a compact horizontal strip. Test legibility at 390px viewport width.
2. **If the straight board is illegible or visually broken at mobile scale** (holes too small to distinguish pegs, board requires horizontal scrolling, layout pushes game area off-screen), switch to a **compact oval/racetrack layout** that fits within the viewport without scrolling.
3. **Do not spend excessive iteration on the straight board.** Make one good attempt. If it doesn't work cleanly, use the oval and move on. The board is a score visualization, not the core interaction.

---

## Animation Performance

- Use CSS `transform` and `opacity` exclusively for animations — these are GPU-composited and won't cause layout thrashing.
- Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` — these trigger layout recalculation.
- Use `will-change: transform` on elements that will animate frequently (cards, pegs).
- Keep simultaneous animations under 10 elements. Deal animation should stagger (not animate all 12 cards at once).
- All animation durations in the spec are suggestions. If they feel sluggish at runtime, shorten them. Snappy > cinematic.

---

## AI Behavioral Guardrails

- The AI must NEVER take longer than 1 second of artificial "thinking" delay. 500ms is ideal. Players will perceive anything longer as lag, not intelligence.
- The AI must NEVER make an illegal move. Validate every AI action against the rules before executing it.
- AI trash talk must NEVER fire during the player's active decision-making (card selection, pegging play). Only trigger talk during scoring reveals, phase transitions, or after the AI completes its own action. Don't distract the player mid-thought.
- If the trash talk line pool for a trigger is empty or undefined, show no bubble. Never show "undefined" or placeholder text.

---

## Giphy API Notes

- API key `dc6zaTOxFJmzC` is Giphy's public beta key. It works but is rate-limited.
- Use the `/v1/gifs/search` endpoint with `rating=pg-13` parameter to filter appropriately for the app's tone.
- Request `limit=9` results (fills a 3×3 grid cleanly).
- Use the `fixed_height_small` rendition (200px height) for the thumbnail grid — not the full-size GIF.
- Display the selected GIF using `fixed_height` rendition (200px) for the in-game overlay.
- Wrap ALL Giphy fetch calls in try/catch. On any failure, silently fall back to the text taunt tab. Do not show error modals or console warnings to the user.

---

## Final Verification

When the build is complete, mentally walk through this exact game scenario and confirm nothing breaks:

1. Game starts. Cards deal to both players (6 each). Dealer is randomly chosen.
2. Player selects 2 cards for crib. Taps "Send to Crib." AI discards 2.
3. Starter is cut. It's a Jack → dealer gets 2 points (His Heels), peg moves.
4. Pegging begins. Non-dealer plays first. Count goes up. Player hits Go at count 27. AI plays a 4 (count=31, scores 2). Count resets. Remaining cards are played.
5. Non-dealer hand scores first. Scores 8. Peg moves. AI talks trash.
6. Dealer hand scores. Scores 12. Peg moves. AI talks more trash.
7. Dealer crib scores. Has a 4-card flush but starter doesn't match → no flush points.
8. Next hand begins with dealer swapped.
9. Several hands later, player reaches 121 during hand scoring. Game ends immediately. Dealer's hand and crib are NOT scored. Victory screen appears.
10. Player taps "Play Again." Fresh game starts.

If any step in this scenario would fail, fix it before presenting the artifact.
