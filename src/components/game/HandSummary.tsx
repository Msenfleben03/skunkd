import { type HandStats } from '@/engine/types';
import { cn } from '@/lib/utils';

export interface HandSummaryProps {
  /** 1-based hand number */
  handNumber: number;
  /** Human player's stats for this hand */
  playerStats: HandStats;
  /** Opponent's stats for this hand */
  opponentStats: HandStats;
  /** Human player's cumulative score after this hand */
  playerTotalScore: number;
  /** Opponent's cumulative score after this hand */
  opponentTotalScore: number;
  onNextHand: () => void;
  /** If provided, shows a "New Game" button alongside Next Hand */
  onNewGame?: () => void;
  className?: string;
}

// ── Proportion bar ────────────────────────────────────────────────────────────

function ProportionBar({
  left,
  right,
  leftColor,
  rightColor,
}: {
  left: number;
  right: number;
  leftColor: string;
  rightColor: string;
}) {
  const total = left + right;
  if (total === 0) {
    return (
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full w-1/2 bg-white/10" />
      </div>
    );
  }
  const leftPct = Math.round((left / total) * 100);
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden flex"
      style={{ background: rightColor + '33' }}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${leftPct}%`, background: leftColor }}
      />
    </div>
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({
  label,
  playerVal,
  opponentVal,
}: {
  label: string;
  playerVal: number;
  opponentVal: number;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline text-sm">
        <span
          className="font-bold tabular-nums"
          style={{ color: '#d4a843', fontFamily: "'Playfair Display', serif" }}
          aria-label={`Your ${label}: ${playerVal}`}
        >
          {playerVal}
        </span>
        <span className="text-[10px] text-cream/40 uppercase tracking-widest">{label}</span>
        <span
          className="font-bold tabular-nums"
          style={{ color: '#39FF14', fontFamily: "'Playfair Display', serif" }}
          aria-label={`Opponent ${label}: ${opponentVal}`}
        >
          {opponentVal}
        </span>
      </div>
      <ProportionBar
        left={playerVal}
        right={opponentVal}
        leftColor="#d4a843"
        rightColor="#39FF14"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HandSummary({
  handNumber,
  playerStats,
  opponentStats,
  playerTotalScore,
  opponentTotalScore,
  onNextHand,
  onNewGame,
  className,
}: HandSummaryProps) {
  const playerHandTotal = playerStats.pegging + playerStats.hand + playerStats.crib;
  const opponentHandTotal = opponentStats.pegging + opponentStats.hand + opponentStats.crib;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-5 p-5 w-full max-w-sm mx-auto',
        className,
      )}
      data-testid="hand-summary"
      aria-label={`Hand ${handNumber} summary`}
    >
      {/* Header */}
      <div className="text-center space-y-0.5">
        <p className="text-[10px] text-cream/40 uppercase tracking-[0.2em]">Round</p>
        <h2
          className="text-4xl font-black text-gold"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {handNumber}
        </h2>
      </div>

      {/* Column headers */}
      <div className="w-full flex justify-between text-[10px] uppercase tracking-widest px-1">
        <span style={{ color: '#d4a843' }}>You</span>
        <span className="text-cream/30">Stats</span>
        <span style={{ color: '#39FF14' }}>Opp</span>
      </div>

      {/* Score card */}
      <div
        className="w-full rounded-2xl border border-white/10 overflow-hidden"
        style={{ backgroundColor: 'rgba(13,13,26,0.85)' }}
      >
        {/* Total score — large, prominent */}
        <div
          className="flex justify-between items-center px-4 py-4 border-b border-white/10"
          aria-label="Total scores"
        >
          <span
            className="text-3xl font-black tabular-nums"
            style={{ color: '#d4a843', fontFamily: "'Playfair Display', serif" }}
            aria-label={`Your total score: ${playerTotalScore}`}
          >
            {playerTotalScore}
          </span>
          <span className="text-[10px] text-cream/30 uppercase tracking-widest">Total</span>
          <span
            className="text-3xl font-black tabular-nums"
            style={{ color: '#39FF14', fontFamily: "'Playfair Display', serif" }}
            aria-label={`Opponent total score: ${opponentTotalScore}`}
          >
            {opponentTotalScore}
          </span>
        </div>

        {/* This hand breakdown */}
        <div className="px-4 py-3 space-y-3">
          <StatRow label="This Hand" playerVal={playerHandTotal} opponentVal={opponentHandTotal} />
          <StatRow label="Pegging" playerVal={playerStats.pegging} opponentVal={opponentStats.pegging} />
          <StatRow label="Hand" playerVal={playerStats.hand} opponentVal={opponentStats.hand} />
          <StatRow label="Crib" playerVal={playerStats.crib} opponentVal={opponentStats.crib} />
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full flex flex-col gap-2">
        <button
          className={cn(
            'w-full rounded-xl py-3.5 px-6 font-bold text-base',
            'transition-all duration-150 active:scale-[0.97]',
            'bg-gold text-skunk-dark shadow-lg shadow-gold/20 hover:bg-gold-bright',
          )}
          onClick={onNextHand}
          data-testid="next-hand-btn"
        >
          Next Hand
        </button>

        {onNewGame && (
          <button
            className={cn(
              'w-full rounded-xl py-3 px-6 font-bold text-sm',
              'transition-all duration-150 active:scale-[0.97]',
              'bg-transparent text-cream/50 border border-white/10',
              'hover:bg-white/5 hover:text-cream/70',
            )}
            onClick={onNewGame}
            data-testid="new-game-btn"
          >
            New Game
          </button>
        )}
      </div>
    </div>
  );
}
