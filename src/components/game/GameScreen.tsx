import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Card, GameAction } from '@/engine/types';
import { useGame } from '@/hooks/useGame';
import { useGameChannel } from '@/hooks/useGameChannel';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { createGame, dealHand, updateGameStatus } from '@/lib/gameApi';
import type { GameSummary } from '@/lib/gameApi';
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

type OnlineBroadcast =
  | { type: 'deal_complete'; handNumber: number; creatorHand: Card[]; starter: Card; handId: string }
  | { type: 'joiner_ready'; joinerHand: Card[] }
  | { type: 'game_action'; action: GameAction }
  | { type: 'game_complete'; winnerIndex: number };

interface PendingDealData {
  myHand: Card[];
  starter: Card;
  handId: string;
}

const HUMAN_PLAYER = 0;

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
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [localPlayerSeat, setLocalPlayerSeat] = useState<0 | 1>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [opponentUserId, setOpponentUserId] = useState<string | null>(null);
  const [pendingDealData, setPendingDealData] = useState<PendingDealData | null>(null);

  const {
    gameState,
    selectedCardIds,
    showScoring,
    lastPeggingScore,
    humanPlayerIndex: _unusedHumanPlayerIndex, // eslint-disable-line @typescript-eslint/no-unused-vars
    newGame,
    returnToMenu,
    toggleCardSelect,
    confirmDiscard,
    playSelectedCard,
    declareGo,
    advanceShow,
    nextHand,
    dispatchRemoteAction,
  } = useGame({ isOnline: gameMode === 'online' });

  const auth = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeOnlineGameId, setActiveOnlineGameId] = useState<string | null>(null);
  const [onlineStep, setOnlineStep] = useState<OnlineStep>(null);
  const [pendingGame, setPendingGame] = useState<PendingOnlineGame | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [onlineError, setOnlineError] = useState<string | null>(null);

  // Online player index — in online mode, seat determines perspective
  const humanPlayerIndex = gameMode === 'online' ? localPlayerSeat : HUMAN_PLAYER;

  // Wire up game channel for online multiplayer
  const channel = useGameChannel(
    activeOnlineGameId,
    auth.user?.id ?? null,
  );

  const { phase, players, pegging, starter, crib, dealerIndex, handNumber, handStats, winner } =
    gameState;

  const opponentPlayerIndex = (humanPlayerIndex + 1) % 2;
  const player = players[humanPlayerIndex];
  const opponent = players[opponentPlayerIndex];

  // ── Read join state from navigation (joiner arriving from /join/:code) ────
  useEffect(() => {
    const state = location.state as { joinedGame?: GameSummary } | null;
    if (state?.joinedGame) {
      const { game, players } = state.joinedGame;
      setActiveOnlineGameId(game.id);
      setOnlineStep(null);
      setGameMode('online');
      setLocalPlayerSeat(1); // joiner is always seat 1
      const opponent = players.find(p => p.user_id !== auth.user?.id);
      setOpponentUserId(opponent?.user_id ?? null);
      // Clear location state to prevent re-triggering on re-render
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Detect opponent joining on "Waiting for Opponent" screen ──────────────
  useEffect(() => {
    if (onlineStep !== 'waiting' || !pendingGame) return;

    const waitChannel = supabase
      .channel(`wait:${pendingGame.gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${pendingGame.gameId}`,
        },
        async () => {
          // Opponent joined! Fetch their user_id
          const { data: players } = await supabase
            .from('game_players')
            .select('user_id, seat')
            .eq('game_id', pendingGame.gameId)
            .order('seat');

          if (players && players.length >= 2) {
            const opponent = players.find(p => p.user_id !== auth.user?.id);
            setOpponentUserId(opponent?.user_id ?? null);
            setGameMode('online');
            setLocalPlayerSeat(0); // creator is seat 0
            setOnlineStep(null); // exit waiting screen
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(waitChannel); };
  }, [onlineStep, pendingGame, auth.user?.id]);

  // ── Creator initiates deal when both players connected ─────────────────────
  useEffect(() => {
    if (gameMode !== 'online') return;
    if (localPlayerSeat !== 0) return; // only creator initiates
    if (!channel.isConnected || channel.opponentPresence !== 'online') return;
    if (phase !== 'GAME_START' && phase !== 'DEALING') return;

    let cancelled = false;

    const initiateDeal = async () => {
      try {
        const dealResult = await dealHand(activeOnlineGameId!, handNumber || 1);
        if (cancelled) return;

        const myHand = dealResult.your_cards as Card[];
        const starterCard = dealResult.starter_card as Card;

        // Broadcast my cards + starter to opponent
        channel.broadcastAction({
          type: 'deal_complete',
          handNumber: handNumber || 1,
          creatorHand: myHand,
          starter: starterCard,
          handId: dealResult.hand_id,
        });

        // Store deal data, wait for joiner's cards
        setPendingDealData({ myHand, starter: starterCard, handId: dealResult.hand_id });
      } catch (e) {
        console.error('Deal failed:', e);
      }
    };

    initiateDeal();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, localPlayerSeat, channel.isConnected, channel.opponentPresence, phase]);

  // ── Handle incoming broadcasts from opponent ──────────────────────────────
  useEffect(() => {
    if (gameMode !== 'online') return;

    channel.onRemoteAction((payload: unknown) => {
      const msg = payload as OnlineBroadcast;

      switch (msg.type) {
        case 'deal_complete': {
          // I'm the joiner — creator sent their hand + starter
          (async () => {
            const dealResult = await dealHand(activeOnlineGameId!, msg.handNumber);
            const myHand = dealResult.your_cards as Card[];

            // Broadcast my hand back to creator
            channel.broadcastAction({
              type: 'joiner_ready',
              joinerHand: myHand,
            });

            // Both hands known — load into engine
            const hands: [Card[], Card[]] = [msg.creatorHand, myHand];
            const dlrIndex = (msg.handNumber - 1) % 2;
            dispatchRemoteAction({
              type: 'LOAD_ONLINE_DEAL',
              hands,
              starter: msg.starter,
              dealerIndex: dlrIndex,
              handNumber: msg.handNumber,
            });
          })();
          break;
        }

        case 'joiner_ready': {
          // I'm the creator — joiner sent their hand
          if (!pendingDealData) return;
          const hands: [Card[], Card[]] = [pendingDealData.myHand, msg.joinerHand];
          const dlrIndex = ((handNumber || 1) - 1) % 2;
          dispatchRemoteAction({
            type: 'LOAD_ONLINE_DEAL',
            hands,
            starter: pendingDealData.starter,
            dealerIndex: dlrIndex,
            handNumber: handNumber || 1,
          });
          setPendingDealData(null);
          break;
        }

        case 'game_action': {
          // Remote player performed an engine action
          dispatchRemoteAction(msg.action);
          break;
        }

        case 'game_complete': {
          // Remote detected game over — local engine should already be synced
          break;
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, activeOnlineGameId, pendingDealData, handNumber]);

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

  // Reset save guard when a new game deals
  const savedRef = useRef(false);
  useEffect(() => {
    if (phase === 'DEALING') savedRef.current = false;
  }, [phase]);

  // Save result once when game ends (local mode only; online handled separately in Task 9)
  useEffect(() => {
    if (gameMode !== 'local') return;
    if (phase !== 'GAME_OVER' || winner === null || !auth.user || savedRef.current) return;
    savedRef.current = true;
    recordGameResult({
      won: winner === humanPlayerIndex,
      playerScore: player.score,
      opponentScore: opponent.score,
    }).catch(console.error);
  }, [phase, winner, auth.user, player.score, opponent.score, gameMode, humanPlayerIndex]);

  // Save result + broadcast game complete when online game ends
  useEffect(() => {
    if (gameMode !== 'online' || phase !== 'GAME_OVER' || winner === null) return;

    // Broadcast game complete
    channel.broadcastAction({ type: 'game_complete', winnerIndex: winner });

    // Only one client updates the DB (creator)
    if (localPlayerSeat === 0 && activeOnlineGameId) {
      updateGameStatus(activeOnlineGameId, 'complete').catch(console.error);
    }

    // Record stats for the local player
    if (auth.user && !savedRef.current) {
      savedRef.current = true;
      recordGameResult({
        won: winner === localPlayerSeat,
        playerScore: player.score,
        opponentScore: opponent.score,
      }).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, winner, gameMode]);

  // Cards the human plays from during pegging
  const humanPeggingCards = pegging.playerCards[humanPlayerIndex] ?? [];
  // Which hand to show (pegging uses playerCards, otherwise hand)
  const handToDisplay = phase === 'PEGGING' ? humanPeggingCards : player.hand;
  const showHand = HAND_VISIBLE_PHASES.has(phase) && handToDisplay.length > 0;

  // Disable card interaction when it's not the human's turn or during auto-phases
  const handInteractive =
    phase === 'DISCARD_TO_CRIB' ||
    (phase === 'PEGGING' && pegging.currentPlayerIndex === humanPlayerIndex);

  // ── Online action broadcasting ─────────────────────────────────────────────

  const broadcastGameAction = useCallback(
    (action: GameAction) => {
      if (gameMode === 'online' && channel.isConnected) {
        channel.broadcastAction({ type: 'game_action', action });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameMode, channel.isConnected, channel.broadcastAction]
  );

  const handleDiscard = useCallback(() => {
    if (gameMode === 'online') {
      broadcastGameAction({
        type: 'DISCARD',
        playerIndex: localPlayerSeat,
        cardIds: [...selectedCardIds],
      });
    }
    confirmDiscard();
  }, [confirmDiscard, gameMode, localPlayerSeat, selectedCardIds, broadcastGameAction]);

  const handlePlayCard = useCallback(() => {
    const [cardId] = selectedCardIds;
    if (gameMode === 'online') {
      broadcastGameAction({
        type: 'PLAY_CARD',
        playerIndex: localPlayerSeat,
        cardId,
      });
    }
    playSelectedCard();
  }, [playSelectedCard, gameMode, localPlayerSeat, selectedCardIds, broadcastGameAction]);

  const handleGo = useCallback(() => {
    if (gameMode === 'online') {
      broadcastGameAction({
        type: 'DECLARE_GO',
        playerIndex: localPlayerSeat,
      });
    }
    declareGo();
  }, [declareGo, gameMode, localPlayerSeat, broadcastGameAction]);

  const handleAdvanceShow = useCallback(() => {
    if (gameMode === 'online') {
      broadcastGameAction({ type: 'ADVANCE_SHOW' });
    }
    advanceShow();
  }, [advanceShow, gameMode, broadcastGameAction]);

  const handleNextHand = useCallback(() => {
    if (gameMode === 'online') {
      broadcastGameAction({ type: 'NEXT_HAND' });
    }
    nextHand();
  }, [nextHand, gameMode, broadcastGameAction]);

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

          {/* Auth status / sign-in link */}
          {auth.user && !auth.user.isGuest ? (
            <p
              className="animate-float-in text-cream/30 text-[9px] mt-4"
              style={{ animationDelay: '0.48s' }}
            >
              Signed in as {auth.user.displayName}
            </p>
          ) : (
            <button
              className="animate-float-in mt-4 text-gold/50 hover:text-gold/80 text-xs transition-colors"
              style={{ animationDelay: '0.48s' }}
              onClick={() => setShowAuthModal(true)}
              data-testid="sign-in-btn"
            >
              Sign In / Create Account
            </button>
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
        style={{ background: '#0D0D1A' }}
      >
        <HandSummary
          handNumber={handNumber}
          playerStats={handStats[humanPlayerIndex]}
          opponentStats={handStats[opponentPlayerIndex]}
          playerTotalScore={player.score}
          opponentTotalScore={opponent.score}
          onNextHand={handleNextHand}
        />
        <HandReview
          handNumber={handNumber}
          playerStats={handStats[humanPlayerIndex]}
          opponentStats={handStats[opponentPlayerIndex]}
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
        onDiscard={handleDiscard}
        onPlay={handlePlayCard}
        onGo={handleGo}
        onAdvance={handleAdvanceShow}
        onNextHand={handleNextHand}
        onNewGame={newGame}
      />

      {/* Always-visible horizontal cribbage board strip */}
      <CribbageBoard
        player={{ front: player.pegFront, back: player.pegBack }}
        opponent={{ front: opponent.pegFront, back: opponent.pegBack }}
        horizontal
        className="flex-shrink-0 border-t border-gold/15 py-1"
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

      {/* Disconnect overlay — online games only */}
      {gameMode === 'online' && channel.opponentPresence === 'offline' && phase !== 'GAME_START' && phase !== 'GAME_OVER' && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gold font-black text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              Opponent Disconnected
            </p>
            <p className="text-cream/40 text-sm mt-2">Waiting for them to reconnect...</p>
            <button
              onClick={() => { setGameMode('local'); setActiveOnlineGameId(null); returnToMenu(); }}
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
          onPlayAgain={newGame}
          onMainMenu={returnToMenu}
          handsPlayed={handNumber}
        />
      )}
    </div>
  );
}
