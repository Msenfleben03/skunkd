import { describe, it, expect } from 'vitest';
import type { Card } from '../types';
import { createDeck } from '../deck';
import { scoreHand } from '../scoring';

/**
 * Exhaustive statistical validation of the cribbage scoring engine.
 *
 * Enumerates ALL possible (hand, starter) combinations:
 *   C(52,4) = 270,725 hands × 48 remaining starters = 12,994,800 total
 *
 * Builds a complete score frequency distribution and validates against
 * published reference data from multiple sources.
 *
 * PRIMARY REFERENCE: Rubl.com exhaustive enumeration table
 *   https://www.rubl.com/rules/cribbage-hand-number.html
 *   (Uses standard cribbage rules: 4-card hand flush = 4pts, 5-card = 5pts)
 *
 * CROSS-REFERENCE: OEIS A143133 (Eric W. Weisstein, 2008)
 *   https://oeis.org/A143133
 *   NOTE: OEIS A143133 uses a different flush model (no 4-card flushes),
 *   causing systematic differences in scores 0-18. Non-flush scores
 *   (24, 28, 29) match exactly. See analysis below.
 *
 * ADDITIONAL SOURCES:
 *   - Wolfram MathWorld: https://mathworld.wolfram.com/Cribbage.html
 *   - Cribbage Corner: https://cribbagecorner.com/facts/
 *   - DataGenetics: http://datagenetics.com/blog/february62018/index.html
 *
 * This is NOT a Monte Carlo sample — it is a full census of every
 * possible scoring situation in cribbage.
 */

/**
 * Generate all C(n,k) combinations of indices from an array.
 * Yields arrays of k elements chosen from the input array.
 */
function* combinations<T>(arr: readonly T[], k: number): Generator<T[]> {
  const n = arr.length;
  if (k > n || k < 0) return;
  if (k === 0) {
    yield [];
    return;
  }

  // Use iterative index-tracking approach for performance
  const indices = Array.from({ length: k }, (_, i) => i);

  while (true) {
    yield indices.map(i => arr[i]);

    // Find rightmost index that can be incremented
    let i = k - 1;
    while (i >= 0 && indices[i] === n - k + i) {
      i--;
    }
    if (i < 0) break;

    // Increment it and reset all indices to the right
    indices[i]++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1] + 1;
    }
  }
}

