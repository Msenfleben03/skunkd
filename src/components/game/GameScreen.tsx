import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { cn } from '@/lib/utils';
import { ScorePanel } from './ScorePanel';
import { CribbageBoard } from './CribbageBoard';
import { PlayArea } from './PlayArea';
import { PlayerHand } from './PlayerHand';
import { ActionBar } from './ActionBar';
import { ShowScoring } from './ShowScoring';
import { PeggingScore } from './PeggingScore';
import { HandSummary } from './HandSummary';
import { GameOver } from './GameOver';

const HUMAN_PLAYER = 0;
const AI_PLAYER = 1;

/** Phases where the human's hand cards are shown */
const HAND_VISIBLE_PHASES = new Set([
  'DISCARD_TO_CRIB',
  'CUT_STARTER',
  'PEGGING',
]);

/** Phases where ShowScoring overlays the play area */
const SHOW_PHASES = new Set([
  'SHOW_NONDEALER',
  'SHOW_DEALER',
  'SHOW_CRIB',
]);

export function GameScreen({ className }: { className?: string }) {
  const {
    gameState,
    selectedCardIds,
    showScoring,
    lastPeggingScore,
    humanPlayerIndex,
    newGame,
    toggleCardSelect,
    confirmDiscard,
    playSelectedCard,
    declareGo,
    advanceShow,
    nextHand,
  } = useGame();

  const [showBoard, setShowBoard] = useState(false);

  const { phase, players, pegging, starter, crib, dealerIndex, handNumber, handStats, winner } =
    gameState;

  const player = players[HUMAN_PLAYER];
  const opponent = players[AI_PLAYER];

  // Cards the human plays from during pegging
  const humanPeggingCards = pegging.playerCards[HUMAN_PLAYER] ?? [];
  // Which hand to show (pegging uses playerCards, otherwise hand)
  const handToDisplay = phase === 'PEGGING' ? humanPeggingCards : player.hand;
  const showHand = HAND_VISIBLE_PHASES.has(phase) && handToDisplay.length > 0;

  // Disable card interaction when it's not the human's turn or during auto-phases
  const handInteractive =
    phase === 'DISCARD_TO_CRIB' ||
    (phase === 'PEGGING' && pegging.currentPlayerIndex === HUMAN_PLAYER);

  // ── Start screen ─────────────────────────────────────────────────────────

  if (phase === 'GAME_START') {
    return (
      <div
        className={cn(
          'h-screen flex flex-col items-center justify-center',
          'relative overflow-hidden',
          className,
        )}
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, #1e4d35 0%, #0a0a16 60%, #060610 100%)',
        }}
      >
        {/* Felt noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.045,
            mixBlendMode: 'overlay',
          }}
        />
        {/* Radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        <div className="relative z-10 text-center px-8 max-w-xs w-full">
          {/* SKUNK'D logo with idle float animation */}
          <div className="animate-float-in mb-3">
            <img
              src="/skunkd-logo.png"
              alt="SKUNK'D — skunk holding playing cards"
              className="skunk-idle w-56 h-56 object-contain mx-auto"
            />
          </div>

          {/* Tagline */}
          <p
            className="animate-float-in text-cream/55 italic text-sm mb-1"
            style={{ fontFamily: "'Playfair Display', serif", animationDelay: '0.1s' }}
          >
            The cribbage game that bites back.
          </p>
          <p
            className="animate-float-in text-cream/25 text-[10px] mb-7 leading-relaxed"
            style={{ animationDelay: '0.18s' }}
          >
            Since 1630 — invented by a cheating poet,
            <br />
            perfected on submarines.
          </p>

          {/* Buttons */}
          <div
            className="animate-float-in flex flex-col gap-3"
            style={{ animationDelay: '0.3s' }}
          >
            {/* Primary CTA */}
            <button
              className={cn(
                'w-full rounded-xl py-4 px-8 font-black text-xl',
                'bg-gold text-skunk-dark shadow-xl shadow-gold/30',
                'hover:bg-gold-bright hover:shadow-gold/50 hover:scale-[1.02]',
                'transition-all duration-150 active:scale-[0.97]',
              )}
              onClick={newGame}
              data-testid="deal-me-in-btn"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Deal Me In
            </button>

            {/* How to Play */}
            <button
              className={cn(
                'w-full rounded-xl py-3 px-8 font-semibold text-sm',
                'border border-white/10 text-cream/55',
                'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
              )}
              onClick={() => {
                /* TODO: Phase 3.3 — how to play modal */
              }}
            >
              How to Play
            </button>

            {/* Online — coming soon */}
            <button
              className={cn(
                'w-full rounded-xl py-2.5 px-8 font-medium text-xs',
                'border border-white/[0.06] text-cream/25',
                'cursor-not-allowed select-none',
              )}
              disabled
              aria-label="Online play — coming soon"
            >
              Play Online — Coming Soon
            </button>
          </div>

          <p
            className="animate-float-in text-cream/15 text-[9px] mt-5"
            style={{ animationDelay: '0.48s' }}
          >
            Get skunked below 91 and you'll never live it down.
          </p>
        </div>
      </div>
    );
  }

  // ── Hand complete — show summary scorecard ────────────────────────────────

  if (phase === 'HAND_COMPLETE') {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a3d2b 0%, #0D0D1A 70%)' }}
      >
        <HandSummary
          handNumber={handNumber}
          playerStats={handStats[HUMAN_PLAYER]}
          opponentStats={handStats[AI_PLAYER]}
          playerTotalScore={player.score}
          opponentTotalScore={opponent.score}
          onNextHand={nextHand}
        />
      </div>
    );
  }

  // ── Active game layout ────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'h-screen flex flex-col overflow-hidden relative',
        className,
      )}
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a3d2b 0%, #0D0D1A 65%)' }}
      data-testid="game-screen"
    >
      {/* Score header */}
      <ScorePanel
        playerScore={player.score}
        opponentScore={opponent.score}
        dealerIndex={dealerIndex}
        humanPlayerIndex={humanPlayerIndex}
        onToggleBoard={() => setShowBoard(b => !b)}
        showBoard={showBoard}
      />

      {/* Collapsible cribbage board */}
      {showBoard && (
        <div
          className="overflow-y-auto border-b border-white/10"
          style={{ maxHeight: '55vh', backgroundColor: 'rgba(13,13,26,0.6)' }}
        >
          <CribbageBoard
            player={{ front: player.pegFront, back: player.pegBack }}
            opponent={{ front: opponent.pegFront, back: opponent.pegBack }}
            className="py-2"
          />
        </div>
      )}

      {/* Main area — expands to fill available space */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Show scoring OR play area */}
        {SHOW_PHASES.has(phase) && showScoring ? (
          <div className="flex-1 flex items-center justify-center overflow-y-auto py-4">
            <ShowScoring
              label={showScoring.label}
              cards={showScoring.cards}
              starter={showScoring.starter}
              scoring={showScoring.scoring}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <PlayArea
              phase={phase}
              starter={starter}
              pegging={pegging}
              crib={crib}
              humanPlayerIndex={humanPlayerIndex}
            />
          </div>
        )}

        {/* Pegging score toast — floats above hand */}
        {lastPeggingScore && (
          <div className="flex justify-center pb-1 px-4">
            <PeggingScore score={lastPeggingScore} />
          </div>
        )}

        {/* Human player's hand */}
        {showHand && (
          <div className="flex justify-center pb-2 px-4 flex-shrink-0">
            <PlayerHand
              cards={handToDisplay}
              selectedIds={selectedCardIds}
              onCardClick={
                handInteractive
                  ? card => toggleCardSelect(card.id)
                  : undefined
              }
              maxSelectable={phase === 'DISCARD_TO_CRIB' ? 2 : 1}
              dimUnselectable={phase === 'DISCARD_TO_CRIB' && selectedCardIds.size >= 2}
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      <ActionBar
        phase={phase}
        selectedCardIds={[...selectedCardIds]}
        pegging={pegging}
        humanPlayerIndex={humanPlayerIndex}
        onDiscard={confirmDiscard}
        onPlay={playSelectedCard}
        onGo={declareGo}
        onAdvance={advanceShow}
        onNextHand={nextHand}
        onNewGame={newGame}
      />

      {/* Game over overlay */}
      {phase === 'GAME_OVER' && winner !== null && (
        <GameOver
          winnerIndex={winner}
          playerScore={player.score}
          opponentScore={opponent.score}
          onPlayAgain={newGame}
        />
      )}
    </div>
  );
}
