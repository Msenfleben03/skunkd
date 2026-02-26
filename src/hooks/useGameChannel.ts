// Task 5.1 + 5.2: Real-Time Game Channel + Presence
// Supabase Broadcast for game actions, Presence for online status.

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface GameChannelMessage {
  type: 'game_action';
  payload: unknown;
  userId: string;
}

export interface UseGameChannelReturn {
  /** Whether the realtime channel is connected */
  isConnected: boolean;
  /** Opponent's detected presence status */
  opponentPresence: PresenceStatus;
  /** Broadcast a game action to the opponent */
  broadcastAction: (payload: unknown) => void;
  /** Register a handler for incoming remote actions */
  onRemoteAction: (handler: (payload: unknown, fromUserId: string) => void) => void;
}

export function useGameChannel(
  gameId: string | null,
  userId: string | null
): UseGameChannelReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [opponentPresence, setOpponentPresence] = useState<PresenceStatus>('offline');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const actionHandlerRef = useRef<((payload: unknown, fromUserId: string) => void) | null>(null);

  useEffect(() => {
    if (!gameId || !userId) return;

    const channel = supabase.channel(`game:${gameId}`, {
      config: { presence: { key: userId } },
    });

    // ── Broadcast: receive remote game actions ──────────────────────────────
    channel.on('broadcast', { event: 'game_action' }, ({ payload }) => {
      const msg = payload as GameChannelMessage;
      if (msg.userId !== userId && actionHandlerRef.current) {
        actionHandlerRef.current(msg.payload, msg.userId);
      }
    });

    // ── Presence: track opponent online status ──────────────────────────────
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ userId: string }>();
      const others = Object.values(state)
        .flat()
        .filter(p => p.userId !== userId);

      if (others.length === 0) {
        setOpponentPresence('offline');
      } else {
        setOpponentPresence('online');
      }
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (leftPresences.some(p => (p as unknown as { userId: string }).userId !== userId)) {
        setOpponentPresence('offline');
      }
    });

    // ── Subscribe + track own presence ──────────────────────────────────────
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track({ userId, joinedAt: new Date().toISOString() });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      setOpponentPresence('offline');
    };
  }, [gameId, userId]);

  const broadcastAction = useCallback(
    (payload: unknown) => {
      if (!channelRef.current || !userId) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_action',
        payload: { type: 'game_action', payload, userId } satisfies GameChannelMessage,
      });
    },
    [userId]
  );

  const onRemoteAction = useCallback(
    (handler: (payload: unknown, fromUserId: string) => void) => {
      actionHandlerRef.current = handler;
    },
    []
  );

  return { isConnected, opponentPresence, broadcastAction, onRemoteAction };
}
