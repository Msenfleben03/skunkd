import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import { useAuthContext } from '@/context/AuthContext';
import { createGame } from '@/lib/gameApi';
import { recordGameResult } from '@/lib/statsApi';
import { cn } from '@/lib/utils';
import { ScorePanel } from './ScorePanel';
import { CribbageBoard } from './CribbageBoard';
import { PlayArea } from './PlayArea';
import { PlayerHand } from './PlayerHand';
import { ActionBar } from './ActionBar';
import { ShowScoring } from './ShowScoring';
import { ScoreExplanation } from './ScoreExplanation';
import { PeggingScore } from './PeggingScore';
import { HandSummary } from './HandSummary';
import { HandReview } from './HandReview';
import { GameOver } from './GameOver';
import { ShareLink } from './ShareLink';
import { AuthModal } from '@/components/auth/AuthModal';
import { ChatPanel } from '@/components/chat/ChatPanel';

type OnlineStep = null | 'menu' | 'creating' | 'waiting' | 'join-input';

interface PendingOnlineGame {
  gameId: string;
  inviteCode: string;
}

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

  const auth = useAuthContext();
  const navigate = useNavigate();
  const [showBoard, setShowBoard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeOnlineGameId, setActiveOnlineGameId] = useState<string | null>(null);
  const [onlineStep, setOnlineStep] = useState<OnlineStep>(null);
  const [pendingGame, setPendingGame] = useState<PendingOnlineGame | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Start a vs-AI game: auto-sign-in as guest if needed, then start local game
  const handleStartVsAI = useCallback(async () => {
    if (!auth.user) {
      await auth.signInAsGuest();
    }
    setOnlineStep(null);
    newGame();
  }, [auth, newGame]);

  // Create a new online (vs-human) game
  const handleCreateOnlineGame = useCallback(async () => {
    setOnlineError(null);
    setOnlineStep('creating');
    try {
      if (!auth.user) await auth.signInAsGuest();
      const { game } = await createGame('vs_human');
      setPendingGame({ gameId: game.id, inviteCode: game.invite_code });
      setActiveOnlineGameId(game.id);
      setOnlineStep('waiting');
    } catch (e) {
      setOnlineError(e instanceof Error ? e.message : 'Failed to create game');
      setOnlineStep('menu');
    }
  }, [auth]);

  // Navigate to join page programmatically (or use router)
  const handleJoinWithCode = useCallback(() => {
    if (joinCode.trim().length < 4) return;
    window.location.href = `/join/${joinCode.trim().toUpperCase()}`;
  }, [joinCode]);

  const { phase, players, pegging, starter, crib, dealerIndex, handNumber, handStats, winner } =
    gameState;

  const player = players[HUMAN_PLAYER];
  const opponent = players[AI_PLAYER];

  // Reset save guard when a new game deals
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase === 'DEALING') savedRef.current = false;
  }, [phase]);

  // Save result once when game ends
  useEffect(() => {
    if (phase !== 'GAME_OVER' || winner === null || !auth.user || savedRef.current) return;
    savedRef.current = true;
    recordGameResult({
      userId: auth.user.id,
      won: winner === HUMAN_PLAYER,
      playerScore: player.score,
      opponentScore: opponent.score,
    }).catch(console.error);
  }, [phase, winner, auth.user, player.score, opponent.score]);

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
    const bgStyle = {
      background: 'radial-gradient(ellipse at 50% 35%, #1e4d35 0%, #0a0a16 60%, #060610 100%)',
    };
    const feltOverlay = (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />
    );
    const vignette = (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(0,0,0,0.72) 100%)' }}
      />
    );

    // ── Online game creation / waiting screen ────────────────────────────────
    if (onlineStep === 'menu' || onlineStep === 'creating') {
      return (
        <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', className)} style={bgStyle}>
          {feltOverlay}{vignette}
          <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
            <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-24 h-24 object-contain mx-auto mb-4 opacity-90" />
            <h2 className="text-xl font-black text-gold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Play Online
            </h2>
            {onlineError && <p className="text-red-400 text-xs mb-4">{onlineError}</p>}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCreateOnlineGame}
                disabled={onlineStep === 'creating'}
                className={cn(
                  'w-full py-4 rounded-xl font-black text-lg bg-gold text-skunk-dark',
                  'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
                style={{ fontFamily: "'Playfair Display', serif" }}
                data-testid="create-game-btn"
              >
                {onlineStep === 'creating' ? 'Creating…' : 'Create Game'}
              </button>
              <button
                onClick={() => setOnlineStep('join-input')}
                className="w-full py-3 rounded-xl text-sm font-semibold border border-white/10 text-cream/70 hover:text-cream hover:border-white/20 transition-all"
              >
                Join a Game
              </button>
              <button
                onClick={() => setOnlineStep(null)}
                className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Waiting for opponent after creating game ──────────────────────────────
    if (onlineStep === 'waiting' && pendingGame) {
      return (
        <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', className)} style={bgStyle}>
          {feltOverlay}{vignette}
          <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
            <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-20 h-20 object-contain mx-auto mb-4 opacity-80" />
            <h2 className="text-xl font-black text-gold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Waiting for Opponent
            </h2>
            <p className="text-cream/40 text-xs mb-6">Share this code to challenge a friend:</p>
            <ShareLink inviteCode={pendingGame.inviteCode} className="mb-6" />
            <button
              onClick={() => { setOnlineStep(null); setPendingGame(null); }}
              className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // ── Join by code input ────────────────────────────────────────────────────
    if (onlineStep === 'join-input') {
      return (
        <div className={cn('h-screen flex flex-col items-center justify-center relative overflow-hidden', className)} style={bgStyle}>
          {feltOverlay}{vignette}
          <div className="relative z-10 text-center px-8 max-w-xs w-full animate-float-in">
            <img src="/skunkd-logo.png" alt="SKUNK'D" className="w-24 h-24 object-contain mx-auto mb-4 opacity-90" />
            <h2 className="text-xl font-black text-gold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              Enter Game Code
            </h2>
            <input
              type="text"
              placeholder="ABC123"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className={cn(
                'w-full px-4 py-4 rounded-xl text-center text-2xl font-black tracking-widest mb-4',
                'bg-white/5 border border-white/10 text-gold placeholder-cream/20',
                'focus:outline-none focus:border-gold/60 transition-colors',
              )}
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="join-code-input"
              onKeyDown={e => e.key === 'Enter' && handleJoinWithCode()}
            />
            <div className="flex flex-col gap-3">
              <button
                onClick={handleJoinWithCode}
                disabled={joinCode.trim().length < 4}
                className={cn(
                  'w-full py-4 rounded-xl font-black text-lg bg-gold text-skunk-dark',
                  'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Join Game
              </button>
              <button
                onClick={() => setOnlineStep('menu')}
                className="w-full py-2.5 text-xs text-cream/35 hover:text-cream/60 transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Main start screen ─────────────────────────────────────────────────────
    return (
      <div
        className={cn(
          'h-screen flex flex-col items-center justify-center',
          'relative overflow-hidden',
          className,
        )}
        style={bgStyle}
      >
        {feltOverlay}{vignette}

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
            {/* Primary CTA — vs AI */}
            <button
              className={cn(
                'w-full rounded-xl py-4 px-8 font-black text-xl',
                'bg-gold text-skunk-dark shadow-xl shadow-gold/30',
                'hover:bg-gold-bright hover:shadow-gold/50 hover:scale-[1.02]',
                'transition-all duration-150 active:scale-[0.97]',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
              onClick={handleStartVsAI}
              disabled={auth.loading}
              data-testid="deal-me-in-btn"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {auth.loading ? 'Loading…' : 'Deal Me In'}
            </button>

            {/* Play Online */}
            <button
              className={cn(
                'w-full rounded-xl py-3 px-8 font-semibold text-sm',
                'border border-white/10 text-cream/55',
                'hover:border-white/20 hover:text-cream/80 transition-all duration-150',
              )}
              onClick={() => setOnlineStep('menu')}
              data-testid="play-online-btn"
            >
              Play Online
            </button>

            {/* How to Play */}
            <button
              className={cn(
                'w-full rounded-xl py-3 px-8 font-semibold text-sm',
                'text-cream/40 hover:text-cream/60 transition-colors',
              )}
              onClick={() => {
                /* TODO: Phase 3.3 — how to play modal */
              }}
            >
              How to Play
            </button>

            {/* Stats */}
            <button
              className={cn(
                'w-full rounded-xl py-3 px-8 font-semibold text-sm',
                'text-cream/40 hover:text-cream/60 transition-colors',
              )}
              onClick={() => navigate('/stats')}
              data-testid="stats-btn"
            >
              My Stats
            </button>
          </div>

          {/* Auth status */}
          {auth.user && !auth.user.isGuest && (
            <p
              className="animate-float-in text-cream/30 text-[9px] mt-4"
              style={{ animationDelay: '0.48s' }}
            >
              Signed in as {auth.user.displayName}
            </p>
          )}

          <p
            className="animate-float-in text-cream/15 text-[9px] mt-2"
            style={{ animationDelay: '0.55s' }}
          >
            Get skunked below 91 and you'll never live it down.
          </p>
        </div>

        {/* Auth modal overlay */}
        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} />
        )}
      </div>
    );
  }

  // ── Hand complete — show summary scorecard ────────────────────────────────

  if (phase === 'HAND_COMPLETE') {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center overflow-y-auto py-6 px-4 gap-4"
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
        <HandReview
          handNumber={handNumber}
          playerStats={handStats[HUMAN_PLAYER]}
          opponentStats={handStats[AI_PLAYER]}
          className="max-w-sm w-full"
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
          <div className="flex-1 flex flex-col items-center overflow-y-auto py-4 px-4 gap-3">
            <ShowScoring
              label={showScoring.label}
              cards={showScoring.cards}
              starter={showScoring.starter}
              scoring={showScoring.scoring}
            />
            <ScoreExplanation
              label={showScoring.label}
              cards={showScoring.cards}
              starter={showScoring.starter}
              scoring={showScoring.scoring}
              className="max-w-sm w-full"
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

      {/* Chat toggle button — online games only */}
      {activeOnlineGameId && auth.user && (
        <button
          onClick={() => setChatOpen(o => !o)}
          className="absolute bottom-20 right-4 z-30 w-10 h-10 rounded-full bg-skunk-dark border border-white/15 flex items-center justify-center text-cream/50 hover:text-cream/80 hover:border-white/25 transition-all shadow-lg"
          aria-label="Toggle chat"
          data-testid="chat-toggle-btn"
        >
          💬
        </button>
      )}

      {/* Chat panel — online games only */}
      {activeOnlineGameId && auth.user && (
        <ChatPanel
          gameId={activeOnlineGameId}
          userId={auth.user.id}
          displayName={auth.user.displayName}
          gameContext={`Hand ${handNumber}, scores: ${player.score}–${opponent.score}`}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Game over overlay */}
      {phase === 'GAME_OVER' && winner !== null && (
        <GameOver
          winnerIndex={winner}
          playerScore={player.score}
          opponentScore={opponent.score}
          onPlayAgain={newGame}
          handsPlayed={handNumber}
        />
      )}
    </div>
  );
}
