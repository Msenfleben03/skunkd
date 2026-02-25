# Cribbage: the 400-year-old card game that conquered navies, pubs, and probability

Cribbage is a two-player card game invented around 1630 by the English poet and gambler Sir John Suckling, derived from an earlier game called Noddy. Nearly four centuries later, it remains one of the most enduring card games in the English-speaking world — played by over **10 million Americans**, embedded in U.S. Navy submarine tradition, and holding the unique legal distinction of being the only card game permitted for stakes in English pubs without a special license. What makes cribbage remarkable is its blend of simplicity and depth: its rules fit on a single page, yet its strategic and mathematical complexity has resisted full computational solution. The game's signature cribbage board, its distinctive jargon ("muggins," "stinkhole," "his nobs"), and its perfect 29-point hand — achievable roughly once in every 216,580 deals — have made it a fixture of card-game culture worldwide.

---

## A poet, a cheat, and a deck of marked cards

Sir John Suckling (1609–1641/42) was a Cavalier poet, courtier to Charles I, soldier, and one of England's most notorious gamblers. The son of a Secretary of State, Suckling inherited a fortune at eighteen, was knighted around 1630, and earned a reputation as "the greatest gallant of his time, and the greatest gamester both for bowling and cards," according to the biographer John Aubrey. His literary legacy includes the tragedy *Aglaura* (1637) and the immortal lyric "Why so pale and wan, fond lover?"

His gaming legacy proved even more durable. Suckling took an existing English card game called **Noddy** — documented as early as 1589 in Thomas Nashe's writings — and added one transformative innovation: the **crib**, a discard pile scored as an extra hand by the dealer. This simple addition created a strategic tension between keeping strong cards and feeding (or starving) the crib that defines the game to this day. Noddy had been a three-card game with no discards, scored to 31 on a pegging board. Suckling expanded it, and the new game took its name from the crib itself, originally spelled "cribbidge."

According to Aubrey's *Brief Lives*, Suckling then executed a scheme of breathtaking audacity. He distributed elegantly designed but secretly marked decks of cards to aristocratic households across England, then toured the country "teaching" the nobility his new game — and winning an estimated **£20,000** (roughly $7 million today). Whether this tale is fully accurate or embellished, it cemented the association between Suckling and cribbage. Suckling's life ended badly: after a failed plot to rescue the Earl of Strafford from the Tower of London in 1641, he fled to France and reportedly died by his own hand, unable to face poverty. His game, however, thrived.

The earliest published rules appear in Cotgrave (1662), Willughby (1672), and Charles Cotton's *The Compleat Gamester* (1674). The original form dealt five cards to each player, with the game played to 61 points (once around the board). Sometime in the nineteenth century, the **six-card deal became standard**, doubling the target score to 121. The five-card game still survives in parts of Britain, particularly in club and partnership play.

The cribbage board itself predates the game by centuries — pegging boards were used to score various pub games and card games long before Suckling adapted one for his invention. The classic board features four rows of 30 holes divided into sections called "streets," with two pegs per player advanced in leapfrog fashion. Modern variants include continuous-track designs, boards shaped as the number 29, and prized works of art carved from walrus ivory by Iñupiaq artisans in Alaska.

---

## How to play: the complete rules of standard six-card cribbage

A standard game requires a 52-card deck (no jokers), a cribbage board with pegs, and two players. Cards rank King (high) through Ace (low). Face cards count 10 for point-totaling purposes; all other cards count at face value. Ace always equals 1. The objective is to be the first player to reach **121 points**, and the game ends the instant either player's peg crosses that threshold — even mid-count.

**The deal and the crib.** Players cut the deck; lowest card deals first (Ace is lowest). The dealer shuffles, the non-dealer (called the **pone**) cuts, and the dealer distributes six cards to each player, one at a time, starting with the pone. Each player then examines their hand and discards exactly two cards face down. These four discards form the **crib**, which belongs to the dealer and will be scored as a bonus hand later. This discard decision is the game's most consequential strategic moment: the pone tries to avoid giving the dealer useful cards, while the dealer may sacrifice hand strength to enrich the crib.

**The starter card.** After discarding, the pone cuts the remaining deck. The dealer turns over the top card of the lower portion and places it face up — this is the **starter** (or cut card). If the starter is a Jack, the dealer immediately pegs **2 points**, called **"two for his heels."** The starter is not used during the play phase but is counted as a fifth card in every hand and the crib during the show.

