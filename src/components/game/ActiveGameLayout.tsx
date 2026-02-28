import type { Card, GameState, Phase, PeggingState, ScoreBreakdown } from '@/engine/types';
import { cn } from '@/lib/utils';
import { ScorePanel } from './ScorePanel';
import { CribbageBoard } from './CribbageBoard';
import { PlayArea } from './PlayArea';
import { PlayerHand } from './PlayerHand';
import { ActionBar } from './ActionBar';
import { ShowScoring } from './ShowScoring';
import { ScoreExplanation } from './ScoreExplanation';
import { PeggingScore } from './PeggingScore';
import { GameOver } from './GameOver';
import { ChatPanel } from '@/components/chat/ChatPanel';

/** Phases where the human's hand cards are shown */
const HAND_VISIBLE_PHASES = new Set<Phase>([
  'DISCARD_TO_CRIB',
  'CUT_STARTER',
  'PEGGING',
]);

/** Phases where ShowScoring overlays the play area */
const SHOW_PHASES = new Set<Phase>([
  'SHOW_NONDEALER',
  'SHOW_DEALER',
  'SHOW_CRIB',
]);

interface ShowScoringData {
  label: string;
  cards: readonly Card[];
  starter: Card;
  scoring: ScoreBreakdown;
}

export interface ActiveGameLayoutProps {
  gameState: GameState;
  selectedCardIds: Set<string>;
  showScoring: ShowScoringData | null;
  lastPeggingScore: { total: number; pairs: number; runs: number; fifteen: number; thirtyone: number } | null;
  humanPlayerIndex: number;
  // Handlers
  onDiscard: () => void;
  onPlay: () => void;
  onGo: () => void;
  onAdvance: () => void;
  onNextHand: () => void;
  onNewGame: () => void;
  onReturnToMenu: () => void;
  toggleCardSelect: (cardId: string) => void;
  onViewStats: () => void;
  // Online
  gameMode: 'local' | 'online';
  opponentPresence: string;
  activeOnlineGameId: string | null;
  authUser: { id: string; displayName: string } | null;
  chatOpen: boolean;
  setChatOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  // Layout
  className?: string;
}

export function ActiveGameLayout({
  gameState,
  selectedCardIds,
  showScoring,
  lastPeggingScore,
  humanPlayerIndex,
  onDiscard,
  onPlay,
  onGo,
  onAdvance,
  onNextHand,
  onNewGame,
  onReturnToMenu,
  toggleCardSelect,
  onViewStats,
  gameMode,
  opponentPresence,
  activeOnlineGameId,
  authUser,
  chatOpen,
  setChatOpen,
  className,
}: ActiveGameLayoutProps) {
  const { phase, players, pegging, starter, crib, dealerIndex, handNumber, winner } = gameState;

  const opponentPlayerIndex = (humanPlayerIndex + 1) % 2;
  const player = players[humanPlayerIndex];
  const opponent = players[opponentPlayerIndex];

  // Cards the human plays from during pegging
  const humanPeggingCards = pegging.playerCards[humanPlayerIndex] ?? [];
  const handToDisplay = phase === 'PEGGING' ? humanPeggingCards : player.hand;
  const showHand = HAND_VISIBLE_PHASES.has(phase) && handToDisplay.length > 0;

  const handInteractive =
    phase === 'DISCARD_TO_CRIB' ||
    (phase === 'PEGGING' && pegging.currentPlayerIndex === humanPlayerIndex);

  return (
    <div
      className={cn(
        'h-screen flex flex-col overflow-hidden relative',
        className,
      )}
      style={{ background: '#0D0D1A' }}
      data-testid="game-screen"
    >
      {/* Score header */}
      <ScorePanel
        playerScore={player.score}
        opponentScore={opponent.score}
        dealerIndex={dealerIndex}
        humanPlayerIndex={humanPlayerIndex}
      />

      {/* Main area — expands to fill available space */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Show scoring OR play area */}
        {SHOW_PHASES.has(phase) && showScoring ? (
          <div className="flex-1 flex flex-col items-center overflow-y-auto py-4 px-4 gap-3">
            <ShowScoring
              label={showScoring.label}
              cards={showScoring.cards}
              starter={showScoring.starter}
              scoring={showScoring.scoring}
            />
            <ScoreExplanation
              key={showScoring.label}
              label={showScoring.label}
              cards={showScoring.cards}
              starter={showScoring.starter}
              scoring={showScoring.scoring}
              className="max-w-sm w-full"
            />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto">
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
              cards={handToDisplay as Card[]}
              selectedIds={selectedCardIds}
              onCardClick={
                handInteractive
                  ? (card: Card) => toggleCardSelect(card.id)
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
        onDiscard={onDiscard}
        onPlay={onPlay}
        onGo={onGo}
        onAdvance={onAdvance}
        onNextHand={onNextHand}
        onNewGame={onNewGame}
      />

      {/* Always-visible horizontal cribbage board strip */}
      <CribbageBoard
        player={{ front: player.pegFront, back: player.pegBack }}
        opponent={{ front: opponent.pegFront, back: opponent.pegBack }}
        horizontal
        className="flex-shrink-0 border-t border-gold/15 py-1"
      />

      {/* Chat toggle button — online games only */}
      {activeOnlineGameId && authUser && (
        <button
          onClick={() => setChatOpen((o: boolean) => !o)}
          className="absolute bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-skunk-dark border border-white/15 flex items-center justify-center text-cream/50 hover:text-cream/80 hover:border-white/25 transition-all shadow-lg"
          aria-label="Toggle chat"
          data-testid="chat-toggle-btn"
        >
          💬
        </button>
      )}

      {/* Chat panel — online games only */}
      {activeOnlineGameId && authUser && (
        <ChatPanel
          gameId={activeOnlineGameId}
          userId={authUser.id}
          displayName={authUser.displayName}
          gameContext={`Hand ${handNumber}, scores: ${player.score}–${opponent.score}`}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Disconnect overlay — online games only */}
      {gameMode === 'online' && opponentPresence === 'offline' && phase !== 'GAME_OVER' && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gold font-black text-lg font-display">
              Opponent Disconnected
            </p>
            <p className="text-cream/40 text-sm mt-2">Waiting for them to reconnect...</p>
            <button
              onClick={() => { onReturnToMenu(); }}
              className="mt-6 px-6 py-2 text-sm border border-white/10 text-cream/50 rounded-lg hover:text-cream/80 transition-colors"
            >
              Leave Game
            </button>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'GAME_OVER' && winner !== null && (
        <GameOver
          winnerIndex={winner}
          playerScore={player.score}
          opponentScore={opponent.score}
          onPlayAgain={onNewGame}
          onMainMenu={onReturnToMenu}
          onViewStats={onViewStats}
          handsPlayed={handNumber}
        />
      )}
    </div>
  );
}
