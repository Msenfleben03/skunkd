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
import { computeGamePerformance } from '@/lib/gameStatsHelper';
import { StartScreen } from './StartScreen';
import { HandCompleteScreen } from './HandCompleteScreen';
import { ActiveGameLayout } from './ActiveGameLayout';

type OnlineStep = null | 'menu' | 'creating' | 'waiting' | 'join-input';

interface PendingOnlineGame {
  gameId: string;
  inviteCode: string;
}

type OnlineBroadcast =
  | { type: 'deal_complete'; handNumber: number; creatorHand: Card[]; starter: Card; handId: string }
  | { type: 'joiner_ready'; joinerHand: Card[] }
  | { type: 'game_action'; action: GameAction }
  | { type: 'game_complete'; winnerIndex: number }
  | { type: 'ready_next_hand' }
  | { type: 'rematch'; inviteCode: string };

interface PendingDealData {
  myHand: Card[];
  starter: Card;
  handId: string;
}

export function GameScreen({ className }: { className?: string }) {
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [localPlayerSeat, setLocalPlayerSeat] = useState<0 | 1>(0);
  const [pendingDealData, setPendingDealData] = useState<PendingDealData | null>(null);
  const [localReadyNextHand, setLocalReadyNextHand] = useState(false);
  const [opponentReadyNextHand, setOpponentReadyNextHand] = useState(false);

  const {
    gameState,
    selectedCardIds,
    showScoring,
    lastPeggingScore,
    humanPlayerIndex,
    newGame,
    returnToMenu,
    toggleCardSelect,
    confirmDiscard,
    playSelectedCard,
    declareGo,
    advanceShow,
    nextHand,
    dispatchRemoteAction,
  } = useGame({ isOnline: gameMode === 'online', localPlayerIndex: localPlayerSeat });

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

  // Wire up game channel for online multiplayer
  const channel = useGameChannel(
    activeOnlineGameId,
    auth.user?.id ?? null,
  );

  const { phase, players, handNumber, handStats, winner } = gameState;

  const opponentPlayerIndex = (humanPlayerIndex + 1) % 2;
  const player = players[humanPlayerIndex];
  const opponent = players[opponentPlayerIndex];

  // Reset ready-gate when advancing past HAND_COMPLETE
  useEffect(() => {
    if (phase !== 'HAND_COMPLETE') {
      setLocalReadyNextHand(false);
      setOpponentReadyNextHand(false);
    }
  }, [phase]);

  // ── Read join state from navigation (joiner arriving from /join/:code) ────
  useEffect(() => {
    const state = location.state as { joinedGame?: GameSummary } | null;
    if (state?.joinedGame) {
      const { game } = state.joinedGame;
      setActiveOnlineGameId(game.id);
      setOnlineStep(null);
      setGameMode('online');
      setLocalPlayerSeat(1); // joiner is always seat 1
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
          const { data: players } = await supabase
            .from('game_players')
            .select('user_id, seat')
            .eq('game_id', pendingGame.gameId)
            .order('seat');

          if (players && players.length >= 2) {
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
    if (localPlayerSeat !== 0) return;
    if (!channel.isConnected || channel.opponentPresence !== 'online') return;
    if (phase !== 'GAME_START' && phase !== 'DEALING') return;

    let cancelled = false;

    const initiateDeal = async () => {
      try {
        const dealResult = await dealHand(activeOnlineGameId!, handNumber || 1);
        if (cancelled) return;

        const myHand = dealResult.your_cards as Card[];
        const starterCard = dealResult.starter_card as Card;

        channel.broadcastAction({
          type: 'deal_complete',
          handNumber: handNumber || 1,
          creatorHand: myHand,
          starter: starterCard,
          handId: dealResult.hand_id,
        });

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
          (async () => {
            const dealResult = await dealHand(activeOnlineGameId!, msg.handNumber);
            const myHand = dealResult.your_cards as Card[];

            channel.broadcastAction({
              type: 'joiner_ready',
              joinerHand: myHand,
            });

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

        case 'ready_next_hand': {
          setOpponentReadyNextHand(true);
          break;
        }

        case 'game_action': {
          if (gameMode === 'online' && (msg.action as GameAction).type === 'ADVANCE_SHOW') {
            break;
          }
          dispatchRemoteAction(msg.action);
          break;
        }

        case 'game_complete': {
          break;
        }

        case 'rematch': {
          if (msg.inviteCode) {
            navigate(`/join/${msg.inviteCode}`);
          }
          break;
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, activeOnlineGameId, pendingDealData, handNumber]);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleStartVsAI = useCallback(async () => {
    if (!auth.user) {
      await auth.signInAsGuest();
    }
    setOnlineStep(null);
    newGame();
  }, [auth, newGame]);

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

  const handleJoinWithCode = useCallback(() => {
    if (joinCode.trim().length < 4) return;
    window.location.href = `/join/${joinCode.trim().toUpperCase()}`;
  }, [joinCode]);

  // ── Stats persistence ─────────────────────────────────────────────────────

  const savedRef = useRef(false);
  useEffect(() => {
    if (phase === 'DEALING') savedRef.current = false;
  }, [phase]);

  useEffect(() => {
    if (gameMode !== 'local') return;
    if (phase !== 'GAME_OVER' || winner === null || !auth.user || savedRef.current) return;
    savedRef.current = true;
    const perfStats = computeGamePerformance(gameState, humanPlayerIndex);
    recordGameResult({
      won: winner === humanPlayerIndex,
      playerScore: player.score,
      opponentScore: opponent.score,
      ...perfStats,
    }).catch(console.error);
  }, [phase, winner, auth.user, player.score, opponent.score, gameMode, humanPlayerIndex, gameState]);

  useEffect(() => {
    if (gameMode !== 'online' || phase !== 'GAME_OVER' || winner === null) return;

    channel.broadcastAction({ type: 'game_complete', winnerIndex: winner });

    if (localPlayerSeat === 0 && activeOnlineGameId) {
      updateGameStatus(activeOnlineGameId, 'complete').catch(console.error);
    }

    if (auth.user && !savedRef.current) {
      savedRef.current = true;
      const perfStats = computeGamePerformance(gameState, localPlayerSeat);
      recordGameResult({
        won: winner === localPlayerSeat,
        playerScore: player.score,
        opponentScore: opponent.score,
        ...perfStats,
        ...(activeOnlineGameId !== null && {
          gameId: activeOnlineGameId,
          finalScore: gameState.players[humanPlayerIndex].score,
        }),
      }).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, winner, gameMode]);

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
    advanceShow();
  }, [advanceShow]);

  const handleNextHand = useCallback(() => {
    if (gameMode === 'online') {
      setLocalReadyNextHand(true);
      channel.broadcastAction({ type: 'ready_next_hand' });
      return;
    }
    nextHand();
  }, [nextHand, gameMode, channel]);

  // Both players ready → advance to next hand
  useEffect(() => {
    if (localReadyNextHand && opponentReadyNextHand) {
      setLocalReadyNextHand(false);
      setOpponentReadyNextHand(false);
      nextHand();
    }
  }, [localReadyNextHand, opponentReadyNextHand, nextHand]);

  const handleReturnToMenu = useCallback(() => {
    setGameMode('local');
    setActiveOnlineGameId(null);
    returnToMenu();
  }, [returnToMenu]);

  const handleRematch = useCallback(async () => {
    if (!activeOnlineGameId) return;
    try {
      const { game } = await createGame('vs_human');
      channel.broadcastAction({ type: 'rematch', inviteCode: game.invite_code });
      newGame();
      setGameMode('online');
      setLocalPlayerSeat(0);
      setPendingGame({ gameId: game.id, inviteCode: game.invite_code });
      setActiveOnlineGameId(game.id);
      setOnlineStep('waiting');
    } catch {
      handleReturnToMenu();
    }
  }, [activeOnlineGameId, channel, newGame, handleReturnToMenu]);

  const handleViewStats = useCallback(() => {
    navigate('/game-stats', {
      state: {
        playerIndex: humanPlayerIndex,
        totalScore: player.score,
        handStatsHistory: gameState.handStatsHistory,
        decisionLog: gameState.decisionLog,
      },
    });
  }, [navigate, humanPlayerIndex, player.score, gameState.handStatsHistory, gameState.decisionLog]);

  // ── Phase routing ─────────────────────────────────────────────────────────

  if (phase === 'GAME_START') {
    return (
      <StartScreen
        onlineStep={onlineStep}
        setOnlineStep={setOnlineStep}
        pendingGame={pendingGame}
        setPendingGame={setPendingGame}
        joinCode={joinCode}
        setJoinCode={setJoinCode}
        onlineError={onlineError}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        authUser={auth.user}
        authLoading={auth.loading}
        onStartVsAI={handleStartVsAI}
        onCreateOnlineGame={handleCreateOnlineGame}
        onJoinWithCode={handleJoinWithCode}
        onNavigateStats={() => navigate('/stats')}
        onNavigateHistory={() => navigate('/history')}
        className={className}
      />
    );
  }

  if (phase === 'HAND_COMPLETE') {
    return (
      <HandCompleteScreen
        handNumber={handNumber}
        humanPlayerIndex={humanPlayerIndex}
        opponentPlayerIndex={opponentPlayerIndex}
        handStats={handStats}
        playerScore={player.score}
        opponentScore={opponent.score}
        onNextHand={handleNextHand}
        waitingForOpponent={gameMode === 'online' && localReadyNextHand && !opponentReadyNextHand}
      />
    );
  }

  return (
    <ActiveGameLayout
      gameState={gameState}
      selectedCardIds={selectedCardIds}
      showScoring={showScoring}
      lastPeggingScore={lastPeggingScore}
      humanPlayerIndex={humanPlayerIndex}
      onDiscard={handleDiscard}
      onPlay={handlePlayCard}
      onGo={handleGo}
      onAdvance={handleAdvanceShow}
      onNextHand={handleNextHand}
      onNewGame={newGame}
      onReturnToMenu={handleReturnToMenu}
      toggleCardSelect={(cardId: string) => toggleCardSelect(cardId)}
      onViewStats={handleViewStats}
      onRematch={gameMode === 'online' ? handleRematch : undefined}
      gameMode={gameMode}
      opponentPresence={channel.opponentPresence}
      activeOnlineGameId={activeOnlineGameId}
      authUser={auth.user}
      chatOpen={chatOpen}
      setChatOpen={setChatOpen}
      className={className}
    />
  );
}