**The play (pegging).** The pone leads by placing one card face up and announcing its pip value. The dealer responds with a card, announcing the running cumulative total. Players alternate laying cards, building toward a maximum count of **31**. When a player cannot play without exceeding 31, they say **"Go."** The opponent must then continue playing all possible cards without exceeding 31. The last player to lay a card scores **1 point** for "last card" — or **2 points** if the count reaches exactly 31. The count then resets to zero, and a new series begins with the player who did not play last. This continues until all eight cards are exhausted.

During the play, several combinations score immediately:

| Combination | Points | Description |
|---|---|---|
| Fifteen | 2 | Running total hits exactly 15 |
| Thirty-one | 2 | Running total hits exactly 31 |
| Pair | 2 | Card matches the rank of the previous card |
| Pair royal (three of a kind) | 6 | Third consecutive card of the same rank |
| Double pair royal (four of a kind) | 12 | Fourth consecutive card of the same rank |
| Run of 3+ | 1 per card | Consecutive ranks played in any order within the current series |
| Go / Last card | 1 | Last card played when count is under 31 |

Cards must be consecutive within the same series (a reset to zero breaks all combinations). Multiple scoring events can coincide — hitting 15 with a pair earns 4 points.

**The show (counting hands).** After the play, hands are counted in a strict order that matters enormously: **pone first**, then dealer's hand, then dealer's crib. Each hand consists of the four retained cards plus the starter, yielding five cards total. The same card may participate in multiple combinations.

| Combination | Points | Description |
|---|---|---|
| Fifteen | 2 per combination | Every distinct subset of cards totaling exactly 15 |
| Pair | 2 | Two cards of the same rank |
| Pair royal | 6 | Three of a kind (three distinct pairs) |
| Double pair royal | 12 | Four of a kind (six distinct pairs) |
| Run of 3+ | 1 per card | Consecutive ranks in any suits |
| Flush (hand) | 4 | All four hand cards share a suit (starter need not match) |
| Flush (with starter) | 5 | All four hand cards plus the starter share a suit |
| His nobs | 1 | Jack in hand matching the starter card's suit |

Flushes in the crib follow a stricter rule: all four crib cards **and** the starter must share a suit for 5 points; a four-card crib flush does not score. No flushes are scored during the play phase.

**Common combined patterns** include the double run (a run of three with a pair, worth 8 points plus fifteens), the triple run (a run of three with three of a kind, worth 15 points plus fifteens), and the double-double run (a run of three with two pairs, worth 16 points plus fifteens).

**Muggins, skunks, and other rules.** The **muggins** rule is an optional (but tournament-standard) provision: if a player miscounts or overlooks points, the opponent may call "Muggins!" and claim the missed points. A **skunk** occurs when the winner reaches 121 while the loser has not yet passed hole 90 — worth double in match play. A **double skunk** (loser below 61) is worth quadruple, though neither skunks nor double skunks appear in official American Cribbage Congress tournament rules. A **misdeal** awards the pone 2 penalty points and triggers a redeal. A player who falsely calls "Go" while holding a playable card forfeits 2 points.

---

## A game for every table: cribbage variations

Cribbage's core mechanic has spawned dozens of variations across nearly four centuries.

**Five-card cribbage** is the original form, still played in parts of Britain. Each player receives five cards and discards two to the crib, leaving three-card hands scored against the starter. The pone pegs **3 points** at the start to offset the dealer's crib advantage (since the crib is larger than either hand). Play goes to 31 only once with no reset, and the game target is **61 points** — once around the board. An American variant deals five cards plus two directly to the crib, with each player discarding only one.

**Seven-card cribbage** appeals to experienced players seeking higher-scoring, more complex games. Seven cards are dealt to each player plus one directly to the crib; each player discards two. Hands and the crib contain five cards, the game target rises to **181 points** (three times around the board), and the theoretical maximum hand reaches **46 points** with the combination 4-4-5-5-6-6.

**Three-player cribbage** deals five cards to each player with one card going directly to the crib; each player discards one. Play rotates clockwise, each player scores independently to 121, and a three-track board is used. **Captain's Cribbage** — widely considered the best three-player variant — pits two players as a team against a solo "Captain." The Captain needs only 61 points to win while the team must reach 121, and each player rotates through the Captain role across three games.

**Four-player (partnership) cribbage** seats partners across from each other. Five cards are dealt to each player, each discards one to the crib, and partners share a score. Play rotates clockwise, and the game target is 121 per partnership.

