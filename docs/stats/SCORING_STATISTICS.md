# Cribbage Scoring Statistics — A Common-Sense Guide

> **Data Source:** Exhaustive enumeration of every possible hand in cribbage — all **12,994,800** combinations of 4 cards from a 52-card deck paired with each of the 48 remaining starters. Not a simulation. Not a sample. A complete census.
>
> **Validated Against:** [rubl.com](https://www.rubl.com/rules/cribbage-hand-number.html) exhaustive reference data (exact match on all 26 score values), cross-referenced with [OEIS A143133](https://oeis.org/A143133) and [Wolfram MathWorld](https://mathworld.wolfram.com/Cribbage.html).

---

## Key Validated Statistics

### The Average Hand: 4.77 Points

The average cribbage hand scores **4.77 points**. That's less than 5. If you've been expecting 6-8 points per hand, you've been overvaluing your hands — or you're a better-than-average player at selecting your discards.

**What this means at the table:** Over a full game (~8-10 hands), you'd expect roughly **38-48 points from hand scoring alone** (before pegging). Since you need 121 to win, hand scoring accounts for about a third of your journey. Pegging and crib scoring fill the rest.

---

### The Big Three: Scores 2, 4, and 6

| Score | Hands | Percentage | Analogy |
|-------|------:|----------:|---------|
| **2** | 2,813,796 | 21.65% | About 1 in every 5 hands |
| **4** | 2,855,676 | 21.98% | About 1 in every 5 hands |
| **6** | 1,800,268 | 13.85% | About 1 in every 7 hands |

These three scores account for **57.5% of all hands**. More than half the time, you're looking at 2, 4, or 6 points. The game of cribbage is built on these bread-and-butter hands.

**Why even numbers dominate:** Fifteens score 2 points. Pairs score 2 points. These are the two most common scoring mechanisms, so the math naturally favors even totals. Even-numbered scores appear **~80% of the time** versus ~20% for odd scores.

---

### The "19" Hand: When You Score Nothing

**1,009,008 hands (7.76%)** score exactly zero points. Cribbage players call this a "19 hand" — because 19 is the lowest *impossible* score, making it slang for "nothing."

**How often does this happen?** About 1 in every 13 hands. In a typical game, you'll likely see one or two zero-point hands. It's not rare — it's routine bad luck. Don't beat yourself up over it.

---

### Impossible Scores: The Gaps in the Ladder

Four scores are **mathematically impossible** in cribbage, no matter what cards you hold:

| Impossible Score | Why |
|:---:|-----|
| **19** | No combination of fifteens, pairs, runs, flush, and nobs can produce exactly 19 |
| **25** | Same — the scoring arithmetic skips this value |
| **26** | Same |
| **27** | Same |

There are exactly **26 achievable scores** out of the 0-29 range. Every other value from 0 to 29 can occur.

---

### The Double-Digit Club: Scoring 10+

Only **7.4% of hands** score 10 or more points. If you're dealt a hand worth 10+, you're in the top 7% of all possible hands. Here's what each milestone looks like:

| Threshold | % of Hands | Real-World Feel |
|-----------|-----------|-----------------|
| Score 10+ | 7.4% | Once every ~14 hands |
| Score 12+ | 5.0% | Once every ~20 hands — roughly once per game |
| Score 14+ | 1.4% | Once every ~70 hands — a few times per evening |
| Score 16+ | 0.6% | Once every ~160 hands — a memorable hand |
| Score 20+ | 0.1% | Once every ~1,000 hands — you'll remember it for weeks |
| Score 24+ | 0.03% | Once every ~3,500 hands — tournament-worthy |
| Score 28+ | 0.0006% | Once every ~162,000 hands — a lifetime highlight |
| Score 29 | 0.00003% | Once every ~3,249,000 hands — the holy grail |

---

### The Perfect 29

The mythical **29-point hand** — three 5s and the Jack of the fourth suit in your hand, with the remaining 5 as the starter — can happen in exactly **4 ways** out of 12,994,800 combinations.

**Odds: 1 in 3,248,700.**

To put that in perspective:
- You're **5x more likely** to be dealt a poker royal flush (1 in 649,740)
- If you played 10 hands per day, every day, you'd expect to see a 29 once every **890 years**
- Approximately 3x rarer than being struck by lightning in a given year (1 in 1,222,000)

If you've ever held a perfect 29, you are statistically extraordinary.

---

### Where Do the Points Come From?

The average 4.77-point hand breaks down by scoring category:

| Component | Avg Points | Share | Description |
|-----------|-----------|-------|-------------|
| **Fifteens** | 2.61 | 54.7% | Card combinations summing to 15 (2 pts each) |
| **Pairs** | 1.18 | 24.7% | Matching ranks (2 pts per pair) |
| **Runs** | 0.87 | 18.2% | 3+ consecutive ranks |
| **Nobs** | 0.07 | 1.5% | Jack in hand matching starter suit |
| **Flush** | 0.04 | 0.9% | 4-5 cards of same suit |

**The takeaway:** More than half your points come from fifteens. If you're choosing which cards to keep, prioritize cards that make fifteens — especially 5s (which pair with any face card for 15) and 10-value cards. Runs are the second-best source of "bonus" points beyond the obvious pairs and fifteens.

Flush and nobs are almost negligible in the long run. A 4-card flush only adds 4 points, and it occurs rarely enough that chasing it over solid fifteens is usually a losing strategy.

---

## Complete Distribution

| Score | Count | Percentage | Odds | Common-Sense Context |
|:-----:|------:|-----------:|-----:|----------------------|
| 0 | 1,009,008 | 7.76% | 1 in 13 | "The '19 hand' — happens about once per game" |
| 1 | 99,792 | 0.77% | 1 in 130 | Rare — only nobs can produce exactly 1 |
| 2 | 2,813,796 | 21.65% | 1 in 5 | "A single pair or a single fifteen — bread and butter" |
| 3 | 505,008 | 3.89% | 1 in 26 | A fifteen + nobs, or a run of 3 |
| **4** | **2,855,676** | **21.98%** | **1 in 5** | **Most common score — two fifteens or a pair + fifteen** |
| 5 | 697,508 | 5.37% | 1 in 19 | A run of 3 + a pair, or a flush |
| 6 | 1,800,268 | 13.85% | 1 in 7 | "Solid hand — three fifteens or a pair + run" |
| 7 | 751,324 | 5.78% | 1 in 17 | Often a run of 4 + a fifteen |
| 8 | 1,137,236 | 8.75% | 1 in 11 | "Good hand — you're beating average by 3+ points" |
| 9 | 361,224 | 2.78% | 1 in 36 | Usually a double run or rich fifteens |
| 10 | 388,740 | 2.99% | 1 in 33 | "Double digits — you're doing well" |
| 11 | 51,680 | 0.40% | 1 in 252 | Uncommon — specific card combos needed |
| 12 | 317,340 | 2.44% | 1 in 41 | "Strong hand — multiple scoring categories firing" |
| 13 | 19,656 | 0.15% | 1 in 661 | Starting to get rare |
| 14 | 90,100 | 0.69% | 1 in 144 | Often a double-double run or rich combo |
| 15 | 9,168 | 0.07% | 1 in 1,417 | Very rare for a non-multiple-of-2 score |
| 16 | 58,248 | 0.45% | 1 in 223 | "Great hand — tell your friends about this one" |
| 17 | 11,196 | 0.09% | 1 in 1,160 | Exceptional territory |
| 18 | 2,708 | 0.02% | 1 in 4,798 | "Once-a-tournament hand" |
| *19* | *0* | *—* | *—* | *Impossible* |
| 20 | 8,068 | 0.06% | 1 in 1,610 | "Take a photo — this is special" |
| 21 | 2,496 | 0.02% | 1 in 5,206 | Extremely rare |
| 22 | 444 | 0.003% | 1 in 29,268 | "You'll talk about this for years" |
| 23 | 356 | 0.003% | 1 in 36,502 | Rarer than a hole-in-one |
| 24 | 3,680 | 0.03% | 1 in 3,531 | "The triple-5 special — three 5s + J or face card" |
| *25* | *0* | *—* | *—* | *Impossible* |
| *26* | *0* | *—* | *—* | *Impossible* |
| *27* | *0* | *—* | *—* | *Impossible* |
| 28 | 76 | 0.0006% | 1 in 170,984 | "Lifetime achievement — almost perfect" |
| 29 | 4 | 0.00003% | 1 in 3,248,700 | "The holy grail — 3 fives + Jack, matching-suit 5 starter" |

---

## Interactive Visualizations

All charts are generated from the same validated dataset. Open any HTML file in a browser for interactive exploration (hover for details, zoom, pan).

| Chart | File | What It Shows |
|-------|------|---------------|
| Score Distribution | [score_distribution.html](score_distribution.html) | Bar chart of all 26 achievable scores with annotations |
| Cumulative Probability | [cumulative_probability.html](cumulative_probability.html) | "What are my odds of scoring at least X?" |
| Score Tiers | [score_tiers.html](score_tiers.html) | Donut chart grouping hands by quality tier |
| Rarity Scale | [rarity_scale.html](rarity_scale.html) | Log-scale comparison of rare hands vs real-world events |
| Score Components | [score_components.html](score_components.html) | Where do the average 4.77 points come from? |
| Even vs Odd | [even_odd.html](even_odd.html) | Why even scores dominate (80% vs 20%) |

---

## Technical Notes

### Methodology
- **Enumeration:** C(52,4) = 270,725 four-card hands x 48 remaining starters = 12,994,800 total combinations
- **Scoring model:** Standard cribbage rules — 4-card hand flush = 4 points, 5-card flush = 5 points
- **Runtime:** ~18 seconds for complete enumeration (TypeScript, Vitest)

### OEIS A143133 Discrepancy
The [OEIS sequence A143133](https://oeis.org/A143133) (Eric W. Weisstein, 2008) uses a **different flush model** that excludes 4-card hand flushes. This causes systematic differences in scores 0-18 (any score that could be affected by a 4-point flush). Non-flush-sensitive scores (24, 28, 29) match OEIS exactly.

Our engine implements the standard cribbage rules where 4-card hand flushes are valid (but 4-card crib flushes are not).

### Regenerating Charts
```bash
python docs/stats/generate_charts.py
```
Requires: `plotly` (install with `uv pip install plotly`)

---

*Generated by the SKUNK'D scoring engine. All statistics verified through exhaustive enumeration, not sampling.*
