# Simulation Patterns Reference

## Table of Contents
- [Monte Carlo with Convergence](#monte-carlo-with-convergence)
- [Exact Crib Enumeration](#exact-crib-enumeration)
- [Elo Rating System](#elo-rating-system)
- [Tournament Framework](#tournament-framework)
- [Statistical Significance Testing](#statistical-significance-testing)
- [Bootstrap Confidence Intervals](#bootstrap-confidence-intervals)
- [Convergence Reference Tables](#convergence-reference-tables)
- [Progressive Deepening](#progressive-deepening)

---

## Monte Carlo with Convergence

```typescript
interface MonteCarloConfig {
  readonly minSamples: number;
  readonly maxSamples: number;
  readonly targetStdError: number;
  readonly timeoutMs: number;
}

const FAST_CONFIG: MonteCarloConfig = {
  minSamples: 200, maxSamples: 1000,
  targetStdError: 0.05, timeoutMs: 100,
};

const COACHING_CONFIG: MonteCarloConfig = {
  minSamples: 500, maxSamples: 5000,
  targetStdError: 0.01, timeoutMs: 1500,
};

function monteCarloEV(
  keep: readonly Card[],
  excludeIds: Set<string>,
  config: MonteCarloConfig = FAST_CONFIG,
): { mean: number; stdError: number; samples: number } {
  const deck = buildFullDeck().filter(c => !excludeIds.has(c.id));
  const startTime = performance.now();
  const scores: number[] = [];

  while (scores.length < config.maxSamples) {
    if (scores.length >= config.minSamples &&
        performance.now() - startTime > config.timeoutMs) break;

    const starter = deck[Math.floor(Math.random() * deck.length)];
    scores.push(scoreHand(keep, starter, false).total);

    if (scores.length >= config.minSamples && scores.length % 100 === 0) {
      if (standardError(scores) <= config.targetStdError) break;
    }
  }

  return {
    mean: scores.reduce((s, v) => s + v, 0) / scores.length,
    stdError: standardError(scores),
    samples: scores.length,
  };
}

function standardError(values: number[]): number {
  const n = values.length;
  const avg = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1);
  return Math.sqrt(variance / n);
}
```

---

## Exact Crib Enumeration

When the opponent discard space IS enumerable (C(46,2) = 1,035 pairs x 44 starters = 45,540 evals, ~80ms):

```typescript
function exactCribExpectedValue(
  myDiscards: [Card, Card],
  knownHandIds: Set<string>,
): number {
  const deck = buildFullDeck().filter(c => !knownHandIds.has(c.id));
  let totalScore = 0;
  let totalWeight = 0;

  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const crib = [...myDiscards, deck[i], deck[j]];
      const usedIds = new Set([...knownHandIds, deck[i].id, deck[j].id]);

      for (const starter of deck) {
        if (usedIds.has(starter.id)) continue;
        totalScore += scoreHand(crib, starter, true).total;
        totalWeight++;
      }
    }
  }

  return totalScore / totalWeight;
}
```

---

## Elo Rating System

Use standard Elo with K=32. SKUNK'D difficulty target ratings:

| Level | Rating | Notes |
|-------|--------|-------|
| Beginner | 800 | Random from top-5 EV |
| Intermediate | 1200 | Full EV, greedy pegging |
| Advanced | 1600 | Full EV + crib, minimax depth-4 |
| Expert | 2000 | Position-aware, SO-ISMCTS |

---

## Tournament Framework

```typescript
async function runTournament(
  strategyA: AIStrategy,
  strategyB: AIStrategy,
  numGames: number,
  numWorkers = navigator.hardwareConcurrency ?? 4,
): Promise<{ winRate: number; totalGames: number }> {
  const gamesPerWorker = Math.ceil(numGames / numWorkers);
  const workers = Array.from({ length: numWorkers }, () =>
    new Worker(
      new URL('../engine/workers/tournament.worker.ts', import.meta.url),
      { type: 'module' }
    )
  );

  const promises = workers.map((worker) =>
    new Promise<{ wins: number; total: number }>((resolve) => {
      worker.onmessage = (e) => { resolve(e.data); worker.terminate(); };
      worker.postMessage({ strategyA, strategyB, numGames: gamesPerWorker });
    })
  );

  const results = await Promise.all(promises);
  const totalWins = results.reduce((s, r) => s + r.wins, 0);
  const totalGames = results.reduce((s, r) => s + r.total, 0);

  return { winRate: totalWins / totalGames, totalGames };
}
```

**Minimum games:** 500 for 95% confidence at 5% margin. 9,604 for 1% margin.

---

## Statistical Significance Testing

Two-proportion z-test for strategy comparison:

```typescript
function strategySignificanceTest(
  winsA: number, totalGames: number,
): { significant: boolean; pValue: number; confidence: string } {
  const p = winsA / totalGames;
  const pNull = 0.5;
  const se = Math.sqrt(pNull * (1 - pNull) / totalGames);
  const z = (p - pNull) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return {
    significant: pValue < 0.05,
    pValue,
    confidence: pValue < 0.01 ? '99%' : pValue < 0.05 ? '95%' : 'not significant',
  };
}

// Abramowitz and Stegun approximation
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * z);
  const poly = t * (0.319381530 + t * (-0.356563782 +
    t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
}
```

**Sample size formula:** `n = (z^2 * p * (1-p)) / e^2`
- 95% CI, 5% margin: n = 385
- 95% CI, 1% margin: n = 9,604

---

## Bootstrap Confidence Intervals

Use standard bootstrap resampling (1000 resamples) on game outcomes array. Sort resampled
means, take percentile bounds for CI. Key parameters for SKUNK'D:

- **Tournament comparisons:** 95% CI with 1000 resamples
- **Strategy validation:** Report lower bound — if lower > 0.5, strategy is significantly better
- **Quick check:** If 500-game win rate CI doesn't include 0.5, difference is real

---

## Convergence Reference Tables

Error decreases as 1/sqrt(n). For cribbage hand EV (sigma ~4 pts):

| Samples | SE (pts) | 95% CI | Use Case |
|---------|----------|--------|----------|
| 46 (exact) | 0 | exact | Discard hand EV (current engine) |
| 100 | ~0.40 | +/- 0.78 | Quick estimates only |
| 500 | ~0.18 | +/- 0.35 | Coaching feedback |
| 1,000 | ~0.13 | +/- 0.25 | Strategy comparison |
| 5,000 | ~0.06 | +/- 0.11 | Statistical validation |

### Feasibility Thresholds (TypeScript, browser main thread)

| Iterations | Approach | UI Impact |
|-----------|----------|-----------|
| < 10,000 | Synchronous | None (<16ms) |
| 10K - 500K | Web Worker | None (offloaded) |
| > 500K | Monte Carlo sampling | Web Worker required |

---

## Progressive Deepening

Return best-so-far at any point — important for time-bounded AI decisions:

```typescript
interface AnytimeResult<T> {
  bestResult: T;
  confidence: number;  // 0-1
  iterations: number;
}

function anytimeDiscard(
  hand: readonly Card[],
  isDealer: boolean,
  timeBudgetMs: number,
): AnytimeResult<DiscardResult> {
  // Phase 1: Greedy heuristic (instant)
  const fast = aiSelectDiscard(hand, isDealer);
  let result: AnytimeResult<DiscardResult> = {
    bestResult: fast, confidence: 0.85, iterations: 690,
  };

  // Phase 2: Exact hand EV already done by aiSelectDiscard
  result.confidence = 0.95;

  // Phase 3: Full crib enumeration if time remains
  if (timeBudgetMs > 100) {
    // Replace heuristic crib with exact crib EV
    // Adds 45,540 evals (~80ms)
    result.confidence = 1.0;
  }

  return result;
}
```
