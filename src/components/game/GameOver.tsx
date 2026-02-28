import { cn } from '@/lib/utils';
import { MatchAnalysis } from './MatchAnalysis';

export interface GameOverProps {
  /** Index of the winner (0 = human, 1 = AI) */
  winnerIndex: number;
  /** Human player's final score */
  playerScore: number;
  /** Opponent's final score */
  opponentScore: number;
  onPlayAgain: () => void;
  /** Return to start screen / main menu */
  onMainMenu?: () => void;
  /** Navigate to post-game stats summary */
  onViewStats?: () => void;
  /** Number of hands played in this game */
  handsPlayed?: number;
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
  onMainMenu,
  onViewStats,
  handsPlayed,
  className,
}: GameOverProps) {
  const humanWon = winnerIndex === 0;
  const loserScore = humanWon ? opponentScore : playerScore;
  const skunk = getSkunkTier(loserScore);

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
        {/* Skunk easter egg — only shown on skunk/double-skunk */}
        {skunk ? (
          <img
            src="/skunkd-deuces.png"
            alt="You got SKUNK'D!"
            className="w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-2xl animate-bounce"
            style={{ animationDuration: '2s' }}
          />
        ) : (
          <img
            src={humanWon ? '/mascot-action-02.png' : '/mascot-action-01.png'}
            alt=""
            className="w-32 h-32 md:w-40 md:h-40 object-contain drop-shadow-xl"
          />
        )}

        {/* Headline */}
        <h1
          className={cn(
            'text-5xl font-black tracking-tight font-display',
            humanWon ? 'text-gold' : 'text-skunk-green',
          )}
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

        {/* Match analysis */}
        <MatchAnalysis
          playerScore={playerScore}
          opponentScore={opponentScore}
          humanWon={humanWon}
          handsPlayed={handsPlayed}
          skunkType={skunk}
          className="w-full"
        />

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
          {onViewStats && (
            <button
              className={cn(
                'w-full rounded-xl py-3 px-6 font-semibold text-sm',
                'border border-gold/30 text-gold/80',
                'hover:border-gold/50 hover:text-gold transition-all duration-150',
              )}
              onClick={onViewStats}
              data-testid="view-stats-btn"
            >
              View Game Stats
            </button>
          )}
          {onMainMenu && (
            <button
              className={cn(
                'w-full rounded-xl py-3 px-6 font-semibold text-sm',
                'border border-white/10 text-cream/55',
                'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
              )}
              onClick={onMainMenu}
              data-testid="main-menu-btn"
            >
              Main Menu
            </button>
          )}
          <p className="text-cream/25 text-[10px]">
            First to 121 wins. Get skunked below 91.
          </p>
        </div>
      </div>
    </div>
  );
}
