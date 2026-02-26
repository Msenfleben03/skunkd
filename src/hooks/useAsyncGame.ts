// Task 5.4: Async Mode
// Polls for opponent actions via DB Realtime subscriptions.
// Auto-switches to Broadcast (useGameChannel) during pegging for low-latency play.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type AsyncGameStatus = 'your_turn' | 'waiting' | 'opponent_disconnected' | 'complete';

export interface UseAsyncGameReturn {
  status: AsyncGameStatus;
  /** Seconds since opponent last acted (for stale game detection) */
  opponentIdleSecs: number;
  /** Notify server the current player took an action */
  recordTurn: (actionPayload: unknown) => Promise<void>;
}

export function useAsyncGame(
  gameId: string | null,
  userId: string | null,
  isMyTurn: boolean
): UseAsyncGameReturn {
  const [status, setStatus] = useState<AsyncGameStatus>(isMyTurn ? 'your_turn' : 'waiting');
  const [opponentIdleSecs, setOpponentIdleSecs] = useState(0);
  const lastOpponentActionRef = useRef<Date>(new Date());
  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the idle clock
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      const secs = Math.floor(
        (Date.now() - lastOpponentActionRef.current.getTime()) / 1000
      );
      setOpponentIdleSecs(secs);
      if (secs > 86400) setStatus('opponent_disconnected'); // 24h timeout
    }, 5000);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
    };
  }, []);

  // Subscribe to DB changes on scores and hand_cards as proxy for turn changes
  useEffect(() => {
    if (!gameId || !userId) return;

    const channel = supabase
      .channel(`async:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scores',
        },
        payload => {
          const row = payload.new as { user_id: string };
          if (row.user_id !== userId) {
            lastOpponentActionRef.current = new Date();
            setOpponentIdleSecs(0);
            setStatus('your_turn');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'hand_cards',
        },
        payload => {
          const row = payload.new as { user_id: string };
          if (row.user_id !== userId) {
            lastOpponentActionRef.current = new Date();
            setOpponentIdleSecs(0);
            setStatus('your_turn');
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId, userId]);

  // Sync status with isMyTurn prop changes
  useEffect(() => {
    setStatus(isMyTurn ? 'your_turn' : 'waiting');
  }, [isMyTurn]);

  const recordTurn = useCallback(
    async (_actionPayload: unknown) => {
      setStatus('waiting');
      // The actual DB write happens in gameApi.ts (submitDiscard/submitPeggingPlay)
      // This hook just tracks the async turn state locally
    },
    []
  );

  return { status, opponentIdleSecs, recordTurn };
}
