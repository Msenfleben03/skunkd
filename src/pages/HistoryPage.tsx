import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type SectionId = 'origin' | 'evolution' | 'rules' | 'variations' | 'culture' | 'lingo' | 'stats' | 'skill' | 'fun';

interface Section {
  id: SectionId;
  title: string;
  content: ReactNode;
}

const sections: Section[] = [
  {
    id: 'origin',
    title: 'Origin & Invention',
    content: (
      <>
        <p>
          Sir John Suckling (1609–1641) was a Cavalier poet, courtier to Charles I, soldier, and one of
          England&apos;s most notorious gamblers. Knighted around 1630, he earned a reputation as the greatest
          gambler of his era.
        </p>
        <p>
          Suckling took an existing game called <strong>Noddy</strong> — documented as early as 1589 — and added
          one transformative innovation: the <strong>crib</strong>, a discard pile scored as an extra hand by the
          dealer. This simple addition created the strategic tension between keeping strong cards and feeding (or
          starving) the crib that defines the game to this day.
        </p>
        <p>
          According to Aubrey&apos;s <em>Brief Lives</em>, Suckling then distributed secretly marked decks to
          aristocratic households across England, toured the country &ldquo;teaching&rdquo; his new game — and
          won an estimated <strong>&pound;20,000</strong> (roughly $7 million today).
        </p>
      </>
    ),
  },
  {
    id: 'evolution',
    title: 'Evolution & The Board',
    content: (
      <>
        <p>
          The earliest published rules appear in Cotgrave (1662), Willughby (1672), and Charles Cotton&apos;s{' '}
          <em>The Compleat Gamester</em> (1674). The original form dealt five cards per player, played to 61
          points. In the nineteenth century, the <strong>six-card deal became standard</strong>, doubling the
          target to 121.
        </p>
        <p>
          The cribbage board itself predates the game by centuries — pegging boards scored various pub games long
          before Suckling adapted one. The classic board features four rows of 30 holes divided into sections
          called <strong>&ldquo;streets,&rdquo;</strong> with two pegs per player advanced in leapfrog fashion.
        </p>
      </>
    ),
  },
  {
    id: 'rules',
    title: 'Official Rules (6-Card)',
    content: (
      <>
        <p>
          A standard game uses a 52-card deck, a cribbage board, and two players. Face cards count 10; Ace
          always equals 1. First to <strong>121 points</strong> wins — the game ends the instant a peg crosses
          that threshold.
        </p>
        <h4>The Deal &amp; Crib</h4>
        <p>
          Six cards each, discard two to the crib (dealer&apos;s bonus hand). The pone cuts, dealer turns the
          starter — a Jack scores <strong>2 for his heels</strong>.
        </p>
        <h4>Pegging</h4>
        <p>
          Alternate playing cards toward 31. Score 2 for hitting 15 or 31, 2 for pairs, 6 for three-of-a-kind,
          and 1 per card in runs. &ldquo;Go&rdquo; when you can&apos;t play; last card scores 1 (or 2 if
          exactly 31).
        </p>
        <h4>The Show</h4>
        <p>
          Pone counts first, then dealer&apos;s hand, then crib. Each hand + starter = 5 cards. Score fifteens
          (2 each), pairs (2), runs (1 per card), flush (4–5), and nobs (1 for Jack matching starter suit).
          Crib flushes must be all 5 cards.
        </p>
      </>
    ),
  },
  {
    id: 'variations',
    title: 'Game Variations',
    content: (
      <>
        <div className="space-y-3">
          <div>
            <h4>Five-Card Cribbage</h4>
            <p>The original form. Three-card hands, game to 61. Pone pegs 3 at the start for balance.</p>
          </div>
          <div>
            <h4>Seven-Card Cribbage</h4>
            <p>Five-card hands and crib. Game to 181. Theoretical max hand: 46 points (4-4-5-5-6-6).</p>
          </div>
          <div>
            <h4>Three-Player</h4>
            <p>Five cards dealt, one to crib, each discards one. Independent scoring to 121.</p>
          </div>
          <div>
            <h4>Captain&apos;s Cribbage</h4>
            <p>Two vs. one &ldquo;Captain.&rdquo; Captain needs only 61; team needs 121.</p>
          </div>
          <div>
            <h4>Lowball (Losers)</h4>
            <p>First to 121 <em>loses</em>. Strategy flips completely.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'culture',
    title: 'Cultural Significance',
    content: (
      <>
        <h4>The USS Wahoo &amp; the O&apos;Kane Board</h4>
        <p>
          In April 1943, Commander &ldquo;Mush&rdquo; Morton dealt Lt. Richard O&apos;Kane a{' '}
          <strong>perfect 29-point hand</strong> aboard submarine USS Wahoo. The crew took it as an omen — that
          night they sank two Japanese freighters. O&apos;Kane went on to command USS Tang, sinking over{' '}
          <strong>30 enemy ships</strong> and earning the Medal of Honor. His cribbage board is ceremonially
          passed to the oldest active fast-attack submarine in the U.S. Pacific Fleet.
        </p>
        <h4>English Pub Law</h4>
        <p>
          Under the Gambling Act 2005, cribbage and dominoes are specifically exempt from gambling restrictions
          in licensed premises — making cribbage effectively{' '}
          <strong>the only card game you can legally play for money in English pubs</strong>.
        </p>
        <h4>In Popular Culture</h4>
        <p>
          Dickens immortalized it in <em>The Old Curiosity Shop</em>. Baseball manager Terry Francona played
          daily during the 2007 and 2016 World Series. The American Cribbage Congress oversees 237+ clubs and
          hundreds of annual tournaments.
        </p>
      </>
    ),
  },
  {
    id: 'lingo',
    title: 'Sayings & Lingo',
    content: (
      <>
        <div className="space-y-2">
          {[
            ['His Heels (Nibs)', 'Jack turned as starter = 2 pts to dealer.'],
            ['His Nobs (Knobs)', 'Jack in hand matching starter suit = 1 pt.'],
            ['Pone', 'The non-dealer. Leads first card and counts hand first.'],
            ['Muggins', 'Claim points your opponent overlooked (tournament-standard).'],
            ['Stinkhole', 'Hole 120 — one agonizing point from victory.'],
            ['19 Hand', "Cribbage's oldest joke. No hand scores exactly 19, so it means zero."],
            ['Skunk', 'Winning by 31+ points. Loser below hole 91.'],
            ['Double Skunk', 'Loser below 61. Quadruple stakes.'],
            ['Lurch', 'British equivalent of skunk — origin of "left in the lurch."'],
            ['Salting the Crib', 'Discarding strong cards to the dealer\'s crib.'],
            ['Gut Shot', 'A starter that fills the middle of a sequence for massive points.'],
            ['Hauling Lumber', 'Cheating by over-pegging.'],
          ].map(([term, def]) => (
            <p key={term}>
              <strong className="text-gold/80">{term}:</strong>{' '}
              <span className="text-cream/60">{def}</span>
            </p>
          ))}
        </div>
        <p className="mt-3 text-cream/40 text-[10px] italic">
          Cribbage also gave English &ldquo;level pegging&rdquo; (tied), &ldquo;streets ahead,&rdquo;
          &ldquo;pegged out&rdquo; (died), and &ldquo;a turn-up for the books.&rdquo;
        </p>
      </>
    ),
  },
  {
    id: 'stats',
    title: 'Scoring Probabilities',
    content: (
      <>
        <p>
          Among <strong>12,994,800</strong> possible five-card combinations, the distribution is sharply
          right-skewed. Most common: 4 pts (21.98%) and 2 pts (21.65%). Mean: ~4.77 pts.
        </p>
        <p>
          Scores of <strong>19, 25, 26, and 27 are mathematically impossible</strong> — no five-card
          combination can produce them.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-cream/60">
            <thead>
              <tr className="text-gold/60 border-b border-white/10">
                <th className="text-left py-1 pr-3">Score</th>
                <th className="text-right py-1 pr-3">Probability</th>
                <th className="text-right py-1">Hands</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[
                [0, '7.76%', '1,009,008'],
                [2, '21.65%', '2,813,796'],
                [4, '21.98%', '2,855,676'],
                [6, '13.85%', '1,800,268'],
                [8, '8.75%', '1,137,236'],
                [12, '2.44%', '317,340'],
                [16, '0.45%', '58,248'],
                [24, '0.03%', '3,680'],
                [28, '0.0006%', '76'],
                [29, '0.00003%', '4'],
              ].map(([score, prob, hands]) => (
                <tr key={String(score)} className="border-b border-white/5">
                  <td className="py-1 pr-3">{score}</td>
                  <td className="text-right py-1 pr-3">{prob}</td>
                  <td className="text-right py-1">{hands}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          After strategic discarding, the average hand score rises to ~8.1 pts. The average crib scores ~4.5
          pts. The <strong>perfect 29 hand</strong> occurs roughly once in 216,580 deals.
        </p>
      </>
    ),
  },
  {
    id: 'skill',
    title: 'Luck vs. Skill',
    content: (
      <>
        <p>
          DeLynn Colvert&apos;s <strong>&ldquo;Rule of Thirds&rdquo;</strong>: you&apos;ll win a third on cards
          alone, lose a third regardless, and the remaining third is decided by skill.
        </p>
        <p>
          Top players sustain win rates of only <strong>54–55%</strong>. The margin between best and worst is
          ~0.3 points per deal — yet this compounds to ~1.7% extra win rate per game.
        </p>
        <h4>Three Domains of Skill</h4>
        <ul className="list-disc list-inside space-y-1 text-cream/60">
          <li><strong>Discard strategy</strong> — most consequential. Never give a 5 to opponent&apos;s crib.</li>
          <li><strong>Pegging strategy</strong> — read opponent&apos;s holdings, avoid leading 5s and 10s.</li>
          <li>
            <strong>Positional play</strong> — Colvert&apos;s &ldquo;Theory of 26&rdquo;: dealer averages ~16
            pts/deal, pone ~10.
          </li>
        </ul>
        <p className="mt-2">
          Unlike checkers (solved 2007), <strong>cribbage remains computationally unsolved</strong> due to
          imperfect information.
        </p>
      </>
    ),
  },
  {
    id: 'fun',
    title: 'Fun Facts',
    content: (
      <>
        <ul className="list-disc list-inside space-y-2 text-cream/60">
          <li>
            Biggest possible dealer haul: <strong>78 points</strong> in a single deal (29 hand + 24 crib +
            pegging).
          </li>
          <li>
            Holding a 5 <strong>guarantees at least 2 points</strong> regardless of starter — no other card does
            this.
          </li>
          <li>
            Most dramatic starter improvement: <strong>20 points</strong> when holding 4-4-6-6 and cutting a 5.
          </li>
          <li>
            Nelson, Montana proclaims itself the <strong>&ldquo;Cribbage Capital of the World.&rdquo;</strong>
          </li>
          <li>
            Over <strong>10 million Americans</strong> play cribbage regularly.
          </li>
          <li>
            Sir John Suckling was the first inductee into the ACC Hall of Fame.
          </li>
          <li>
            In 2012, Jeanne Jelke became the first woman to win cribbage&apos;s most prestigious tournament.
          </li>
        </ul>
      </>
    ),
  },
];

export function HistoryPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<SectionId>>(new Set());

  const toggle = (id: SectionId) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 bg-felt-gradient">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-cream/50 hover:text-cream/80 transition-colors text-sm"
          data-testid="history-back-btn"
        >
          &larr; Back
        </button>
        <h1
          className="text-lg font-black text-gold font-display"
        >
          History
        </h1>
        <span className="w-12" /> {/* spacer */}
      </div>

      {/* Subtitle */}
      <p
        className="text-cream/40 text-xs italic text-center max-w-xs mb-6 font-display"
      >
        400 years of cards, cons, and submarines.
      </p>

      {/* Accordion sections */}
      <div className="w-full max-w-sm space-y-2">
        {sections.map(section => {
          const isOpen = expanded.has(section.id);
          return (
            <div
              key={section.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
            >
              <button
                onClick={() => toggle(section.id)}
                className={cn(
                  'w-full flex items-center justify-between px-5 py-4 text-left',
                  'hover:bg-white/[0.02] transition-colors',
                )}
                data-testid={`history-section-${section.id}`}
              >
                <span className="text-sm font-semibold text-cream/80">{section.title}</span>
                <span
                  className={cn(
                    'text-cream/30 text-xs transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                >
                  &#9660;
                </span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-cream/70 text-xs leading-relaxed space-y-2 [&_h4]:text-gold/70 [&_h4]:text-[10px] [&_h4]:uppercase [&_h4]:tracking-widest [&_h4]:mt-3 [&_h4]:mb-1 [&_strong]:text-cream/90">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-cream/15 text-[9px] mt-8 text-center max-w-xs">
        Source: Cribbage Research Report — compiled from Aubrey, Cotton, Colvert, ACC, IEEE, and Cribbage Pro data.
      </p>
    </div>
  );
}
