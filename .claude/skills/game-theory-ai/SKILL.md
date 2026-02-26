---
name: game-theory-ai
description: >
  Comprehensive game theory algorithms for card game AI. Covers MCTS/UCT/ISMCTS,
  Counterfactual Regret Minimization (CFR/MCCFR), Bayesian opponent modeling, statistical
  modeling for imperfect information, and decision quality metrics (EVL) for coaching.
  Activates when implementing AI decision logic, coaching feedback, opponent modeling,
  or any game-theoretic improvement to the engine.
---

# Cribbage AI — Game Theory and Optimization

Expert reference for building optimal cribbage AI and coaching systems. Derived from
academic research: Kelly/Churchill (2017), Cowling/Powley/Whitehouse (2012),
Zinkevich et al. (2007), Kocsis/Szepesvari (2006). See [Citations](#citations) for full list.

## When to Use

- Modifying `src/engine/ai.ts` or `src/engine/optimal.ts`
- Adding AI difficulty levels or adaptive opponent
- Building coaching feedback ("you should have discarded X")
- Implementing Monte Carlo simulation or MCTS/ISMCTS/CFR
- Optimizing crib estimation or pegging look-ahead
- Running AI self-play tournaments or strategy comparisons
- Designing EVL coaching metrics

## When NOT to Use

- Scoring engine changes (use `cribbage-scoring` skill)
- UI/React component work (use `frontend-patterns` skill)
- Database/Supabase work (use `supabase-rls` skill)

---

## Before Modifying AI Logic, Ask Yourself

1. **What's the accuracy target?** Gameplay (~95%) vs coaching (~99%)?
2. **What's the latency budget?** <200ms pegging / <500ms discard / unbounded coaching?
3. **Is this a lookup or a search?** Schell table O(1) vs simulation O(N)?
4. **Does this need to run in the UI thread?** If >50ms, use a Web Worker.
5. **Am I improving hand EV, crib EV, or pegging?** Each has different optimal approaches.

---

## Critical Anti-Patterns

### NEVER do these:

- **NEVER use random rollouts** for cribbage pegging — heuristic rollouts cut needed
  iterations by 2-4x because random play gives opponent free 15/31 scores
- **NEVER use Determinized UCT** — plateaus at 10K iterations; SO-ISMCTS does not
  (Kelly/Churchill 2017)
- **NEVER use uniform sampling** for opponent discards in crib simulation — players
  discard 10-K 100x more often than 5-5; uniform overestimates crib value
- **NEVER let AI read opponent's actual hand** — use `cloneAndRandomise()` to sample
  compatible hands; even Expert AI determinizes
- **NEVER lead 5 or ten-cards** in pegging — opponent scores immediate 15-2
- **NEVER implement Zobrist hashing** before profiling — 690 score calls per discard
  is already fast enough
- **NEVER trust 4-weight crib heuristic for coaching** — 70% accuracy vs 95% Schell
  lookup; use lookup as minimum baseline
- **NEVER block the UI thread** with MCTS — 500 iterations = ~2.5s; must use Web Worker

---

## Current Engine Assessment

| Component | Implementation | Gap |
|-----------|---------------|-----|
| Discard EV | Exact: 15 combos x 46 starters | Crib estimation is heuristic (~70% accuracy) |
| Pegging | Priority: 31 > 15 > pair > safe > low | No look-ahead, no trap plays, no run-building |
| Coaching | `optimal.ts` with reasoning strings | No decision quality metric (EVL) |
| Opponent model | None | No adaptation to player skill/tendencies |
| Board position | Ignored | No offense/defense mode switching |

---

## 0. Core Algorithm Selection

### ISMCTS vs CFR vs Determinized UCT

| Property | CFR / MCCFR | SO-ISMCTS | Determinized UCT |
|----------|-------------|-----------|------------------|
| Target | Nash equilibrium | Win rate vs. specific opponent | Win rate (flawed) |
| Imperfect info | Natively | Via determinization sampling | Via determinization (fails) |
| Mode | Offline pre-computation | Online anytime | Online anytime |
| Vs. strong opponents | More robust | May have exploitable patterns | Plateaus at 10K iter |
| Vs. weak opponents | Does not exploit mistakes | Naturally exploitative | Naturally exploitative |
| Cribbage validation | Not yet tested | Validated (Kelly/Churchill 2017) | Plateaus — not recommended |
| Implementation | High complexity | Moderate | Moderate |

**Recommendation:** Start with SO-ISMCTS (proven for cribbage). Use MCCFR offline to compute
near-optimal pegging strategy table as coaching ground truth for EVL calculations.

### Why Naive PIMC / Determinized UCT Fails

**Strategy Fusion:** Each determinized world may favor a different action. The aggregated
"most popular" action may be optimal in no individual world.

**Non-Locality:** A move locally good across all sampled worlds may be globally terrible
because it reveals information beyond the sampled horizon.

**Evidence:** Determinized UCT plateaus at ~10,000 iterations against a scripted opponent
(Kelly/Churchill 2017). SO-ISMCTS does not plateau because it searches information sets directly.

### ISMCTS Key Modification

Standard UCT uses parent visit count. ISMCTS replaces it with the count of determinizations
where the action was available — prevents underestimating nodes reachable in only a subset
of sampled worlds:

```
UCT_IS(i) = w_i/n_i  +  C * sqrt(ln(available_i) / n_i)
```

### CFR for Cribbage

Cribbage pegging: estimated 10^6-10^8 states (Moulton 2022). Tabular or lightly abstracted
CFR likely feasible. For full regret matching formulas and MCCFR variants, see
MCTS_IMPLEMENTATION.md.

---

## 1. Discard Optimization

### Tier 1: Current Heuristic (fast, ~70% crib accuracy)

The `estimateCribValue` in `ai.ts` uses 4 static weights. Known gaps: underweights
5-face combos (~6.6 pts avg), misses double-run potential, ignores flush probability.

### Tier 2: Schell Rank-Pair Lookup (zero-cost, ~95% accuracy) — RECOMMENDED

**If implementing:** MANDATORY — Read [DATA_TABLES.md](DATA_TABLES.md) for the complete
91-entry table and implementation code. Do NOT load MCTS_IMPLEMENTATION.md or SIMULATION_PATTERNS.md.

Replace heuristic with a 91-entry lookup table from three independent researchers
(Hessel, Rasmussen, Bowman — agree within 2.4%):

```typescript
function lookupCribEV(c1: Card, c2: Card): number {
  const key = sortedRankPair(c1.rank, c2.rank);
  return CRIB_EV_TABLE[key] ?? estimateCribValueFallback(c1, c2);
}
```

### Tier 3: Monte Carlo Crib Simulation (~98% accuracy, ~50-100ms)

For coaching path only. Sample 200-500 random crib completions. Optionally weight opponent
discard sampling by Schell probability distribution (ranges 0.030% to 3.712% — see
DATA_TABLES.md).

### Full EV Formula (Research Consensus)

```
EV_dealer(discard) = EV_hand(keep) + EV_crib(c1, c2)
EV_pone(discard)   = EV_hand(keep) - EV_crib_opponent(c1, c2)
```

Position asymmetry (orbitals.com verified): dealer averages 4.727 more pts/hand due to crib.

---

## 2. Pegging Strategy

### 2.1 Missing Strategies in Current Engine

| Strategy | Description | Priority |
|----------|-------------|----------|
| Avoid count 11 | Opponent plays any ten-card for 15-2 | Quick win |
| Run extension | Play card extending pile run before lowest-card fallback | Quick win |
| Board-position mode | Offense vs defense based on Theory of 26 | Medium |
| Trap plays | Bait opponent into sequences you control | Medium |
| Minimax look-ahead | Depth-4 search with determinized opponent hand | Advanced |
| SO-ISMCTS | Information Set MCTS in Web Worker | Advanced |

### 2.2 Quick Wins

**Add count 11 to dangerous counts:**
```typescript
const DANGEROUS_COUNTS = new Set([5, 11, 21]);
// Exception: if you hold a card making 31 from 11, leaving 11 is fine
```

**Run extension check before lowest-card fallback:**
```typescript
if (pile.length >= 2) {
  const runExtender = playable.find(c => extendsRun(pile, c));
  if (runExtender) return runExtender;
}
```

### 2.3 Trap Plays (Expert Strategy)

**Run-Baiting (7-8-9):** Lead 7. Opponent plays 8 for 15-2 (they score 2). Play 9
for run of 3 (you score 3). Net: +1 to you.

**Magic Eleven:** Any two cards summing to 11 enable 31-for-2. Hold one until count
reaches 20.

**Safe vs Unsafe Leads:** Lead 4 (opponent cannot score 15), or lead from a pair
(pair-royal trap).

### 2.4 Board Position Mode (Theory of 26)

| Score Zone | Dealer Mode | Pone Mode |
|-----------|-------------|-----------|
| 0-60 | Neutral | Neutral |
| 61-75 | Defense | Offense |
| 76-86 | Offense | Defense |
| 87-101 | Defense | Offense |
| 102-112 | Offense | Defense |
| 113-120 | Defense | Offense |

**Offense:** Pair opponent's lead, engage in runs, throw good cards to own crib.
**Defense:** Lead low from pair, avoid runs, play tens to keep count high.

---

## 3. ISMCTS for Pegging

**If implementing:** MANDATORY — Read [MCTS_IMPLEMENTATION.md](MCTS_IMPLEMENTATION.md)
for full TypeScript code, UCT, Web Worker setup, Zobrist hashing, and Expectimax alternative.
Do NOT load DATA_TABLES.md or SIMULATION_PATTERNS.md.

**Key result:** "SO-ISMCTS outperforms Determinized UCT and scripted greedy in Cribbage
with no game-specific enhancements." — Kelly & Churchill, 2017

**Iteration budget:** 500 iterations = ~2.5s JavaScript. Must run in Web Worker.

**Simpler alternative:** Expectimax with 20-50 determinizations and greedy rollout achieves
most of ISMCTS quality at lower complexity.

---

## 4. Coaching System

### Expected Value Lost (EVL)

The core coaching metric — how many expected points did the player lose?

```typescript
interface CoachingAnnotation {
  readonly decision: 'discard' | 'pegging_play';
  readonly actual: Card | Card[];
  readonly optimal: Card | Card[];
  readonly evActual: number;
  readonly evOptimal: number;
  readonly evl: number;         // evOptimal - evActual (always >= 0)
  readonly severity: 'good' | 'minor' | 'significant' | 'major';
  readonly explanation: string;
}
```

### EVL Severity Thresholds (from poker GTO trainers)

| EVL (points) | Severity | Message style |
|-------------|----------|---------------|
| < 0.1 | Excellent | "Optimal play!" |
| 0.1 - 0.5 | Minor | "Slightly better: [optimal]." |
| 0.5 - 1.5 | Significant | "Consider: [optimal]. Lost ~X pts." |
| 1.5 - 3.0 | Major | "Missed opportunity: [optimal]." |
| > 3.0 | Critical | "Key mistake. Likely changed game outcome." |

**Discard EVL:** Compare player's choice EV to optimal EV. O(15 * 46) = O(690) — fast.
**Pegging EVL:** Immediate points difference is minimum EVL; true EVL requires look-ahead.

### Adaptive Difficulty

| Level | Discard | Pegging | Opponent model |
|-------|---------|---------|----------------|
| Easy | Random from top-5 EV | Greedy (immediate) | None |
| Medium | Full EV (hand only) | Minimax depth-2, 10 samples | None |
| Hard | Full EV (hand + crib) | Minimax depth-4, 20 samples | Basic inference |
| Expert | Full EV + position-aware | SO-ISMCTS (500 iter, Web Worker) | Bayesian model |

---

## 4b. Bayesian Opponent Modeling

### Hand Inference During Pegging

Track marginal rank probabilities rather than full hand enumeration:

```typescript
interface OpponentHandBelief {
  rankProbabilities: Map<Rank, number>;
  inferredHandSize: number;
  updateFromPlay(played: Card): void;
  sampleCompatibleHand(): Card[];  // for ISMCTS determinization
}
```

### Discard Inference

- **Pone defending dealer's crib:** Unlikely to discard 5s, pairs, close ranks; most
  likely to discard combos with EV < 3.5 (10-K, 9-K, 9-Q)
- **Dealer filling own crib:** More likely to discard 5-X, pairs, connectors

Use orbitals.com discard probability matrix to weight ISMCTS determinization
(range: 0.030% to 3.712% — 101-fold variation).

### Player Profile Tracking

```typescript
interface PlayerProfile {
  discardStyle: 'conservative' | 'aggressive' | 'balanced';
  peggingStyle: 'defensive' | 'offensive' | 'mixed';
  endgameAwareness: number;  // 0-1
  observedHands: number;
}
```

After 5+ hands, adjust AI crib estimates and pegging weights toward opponent's tendencies.

---

## 5. Improvement Roadmap

### Quick Wins (ship before Phase 2 UI)

| Change | File | Impact | Effort |
|--------|------|--------|--------|
| Schell rank-pair lookup table | `ai.ts`, `optimal.ts` | Crib EV error 30% -> 5% | 1 hour |
| Add count 11 to dangerous | `ai.ts` | Avoids easy opponent 15s | 10 min |
| Run extension check | `ai.ts` | Captures 3+ pts missed now | 30 min |
| Board-position mode | `ai.ts` | Strategy adapts to score | 2 hours |

### Medium Effort (coaching quality)

| Change | Impact | Effort |
|--------|--------|--------|
| Monte Carlo crib in `optimalDiscard` | 98% vs 70% crib accuracy | 4 hours |
| EVL annotation system | Quantified coaching feedback | 4 hours |
| Expectimax pegging (20 determinizations) | Look-ahead without full MCTS | 6 hours |

### Advanced (post-launch)

| Change | Impact | Effort |
|--------|--------|--------|
| SO-ISMCTS in Web Worker | Best pegging AI quality | 2 days |
| Elo rating across difficulty levels | Calibrated AI strength | 1 day |
| Self-play tournament framework | Strategy validation | 1 day |

**If running tournaments:** MANDATORY — Read [SIMULATION_PATTERNS.md](SIMULATION_PATTERNS.md)
for convergence, Elo, significance testing, and bootstrap CI. Do NOT load
MCTS_IMPLEMENTATION.md or DATA_TABLES.md.

---

## 6. Algorithm Comparison

| Algorithm | Crib Accuracy | Pegging Quality | Runtime | Complexity |
|-----------|--------------|-----------------|---------|------------|
| Current heuristic | ~70% | Greedy | <1ms | Low |
| Rank-pair lookup | ~95% | Greedy | <1ms | Low |
| MC crib (N=500) | ~98% | Greedy | ~80ms | Medium |
| + Minimax pegging (d=4) | ~95% | Good | ~20ms | Medium |
| + Expectimax (50 det.) | ~95% | Very Good | ~50ms | Medium |
| + SO-ISMCTS (500 iter) | ~95% | Best | ~2.5s | High |

---

## 7. Key Invariants

These MUST NOT be violated regardless of algorithm:

1. **AI must not cheat.** Only knows: own hand, pile, starter (after cut), opponent's played cards.
2. **Go is not a choice.** Return `null` only when no card is legally playable.
3. **Respect 31-count limit.** Never play card where `cardValue(rank) + count > 31`.
4. **Crib flush rule.** 4-card crib flush = 0; only 5-card counts.
5. **Performance budget.** Discard <500ms, pegging <200ms (or Web Worker).
6. **Deterministic for replay.** Same seed = same recommendation for coaching.

---

## Citations

| # | Authors | Title / Source | Year | Key Finding |
|---|---------|---------------|------|-------------|
| 1 | Kocsis, Szepesvari | UCT: Bandit Based MC Planning (ECML) | 2006 | UCT formula; convergence proof has known gaps |
| 2 | Browne et al. | MCTS Survey (IEEE TCIAIG) | 2012 | Comprehensive MCTS method taxonomy |
| 3 | Cowling et al. | ISMCTS (IEEE TCIAIG) | 2012 | Information Set MCTS for imperfect info |
| 4 | Zinkevich et al. | CFR (NIPS) | 2007 | Regret minimization converges to Nash at O(1/sqrt(T)) |
| 5 | Lanctot et al. | Monte Carlo CFR (NIPS) | 2009 | MCCFR: outcome, external, chance sampling |
| 6 | Neller, Lanctot | Intro to CFR (Gettysburg) | 2013 | Accessible CFR tutorial |
| 7 | Kelly, Churchill | MCTS in Cribbage (NECEC) | 2017 | **SO-ISMCTS > Det-UCT; plateau at 10K iter** |
| 8 | Martin | Optimal Cribbage Hands (HMC) | 2015 | Expected value calculations |
| 9 | Moulton | Cribbage as RL Problem | 2022 | **Discard: 40.7M states; Pegging: 10^6-10^8** |
| 10 | Schuh | Genetic Alg Pegging (Yale) | -- | 21-param heuristic; 28.5% WR vs greedy |
| 11 | orbitals.com | Distributed Cribbage Computation | -- | Discard probability matrix |
| 12 | Oehm | Optimal Hand (Gradient Descending) | 2022 | **Hand+crib beats hand-only by 0.47 pts** |
| 13 | Schell | Discard Tables (ACC) | -- | Crib EV lookup (91 entries) |
| 14 | Rasmussen, Hessel, Bowman | Skill in Cribbage / Independent validations (ACC) | -- | Cross-validate Schell within 2.4% |
| 15 | Colvert | Theory of 26 (Cribbage Pro) | 2012 | Board position mode switching |
| 16 | Korb et al. | Bayesian Poker (UAI) | 1999 | Bayesian opponent modeling |
| 17 | Billings et al. | Bayes' Bluff (UAI) | 2005 | Opponent modeling in poker |
| 18 | Spronck et al. | Adaptive Game AI | 2006 | Dynamic scripting for opponents |
| 19-20 | GTO Wizard | EV / AI Explained | -- | EVL severity calibration |
| 21 | Whitehouse et al. | ISMCTS in Dou Di Zhu (IEEE CIG) | 2011 | Determinization vs ISMCTS |
| 22-24 | Various | GitHub implementations | -- | ismcsolver, MCTS-Cribbage, cpsc474 |