**Lowball (Losers) cribbage** inverts the entire game: the first player to 121 *loses*. Strategy flips completely — you try to force your opponent to score while avoiding points yourself. Five cards become treasures, and the game typically requires roughly twice as many hands as standard cribbage.

Other notable variants include **Auction Cribbage** (players bid for the crib), **Crash Cribbage** (shared figure-8 track where pegs can collide), **Toss Fives** (all 5s must be discarded to the crib), and **Solitaire Cribbage** (various single-player formats).

---

## Submarines, pubs, and Dickens: cribbage's cultural reach

Few card games are so deeply woven into specific institutions. Cribbage's portability — requiring only a deck and a board, playable by just two people — made it the natural companion of **sailors, fishermen, and soldiers** for centuries. Peg-and-hole scoring was practical at sea: holes could be carved into a sailor's bunk, and pegs wouldn't slide on rolling decks.

The most celebrated cribbage story in military history involves the submarine USS Wahoo (SS-283). In April 1943, on a dangerous patrol into the Yellow Sea, Commander Dudley "Mush" Morton and Executive Officer Lieutenant Richard "Dick" O'Kane sat down to a game to calm the crew. Morton dealt O'Kane a **perfect 29-point hand** — the four fives and the Jack. The crew calculated the odds at roughly 1 in 216,000 and took it as an omen. That night, the Wahoo sank two Japanese freighters. Three days later, another game produced a 28-point hand; more sinkings followed. O'Kane had the five winning cards signed by fellow officers and framed.

O'Kane went on to command USS Tang, which sank more than **30 enemy ships totaling over 118,000 tons** — the most productive submarine of World War II. He received the Medal of Honor from President Truman in 1946 and eventually reached the rank of Rear Admiral. After his death in 1994, his wife donated his personal cribbage board to the Submarine Force, and it has been ceremonially passed to the **oldest active fast-attack submarine in the U.S. Pacific Fleet** ever since. As of early 2025, the board resides aboard **USS Scranton (SSN-756)**, with crews actively playing on it. Each transfer is honored with a formal ceremony akin to a change of command.

In British culture, cribbage holds extraordinary legal privilege. Under the **Gambling Act 2005** (and its predecessor, the Gaming Act 1968), cribbage and dominoes are specifically exempt from normal gambling restrictions in licensed premises. Pubs may host cribbage for stakes without any special permit — a privilege extended to no other card game. This makes cribbage effectively **the only card game you can legally play for money in English pubs** without additional authorization, a reflection of its centuries-deep roots in pub culture.

Charles Dickens immortalized the game in *The Old Curiosity Shop* (1840–41), where the character Richard Swiveller teaches a young servant girl (whom he names "the Marchioness") to play cribbage. In a famous scene, the ailing Swiveller awakens to find the Marchioness playing cribbage alone and shouts **"Two for his heels!"** upon noticing she missed scoring a turned Jack. The passage helped fix the game's rules in cultural memory.

Baseball manager **Terry Francona** brought cribbage into the modern sports spotlight, playing daily during the 2007 and 2016 World Series with players including Dustin Pedroia and Tim Wakefield. The **American Cribbage Congress**, founded in 1980, now oversees **237+ grassroots clubs** and sanctions hundreds of tournaments annually. Its flagship event, the Joseph P. Wergin/ACC Open in Reno, Nevada, draws over 1,000 players each February and ranks as the world's largest cribbage tournament.

---

## "Muggins!" and other words only cribbage players understand

Cribbage has developed one of the richest specialized vocabularies of any card game, and several of its terms have entered everyday English.

**His heels** (also **nibs** or **knibs**) refers to the Jack turned as the starter card, scoring 2 points for the dealer immediately. The name dates from when face cards depicted full-body figures — the Jack's heels were visible at the bottom. When cards were redesigned with symmetrical, half-body images, the heels vanished but the phrase endured. **His nobs** (or **knobs**) is the related but distinct term for a Jack held in hand that matches the starter's suit, worth 1 point during the show. The memory trick: "One for his nobs — a Jack has one head (nob); two for his heels — he has two heels."

**Pone** designates the non-dealer, who leads the first card and counts their hand first — a significant positional advantage in close games. **Muggins** is the optional rule allowing a player to claim points their opponent overlooked; calling "Muggins!" and seizing those points is one of the game's great satisfactions. **Go** is the declaration made when a player cannot play without exceeding 31, while **peg out** means reaching 121 to win the game. **Streets** are the four 30-hole sections of the board (First through Fourth Street), used as positional landmarks. **Stinkhole** refers to hole 120 — one agonizing point from victory. Some house rules make it a "dead hole" where you cannot win by pegging but must count out from your hand.