describe('Scoring Engine Statistical Validation', () => {
  it('generates correct number of C(52,4) combinations', () => {
    const deck = createDeck();
    let count = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of combinations(deck, 4)) {
      count++;
    }
    // C(52,4) = 52! / (4! × 48!) = 270,725
    expect(count).toBe(270_725);
  });

  it('exhaustively enumerates all hands and validates score distribution', () => {
    const deck = createDeck();

    // Score frequency map: score -> count of (hand, starter) combos producing that score
    const distribution = new Map<number, number>();
    let totalCombinations = 0;
    let totalScoreSum = 0;

    // Track component breakdowns for additional validation
    let totalFifteens = 0;
    let totalPairs = 0;
    let totalRuns = 0;
    let totalFlush = 0;
    let totalNobs = 0;

    // Create a Set of card indices for fast lookup
    const deckSize = deck.length;

    // Enumerate all C(52,4) = 270,725 four-card hands
    const handIndices: number[] = [0, 1, 2, 3];

    // Use index-based iteration for maximum performance
    while (true) {
      const hand: Card[] = [
        deck[handIndices[0]],
        deck[handIndices[1]],
        deck[handIndices[2]],
        deck[handIndices[3]],
      ];

      // Create a set of hand indices for fast exclusion
      const inHand = new Set(handIndices);

      // For each of the 48 remaining cards as starter
      for (let s = 0; s < deckSize; s++) {
        if (inHand.has(s)) continue;

        const starter = deck[s];
        const result = scoreHand(hand, starter, false);
        const score = result.total;

        distribution.set(score, (distribution.get(score) ?? 0) + 1);
        totalCombinations++;
        totalScoreSum += score;

        totalFifteens += result.fifteens;
        totalPairs += result.pairs;
        totalRuns += result.runs;
        totalFlush += result.flush;
        totalNobs += result.nobs;
      }

      // Advance to next combination of 4 indices
      let i = 3;
      while (i >= 0 && handIndices[i] === deckSize - 4 + i) {
        i--;
      }
      if (i < 0) break;
      handIndices[i]++;
      for (let j = i + 1; j < 4; j++) {
        handIndices[j] = handIndices[j - 1] + 1;
      }
    }

    // ── Total combinations ──────────────────────────────────────────
    // C(52,4) × 48 = 270,725 × 48 = 12,994,800
    // Source: OEIS A143133, Wolfram MathWorld — both confirm this count
    expect(totalCombinations).toBe(12_994_800);

    // ── Average score ───────────────────────────────────────────────
    // Standard cribbage (with 4-card flush): 4.7692
    // Source: rubl.com exhaustive enumeration (matches our engine)
    // Note: Wolfram MathWorld gives 511,661/108,290 ≈ 4.7249, but that
    // figure excludes 4-card flush scoring (OEIS A143133 model).
    const averageScore = totalScoreSum / totalCombinations;
    expect(averageScore).toBeCloseTo(4.7692, 2);

    // ── 29-point hands ──────────────────────────────────────────────
    // The perfect 29: 1 in 3,248,700. Exactly 4 possible combinations.
    // Source: Cribbage Corner (cribbagecorner.com/odds-of-29-hand/),
    //         OEIS A143133 (index 29 = 4), rubl.com
    // Composition: J + three 5s of other suits in hand, matching-suit 5 as starter
    expect(distribution.get(29) ?? 0).toBe(4);

    // ── Zero-point hands ("19 hands") ───────────────────────────────
    // 7.76% of all hands score zero. Cribbage slang: "19" = zero
    // (because 19 is the lowest impossible score).
    // Source: rubl.com (1,009,008 hands)
    // Note: OEIS gives 1,025,024 — the difference (16,016) is due to
    // hands that score only a 4-card flush (4pts) in standard cribbage
    // but 0 in OEIS's no-4-card-flush model.
    const zeroCount = distribution.get(0) ?? 0;
    expect(zeroCount).toBe(1_009_008);

    // ── Most common score ───────────────────────────────────────────
    // Score 4 is the most common (21.98%), narrowly beating score 2 (21.65%).
    // Together, scores 2 and 4 account for ~44% of all hands.
    // Source: rubl.com, confirmed by our exhaustive enumeration
    let mostCommonScore = 0;
    let mostCommonCount = 0;
    for (const [score, count] of distribution) {
      if (count > mostCommonCount) {
        mostCommonCount = count;
        mostCommonScore = score;
      }
    }
    expect(mostCommonScore).toBe(4);
    expect(mostCommonCount).toBe(2_855_676);

    // ── Impossible scores ───────────────────────────────────────────
    // Scores 19, 25, 26, 27 cannot be achieved due to cribbage scoring
    // combinatorics. Confirmed by both OEIS and rubl.com.
    expect(distribution.get(19) ?? 0).toBe(0);
    expect(distribution.get(25) ?? 0).toBe(0);
    expect(distribution.get(26) ?? 0).toBe(0);
    expect(distribution.get(27) ?? 0).toBe(0);

    // ── Maximum possible score ──────────────────────────────────────
    for (const [score] of distribution) {
      expect(score).toBeLessThanOrEqual(29);
      expect(score).toBeGreaterThanOrEqual(0);
    }

    // ── Distinct score values ─────────────────────────────────────
    // 30 possible values (0-29) minus 4 impossible = 26 distinct scores
    expect(distribution.size).toBe(26);

    // ── Full distribution validation (rubl.com reference) ──────────
    // Source: https://www.rubl.com/rules/cribbage-hand-number.html
    // Every value below matches rubl.com's published exhaustive enumeration.
    expect(distribution.get(0) ?? 0).toBe(1_009_008);   //  7.76%
    expect(distribution.get(1) ?? 0).toBe(99_792);       //  0.77%
    expect(distribution.get(2) ?? 0).toBe(2_813_796);    // 21.65% (2nd most common)
    expect(distribution.get(3) ?? 0).toBe(505_008);      //  3.89%
    expect(distribution.get(4) ?? 0).toBe(2_855_676);    // 21.98% (most common)
    expect(distribution.get(5) ?? 0).toBe(697_508);      //  5.37%
    expect(distribution.get(6) ?? 0).toBe(1_800_268);    // 13.85%
    expect(distribution.get(7) ?? 0).toBe(751_324);      //  5.78%
    expect(distribution.get(8) ?? 0).toBe(1_137_236);    //  8.75%
    expect(distribution.get(9) ?? 0).toBe(361_224);      //  2.78%
    expect(distribution.get(10) ?? 0).toBe(388_740);     //  2.99%

    // ── High-value score counts (OEIS cross-reference) ─────────────
    // These scores are unaffected by flush model differences,
    // so they match BOTH rubl.com AND OEIS A143133 exactly.
    expect(distribution.get(24) ?? 0).toBe(3_680);       // OEIS: 3,680 ✓
    expect(distribution.get(28) ?? 0).toBe(76);          // OEIS: 76 ✓  (1 in 170,984)
    expect(distribution.get(29) ?? 0).toBe(4);           // OEIS: 4 ✓   (1 in 3,248,700)

    // ── Component totals sum correctly ──────────────────────────────
    expect(totalFifteens + totalPairs + totalRuns + totalFlush + totalNobs).toBe(totalScoreSum);

    // ── Print full distribution for manual comparison ───────────────
    const sortedScores = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  COMPLETE CRIBBAGE HAND SCORE DISTRIBUTION');
    console.log('  (Non-crib, exhaustive enumeration of all 12,994,800 combos)');
    console.log('══════════════════════════════════════════════════════════');
    console.log(`  ${'Score'.padStart(5)}  ${'Count'.padStart(10)}  ${'Percent'.padStart(8)}  Histogram`);
    console.log('  ─────  ──────────  ────────  ─────────────────────────');

    for (const [score, count] of sortedScores) {
      const pct = ((count / totalCombinations) * 100).toFixed(4);
      const barLen = Math.round((count / mostCommonCount) * 40);
      const bar = '█'.repeat(barLen);
      console.log(`  ${String(score).padStart(5)}  ${String(count).padStart(10)}  ${pct.padStart(7)}%  ${bar}`);
    }

    console.log('  ─────  ──────────  ────────  ─────────────────────────');
    console.log(`  Total: ${totalCombinations.toLocaleString()} combinations`);
    console.log(`  Average score: ${averageScore.toFixed(4)}`);
    console.log(`  Distinct scores: ${distribution.size}`);
    console.log(`  Zero-point hands: ${zeroCount.toLocaleString()}`);
    console.log(`  29-point hands: ${distribution.get(29) ?? 0}`);
    console.log(`  Most common: score ${mostCommonScore} (${mostCommonCount.toLocaleString()} times)`);
    console.log('');
    console.log('  Component averages (per hand):');
    console.log(`    Fifteens: ${(totalFifteens / totalCombinations).toFixed(4)}`);
    console.log(`    Pairs:    ${(totalPairs / totalCombinations).toFixed(4)}`);
    console.log(`    Runs:     ${(totalRuns / totalCombinations).toFixed(4)}`);
    console.log(`    Flush:    ${(totalFlush / totalCombinations).toFixed(4)}`);
    console.log(`    Nobs:     ${(totalNobs / totalCombinations).toFixed(4)}`);
    console.log('══════════════════════════════════════════════════════════\n');
  }, 60_000);
});
