import { cn } from '@/lib/utils';

export interface GameOverProps {
  /** Index of the winner (0 = human, 1 = AI) */
  winnerIndex: number;
  /** Human player's final score */
  playerScore: number;
  /** Opponent's final score */
  opponentScore: number;
  onPlayAgain: () => void;
  className?: string;
}

const SKUNK_SCORE = 91;
const DBL_SKUNK_SCORE = 61;

function getSkunkTier(loserScore: number): 'double' | 'single' | null {
  if (loserScore < DBL_SKUNK_SCORE) return 'double';
  if (loserScore < SKUNK_SCORE) return 'single';
  return null;
}

const WIN_MESSAGES = [
  "Dealt. Pegged. Conquered.",
  "Muggins is weeping into their cards.",
  "Sir John Suckling would be proud.",
  "Count 'em and weep — you won!",
];

const LOSE_MESSAGES = [
  "The crib didn't love you today.",
  "Dealt a rough hand and played it badly.",
  "Even a 29 wouldn't have saved you.",
  "Pegged right off the board.",
];

function randomPick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function GameOver({
  winnerIndex,
  playerScore,
  opponentScore,
  onPlayAgain,
  className,
}: GameOverProps) {
  const humanWon = winnerIndex === 0;
  const loserScore = humanWon ? opponentScore : playerScore;
  const skunk = getSkunkTier(loserScore);

  const emoji = humanWon ? '🏆' : '🦨';
  const headline = humanWon ? 'You Win!' : "SKUNK'D!";
  const subMessage = humanWon ? randomPick(WIN_MESSAGES) : randomPick(LOSE_MESSAGES);

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center z-50',
        'bg-skunk-darker/80 backdrop-blur-sm',
        className,
      )}
      data-testid="game-over"
      aria-label="Game over screen"
    >
      <div className="flex flex-col items-center gap-5 px-8 py-10 text-center max-w-sm">
        {/* Big emoji */}
        <div className="text-7xl leading-none" aria-hidden="true">{emoji}</div>

        {/* Headline */}
        <h1
          className={cn(
            'text-5xl font-black tracking-tight',
            humanWon ? 'text-gold' : 'text-skunk-green',
          )}
          style={{ fontFamily: "'Playfair Display', serif" }}
          aria-label={humanWon ? 'You win' : 'You lost'}
        >
          {headline}
        </h1>

        {/* Score */}
        <p
          className="text-2xl font-bold tabular-nums text-cream/80"
          aria-label={`Final score: you ${playerScore}, opponent ${opponentScore}`}
        >
          <span style={{ color: '#d4a843' }}>{playerScore}</span>
          <span className="text-cream/30 mx-2">–</span>
          <span style={{ color: '#39FF14' }}>{opponentScore}</span>
        </p>

        {/* Skunk tier banner */}
        {skunk === 'double' && (
          <div
            className="px-4 py-2 rounded-full bg-skunk-green/15 border border-skunk-green/30"
            data-testid="double-skunk-banner"
          >
            <p className="text-skunk-green font-bold text-sm">
              🦨🦨 Double Skunk! Left in the lurch!
            </p>
            <p className="text-cream/40 text-[10px] mt-0.5">
              Below 61 — double stakes since 1674.
            </p>
          </div>
        )}
        {skunk === 'single' && (
          <div
            className="px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/25"
            data-testid="skunk-banner"
          >
            <p className="text-amber-400 font-bold text-sm">
              🦨 Skunked! Below 91.
            </p>
            <p className="text-cream/40 text-[10px] mt-0.5">
              Double stakes in any pub worth its peat.
            </p>
          </div>
        )}

        {/* Flavour text */}
        <p className="text-cream/50 text-sm italic leading-relaxed">{subMessage}</p>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full mt-1">
          <button
            className={cn(
              'w-full rounded-xl py-3.5 px-6 font-bold text-base',
              'transition-all duration-150 active:scale-[0.97]',
              'bg-gold text-skunk-dark shadow-lg shadow-gold/20 hover:bg-gold-bright',
            )}
            onClick={onPlayAgain}
            data-testid="play-again-btn"
          >
            Play Again
          </button>
          <p className="text-cream/25 text-[10px]">
            First to 121 wins. Get skunked below 91.
          </p>
        </div>
      </div>
    </div>
  );
}
