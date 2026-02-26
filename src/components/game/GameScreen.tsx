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
        style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a3d2b 0%, #0D0D1A 70%)' }}
      >
        {/* Felt noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        <div className="relative z-10 text-center px-8 max-w-sm">
          {/* Logo / mascot placeholder */}
          <div
            className="text-8xl mb-4 leading-none"
            role="img"
            aria-label="Skunk mascot"
          >
            🦨
          </div>

          {/* Title */}
          <h1
            className="text-6xl font-black text-gold mb-1 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            SKUNK'D
          </h1>
          <p
            className="text-cream/50 italic text-base mb-1"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            The cribbage game that bites back.
          </p>
          <p className="text-cream/30 text-xs mb-8 leading-relaxed">
            Since 1630 — invented by a cheating poet,<br />
            perfected on submarines.
          </p>

          {/* VS badge */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-2xl">🧑</span>
            <div className="flex flex-col items-center">
              <span className="text-gold/80 text-sm font-bold">VS</span>
              <span className="text-cream/30 text-[10px]">First to 121</span>
            </div>
            <span className="text-2xl">🦨</span>
          </div>

          {/* CTA */}
          <button
            className={cn(
              'w-full rounded-xl py-4 px-8 font-black text-xl',
              'bg-gold text-skunk-dark shadow-xl shadow-gold/30',
              'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
            )}
            onClick={newGame}
            data-testid="deal-me-in-btn"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Deal Me In
          </button>

          <p className="text-cream/20 text-[10px] mt-4">
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
