Run scoring-specific tests with coverage:
npx vitest run src/engine/__tests__/scoring.test.ts src/engine/__tests__/pegging.test.ts --coverage

Verify these critical edge cases are covered:
- 29-point hand (5H,5S,5D,JC + 5C starter)
- Double-double run (3-3-4-4-5)
- Triple run (3-3-3-4-5)
- Crib flush (must be 5-card)
- Pegging run break detection

Use @cribbage-scoring skill for rules reference.
