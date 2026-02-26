import { cn } from '@/lib/utils';

export interface ScorePanelProps {
  playerScore: number;
  opponentScore: number;
  /** 0 = human is dealer, 1 = opponent is dealer */
  dealerIndex: number;
  /** Index of the human player (almost always 0) */
  humanPlayerIndex?: number;
  className?: string;
}

const SKUNK_SCORE = 91;
const DBL_SKUNK_SCORE = 61;

function skunkLabel(score: number): string | null {
  if (score < DBL_SKUNK_SCORE) return 'double-skunked';
  if (score < SKUNK_SCORE) return 'skunked';
  return null;
}

export function ScorePanel({
  playerScore,
  opponentScore,
  dealerIndex,
  humanPlayerIndex = 0,
  className,
}: ScorePanelProps) {
  const humanIsDealer = dealerIndex === humanPlayerIndex;
  const oppIsDealer = !humanIsDealer;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2.5',
        'bg-walnut/90 backdrop-blur-sm border-b border-white/10',
        'relative z-20',
        className,
      )}
      aria-label="Score display"
      data-testid="score-panel"
    >
      {/* Left: human player */}
      <div className="flex items-center gap-2" aria-label={`Your score: ${playerScore}`}>
        {/* Gold peg dot */}
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #ffe898, #d4a843)',
            boxShadow: '0 0 6px rgba(212,168,67,0.5)',
          }}
        />
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-cream font-bold tabular-nums text-sm"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            You:&nbsp;{playerScore}
          </span>
          {humanIsDealer && (
            <span
              className="text-[9px] px-1 py-0.5 rounded bg-gold/20 text-gold/90 font-medium leading-none"
              title="Dealer"
            >
              D
            </span>
          )}
        </div>
        {skunkLabel(playerScore) && (
          <span className="text-[9px] text-amber-400/70 hidden sm:inline">
            ({skunkLabel(playerScore)})
          </span>
        )}
      </div>

      {/* Right: opponent */}
      <div className="flex items-center gap-2" aria-label={`Opponent score: ${opponentScore}`}>
        {oppIsDealer && (
          <span
            className="text-[9px] px-1 py-0.5 rounded bg-skunk-green/20 text-skunk-green/90 font-medium leading-none"
            title="Dealer"
          >
            D
          </span>
        )}
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-cream font-bold tabular-nums text-sm"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Opp:&nbsp;{opponentScore}
          </span>
        </div>
        {/* Skunk-green opponent peg dot */}
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #90ff60, #39FF14)',
            boxShadow: '0 0 6px rgba(57,255,20,0.4)',
          }}
        />
      </div>
    </div>
  );
}
