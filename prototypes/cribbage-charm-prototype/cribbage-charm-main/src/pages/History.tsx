import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import skunkLogo from '@/assets/skunk-logo.png';

const sections = [
  {
    title: "A poet, a cheat, and a deck of marked cards",
    icon: "🎭",
    content: [
      `Sir John Suckling (1609–1641) was a Cavalier poet, courtier to Charles I, and one of England's most notorious gamblers. Knighted around 1630, he earned a reputation as "the greatest gallant of his time, and the greatest gamester both for bowling and cards."`,
      `Suckling took an existing card game called **Noddy** and added one transformative innovation: the **crib** — a discard pile scored as an extra hand by the dealer. This simple addition created the strategic tension that defines cribbage to this day. The game took its name from the crib itself, originally spelled "cribbidge."`,
      `Then came the con. Suckling distributed elegantly designed but secretly **marked decks** to aristocratic households across England, toured the country "teaching" his new game — and won an estimated **£20,000** (roughly $7 million today). His life ended badly — fled to France after a failed plot, reportedly died by his own hand. His game, however, thrived for four centuries and counting.`,
    ],
  },
  {
    title: "How to play: the essentials",
    icon: "🃏",
    content: [
      `Two players, one standard deck, a cribbage board. Cards rank King (high) through Ace (low). Face cards count 10; others at face value. First to **121 points** wins — the game ends the instant a peg crosses that threshold.`,
      `**The deal & crib:** Six cards each. Discard two face-down to form the **crib** (dealer's bonus hand). This is the game's most consequential strategic moment.`,
      `**The starter:** Cut the deck, flip the top card. Jack turned? Dealer pegs **2 for his heels**.`,
      `**Pegging:** Alternate playing cards toward a count of 31. Score for fifteens (2 pts), pairs (2 pts), runs (1/card), and hitting exactly 31 (2 pts). Say "Go" when you can't play.`,
      `**The show:** Count hands in strict order — pone first, then dealer's hand, then crib. Each uses four retained cards plus the starter. Score fifteens, pairs, runs, flushes, and **nobs** (Jack matching starter's suit = 1 pt).`,
    ],
  },
  {
    title: "Submarines, pubs, and Dickens",
    icon: "🎖️",
    content: [
      `In April 1943, aboard submarine USS Wahoo in the Yellow Sea, Commander "Mush" Morton dealt Lt. Richard O'Kane a **perfect 29-point hand**. The crew took it as an omen — that night, they sank two Japanese freighters. O'Kane went on to command USS Tang, sinking **30+ enemy ships** and earning the Medal of Honor. His cribbage board is still ceremonially passed to the oldest active fast-attack submarine in the U.S. Pacific Fleet.`,
      `Under the **Gambling Act 2005**, cribbage is the **only card game you can legally play for money in English pubs** without a special license. No other card game has this privilege — a reflection of centuries-deep pub culture.`,
      `Dickens immortalized the game in *The Old Curiosity Shop* (1841), where Richard Swiveller shouts **"Two for his heels!"** upon noticing a missed Jack. Baseball manager Terry Francona played daily during the 2007 and 2016 World Series.`,
    ],
  },
  {
    title: '"Muggins!" and other words only we understand',
    icon: "📖",
    content: [
      `**His heels** — Jack turned as starter (2 pts for dealer). Named for when face cards showed full-body figures with visible heels. **His nobs** — Jack in hand matching starter's suit (1 pt). Memory trick: "One for his nobs (one head), two for his heels (two heels)."`,
      `**Muggins** — the glorious rule letting you steal points your opponent miscounted. **Stinkhole** — hole 120, one agonizing point from victory. **Pone** — the non-dealer, who counts first.`,
      `The **19 hand** is cribbage's oldest inside joke. No five-card combination can score exactly 19 — so "I've got nineteen" means zero. A **skunk** (loser below 91) doubles stakes. A **double skunk** (below 61) quadruples them. The British term **"lurch"** gave us "left in the lurch."`,
      `Cribbage gifted English: **"level pegging"** (tied), **"streets ahead"** (far in the lead), **"pegged out"** (finished), and **"a turn-up for the books"** (unexpected development).`,
    ],
  },
  {
    title: "What the numbers reveal",
    icon: "🔢",
    content: [
      `Scores of **19, 25, 26, and 27 are mathematically impossible**. Among 12,994,800 possible five-card combinations, the most common scores are 4 points (22%) and 2 points (21.6%). The mean random hand scores ~4.8 points, but strategic discarding pushes actual averages to **~8.1 points**.`,
      `The perfect 29 hand — J-5-5-5 with the matching five as starter — occurs once in **216,580 deals**. Exactly four exist (one per suit). The ACC pays $100 for a verified 29 in tournament play.`,
      `Hold a 5? You're **guaranteed at least 2 points** regardless of starter. Four Aces? The only hand where no starter helps. The most dramatic "gut shot": holding 4-4-6-6 and cutting a 5 for a 20-point swing.`,
    ],
  },
  {
    title: "Two-thirds luck, one-third brilliance",
    icon: "🧠",
    content: [
      `DeLynn Colvert's "Rule of Thirds": you'll win a third of games on cards alone, lose a third regardless, and the remaining third is decided by skill. Top players sustain only **54–55% win rates** — the margin between best and worst is a razor-thin **0.3 points per deal**.`,
      `Three domains separate the pros: **discard strategy** (never give opponents a 5!), **pegging tactics** (lead from pairs to invite pair royals), and **positional play** using Colvert's "Theory of 26" — the dealer averages ~16 pts/deal, the pone ~10.`,
      `Unlike checkers (solved 2007), **cribbage remains computationally unsolved** due to imperfect information. First dealer wins ~56% of the time. A typical game lasts about 9 deals.`,
    ],
  },
  {
    title: "Curiosities & legends",
    icon: "✨",
    content: [
      `The biggest possible single-deal haul: a theoretical **78 points** (29-pt hand + 24-pt crib + max pegging). Nelson, Montana proclaims itself the "Cribbage Capital of the World."`,
      `Iñupiaq artisans in Alaska have carved walrus-ivory cribbage boards since the 1890s — examples reside in the Smithsonian. JFK collected scrimshaw cribbage boards, sparking a revival in the art.`,
      `The ACC awards lifetime titles: Master (2,000 pts), Grand Master (4,000), Life Master (6,000). Sir John Suckling was the first Hall of Fame inductee — a fitting honor for the poet-gambler who shuffled a deck, added a discard pile, and invented one of the most enduring games ever played.`,
    ],
  },
];

function renderMarkdownBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-primary font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function renderMarkdownItalic(text: string) {
  const parts = text.split(/\*(.*?)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i}>{part}</em>
    ) : (
      <span key={i}>{renderMarkdownBold(part)}</span>
    )
  );
}

export default function History() {
  const navigate = useNavigate();

  return (
    <div className="felt-surface min-h-screen">
      <div className="relative z-10 max-w-2xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="shrink-0">
            ← Back
          </Button>
          <div className="flex-1" />
          <img src={skunkLogo} alt="Cribbage logo" className="w-12 h-12 object-contain" />
        </div>

        <header className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl text-primary leading-tight mb-3">
            The 400-Year-Old Card Game That Conquered Navies, Pubs & Probability
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Invented by a cheating poet. Played on submarines. The only card game you can legally gamble on in English pubs. This is the story of cribbage.
          </p>
        </header>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, idx) => (
            <section key={idx} className="bg-card/60 border border-border rounded-xl p-5 sm:p-6 backdrop-blur-sm">
              <h2 className="font-display text-xl text-primary flex items-center gap-2 mb-4">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.content.map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-foreground/85 text-sm leading-relaxed">
                    {renderMarkdownItalic(paragraph)}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer quote */}
        <footer className="text-center mt-10 mb-6">
          <blockquote className="font-display text-lg text-primary/80 italic max-w-md mx-auto">
            "And somewhere tonight, a player will cut the deck, turn up a Jack, and announce with quiet satisfaction: Two for his heels."
          </blockquote>
          <div className="mt-6">
            <Button onClick={() => navigate('/')} size="lg" className="font-display px-10">
              Deal Me In 🃏
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