The **19 hand** is cribbage's oldest inside joke. Since no combination of five cards can produce exactly 19 points — it is the lowest impossible score — players announce "I've got nineteen!" to mean they scored zero. A **skunk** (winning by 31+ points, with the loser below hole 91) doubles the stakes; a **double skunk** (loser below 61) quadruples them. In Britain, the equivalent term is **lurch**, giving English the expression **"left in the lurch"** — originally meaning devastatingly beaten at cards or a board game.

Other colorful terms include **salting the crib** (discarding strong cards to the dealer's crib), **gut shot** (a starter card that fills the middle of a sequence for massive points), **hauling lumber** (cheating by over-pegging), and **spilikins** (an archaic term for the scoring pegs). Cribbage also contributed **"level pegging"** (tied), **"streets ahead"** (far in the lead), **"pegged out"** (died or finished), and **"a turn-up for the books"** (an unexpected development) to the broader English language.

---

## What the numbers reveal: scoring probabilities and distributions

The mathematics of cribbage are surprisingly rich. A five-card combination (four in hand plus the starter) can score anywhere from 0 to 29 points, but not every score in that range is achievable. Scores of **19, 25, 26, and 27 are mathematically impossible** — no five-card combination from a standard deck can produce them.

Among the **12,994,800** possible five-card combinations (from random deals, before strategic discarding), the distribution is sharply right-skewed. The most common scores are 4 points (**21.98%** of all combinations) and 2 points (21.65%), followed by 6 points (13.85%). The overall mean for a random five-card hand is approximately **4.77 points**, but this figure rises dramatically in actual play because players strategically retain their best four of six cards.

| Score | Probability | Hands |
|---|---|---|
| 0 | 7.76% | 1,009,008 |
| 2 | 21.65% | 2,813,796 |
| 4 | 21.98% | 2,855,676 |
| 6 | 13.85% | 1,800,268 |
| 8 | 8.75% | 1,137,236 |
| 10 | 2.99% | 388,740 |
| 12 | 2.44% | 317,340 |
| 14 | 0.69% | 90,100 |
| 16 | 0.45% | 58,248 |
| 20 | 0.06% | 8,068 |
| 24 | 0.03% | 3,680 |
| 28 | 0.0006% | 76 |
| 29 | 0.00003% | 4 |

Even-numbered scores dominate because the primary scoring mechanisms — fifteens (2 points) and pairs (2 points) — produce even increments. Odd scores typically require nobs (1 point) or odd-length runs.

After strategic discarding in actual play, hand scores shift upward significantly. The **average hand score is approximately 8.1 points** for the pone and 7.95 for the dealer (who may sacrifice hand strength to enrich the crib). The most common hand score in actual play is **8 points**. The **average crib scores about 4.5 points** — lower than hand averages because opponents deliberately "balk" the crib by discarding uncooperative cards.

The **perfect 29 hand** — three fives and the Jack of the missing suit in hand, with the fourth five as the starter — scores 16 points from eight distinct fifteens, 12 from the double pair royal of fives, and 1 for nobs. Exactly **four possible 29 hands** exist (one per suit). The precise probability is **1 in 216,580** in standard two-player play, assuming the player recognizes and keeps the J-5-5-5 combination. The American Cribbage Congress pays $100 for a verified 29 hand in sanctioned tournament play and maintains a "Club 29" honor roll. The second-highest hand, 28 points (four fives with any ten-value card other than the matching Jack), occurs roughly once in every **15,028 deals**.

---

## Two-thirds luck, one-third brilliance: the skill debate

The question of how much cribbage depends on skill versus luck has generated considerable analysis. The traditional estimate — widely cited by experts and tournament players — holds that cribbage is roughly **two-thirds luck and one-third skill**. DeLynn Colvert, a four-time national champion and the game's foremost strategist, frames it as the "Rule of Thirds": you will win about a third of your games on cards alone, lose about a third regardless of play, and the remaining third is decided by who plays better.

Empirical data supports this model. Analysis of millions of hands from Cribbage Pro's database shows that top-tier (A-level) players sustain win rates of only about **54–55%** against the general population, while the weakest players hover around 48%. The margin between the best and worst players in average points per hand is startlingly thin — roughly **0.3 points per deal**. Yet this tiny edge compounds over a 9-deal game: scoring just 1 extra point per game adds approximately **1.7% to your win rate**.

Compared to other card games, cribbage occupies a middle ground. Bridge, with its partnership bidding and play, is estimated at 85–90% skill. Long-run poker approaches 70–80% skill. Cribbage's 30–40% skill component exceeds pure-chance games but falls well short of strategy-intensive games. The random cut of the starter card — which can swing a hand by as much as **20 points** (the famous 4-4-6-6 cutting a 5 for 24) — injects irreducible variance that even perfect play cannot overcome.

Three strategic domains separate strong players from average ones. **Discard strategy** is the most consequential: choosing which two of six cards to keep involves evaluating both hand value and the expected impact on the crib. Giving an opponent a 5 is almost always disastrous (it pairs with sixteen 10-value cards for easy fifteens), while combinations like 5-5 or 5-J are the strongest self-crib discards. **Pegging strategy** involves reading the opponent's likely holdings, leading from pairs to invite pair royals, avoiding 5s and 10-cards as leads (they invite easy 15-2 responses), and deciding when to play offensively versus defensively based on board position. **Positional play**, formalized in Colvert's influential **"Theory of 26,"** holds that the dealer averages approximately 16 points per deal (hand plus crib plus pegging) while the pone averages about 10, for a combined 26. Knowing where you "should" be on the board after each deal informs whether to play aggressively (maximizing your own score) or defensively (minimizing your opponent's).

The first dealer holds a structural advantage, winning roughly **55–56% of games** between equal players. A typical game lasts about 9 deals. The pone's compensating advantage — counting their hand before the dealer — becomes decisive in close endgames near hole 121.

Academic research on cribbage includes a 2023 IEEE paper applying Monte Carlo Counterfactual Regret Minimization to create a near-optimal cribbage agent, a University of Minnesota study comparing reinforcement learning and minimax approaches, and a Harvey Mudd College thesis on optimal expected hand values. Unlike checkers (solved in 2007), **cribbage remains computationally unsolved** due to its imperfect-information nature — you never know what your opponent holds or what the starter will be.

---

## The hand everyone dreams of, and other curiosities

The **biggest possible single-deal haul** for the dealer is a theoretical 53 non-pegging points: a 29-point hand (J-5-5-5 with the matching 5 as starter) combined with a 24-point crib (such as 4-4-6-6 using the same starter 5). Adding maximum pegging, the dealer could score as many as 78 points in a single deal. The highest combined non-pegging score for both players in a single round is 77 points.

If you hold a 5 in your hand, you are **guaranteed at least 2 points** regardless of the starter — no other card offers this guarantee. Conversely, four Aces is the only hand where no possible starter card adds any points. The most dramatic "gut shot" improvement from the starter is 20 points, achieved when holding 4-4-6-6 and cutting a 5.

Nelson, Montana, has erected a sign proclaiming itself the **"Cribbage Capital of the World."** In Alaska, Iñupiaq artisans have carved walrus-ivory cribbage boards since the 1890s, blending thousand-year-old indigenous engraving traditions with scrimshaw techniques introduced by whalers — examples reside in the Smithsonian's National Museum of the American Indian and the New Bedford Whaling Museum. President John F. Kennedy collected scrimshaw cribbage boards, helping spark a revival in scrimshaw art in the 1960s.

The ACC awards lifetime titles based on accumulated Master Rating Points: **Master** (2,000 points), **Grand Master** (4,000), **Life Master** (6,000), and **Life Master One Star** (10,000+). In 2012, **Jeanne Jelke** became the first woman to win the Joseph P. Wergin/ACC Open, cribbage's most prestigious tournament. Sir John Suckling himself was the first inductee into the ACC Hall of Fame — a fitting honor for the poet-gambler who, nearly four centuries ago, shuffled a deck, added a discard pile, and invented one of the most enduring games ever played.

---

## Conclusion

Cribbage endures because it strikes a rare balance. It is simple enough to teach a child basic arithmetic yet complex enough to resist computational solution. Its two-thirds luck factor keeps beginners competitive and veterans humble, while the one-third skill factor — compressed into discard choices, pegging tactics, and positional awareness — rewards thousands of hours of study. The game has survived the fall of the Cavalier cause, the expansion of the British Empire, two World Wars, and the digital revolution, adapting its deal from five cards to six while keeping its scoring system virtually unchanged since the 1630s. Its vocabulary has seeped into everyday English. Its board has traveled from pub tables to submarine wardrooms to Iñupiaq carving benches. And somewhere tonight, a player will cut the deck, turn up a Jack, and announce with quiet satisfaction: "Two for his heels."