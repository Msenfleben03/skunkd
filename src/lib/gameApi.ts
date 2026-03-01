// SKUNK'D — Game API
// Client-side functions for game lifecycle: create, join, state, actions.
// All RLS-filtered — callers only get data they're allowed to see.

import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Game = Tables<'games'>;
export type GamePlayer = Tables<'game_players'>;

export interface GameSummary {
  game: Game;
  players: GamePlayer[];
}

/** Extended result from joinGame — includes the caller's seat number. */
export interface JoinGameResult extends GameSummary {
  localSeat: 0 | 1;
}

// ── Create / Join ─────────────────────────────────────────────────────────────

/**
 * Create a new game. Returns the game with its invite_code.
 * For vs_ai mode, the AI player row is inserted immediately.
 */
export async function createGame(
  mode: 'vs_ai' | 'vs_human',
  isAsync = false
): Promise<GameSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in to create a game');

  // Insert game
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ mode, is_async: isAsync, created_by: user.id })
    .select()
    .single();

  if (gameError || !game) throw new Error(`Create game failed: ${gameError?.message}`);

  // Add the creating player as seat 0
  const { error: playerError } = await supabase
    .from('game_players')
    .insert({ game_id: game.id, user_id: user.id, seat: 0 });

  if (playerError) throw new Error(`Failed to join game: ${playerError.message}`);

  const players = await getGamePlayers(game.id);
  return { game, players };
}

/**
 * Join a game by invite code. Idempotent: returns existing seat if the caller
 * is already a player (reconnect). Rejects if the game is active and the
 * caller is not already registered as a player.
 */
export async function joinGame(inviteCode: string): Promise<JoinGameResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in to join a game');

  // Allow both waiting and active games — needed for reconnect after navigation
  const { data: game, error: findError } = await supabase
    .from('games')
    .select()
    .eq('invite_code', inviteCode.toUpperCase())
    .in('status', ['waiting', 'active'])
    .single();

  if (findError || !game) throw new Error('Game not found or no longer available');

  // Check if caller is already registered in this game
  const { data: existingPlayers } = await supabase
    .from('game_players')
    .select()
    .eq('game_id', game.id);

  const myRow = (existingPlayers ?? []).find(
    (p: GamePlayer) => p.user_id === user.id
  );

  if (myRow) {
    // Already a player — return current state with existing seat (reconnect)
    const players = await getGamePlayers(game.id);
    return { game, players, localSeat: myRow.seat as 0 | 1 };
  }

  if (game.status === 'active') {
    throw new Error('Game already in progress');
  }

  // Normal new-join path — add caller as seat 1
  const { error: joinError } = await supabase
    .from('game_players')
    .insert({ game_id: game.id, user_id: user.id, seat: 1 });

  if (joinError) throw new Error(`Failed to join: ${joinError.message}`);

  // Mark game active
  await supabase.from('games').update({ status: 'active' }).eq('id', game.id);

  const players = await getGamePlayers(game.id);
  return { game: { ...game, status: 'active' }, players, localSeat: 1 };
}

// ── State ─────────────────────────────────────────────────────────────────────

/** Get current game state — RLS ensures only visible data is returned. */
export async function getGameState(gameId: string): Promise<GameSummary> {
  const { data: game, error } = await supabase
    .from('games')
    .select()
    .eq('id', gameId)
    .single();

  if (error || !game) throw new Error(`Game not found: ${error?.message}`);
  const players = await getGamePlayers(gameId);
  return { game, players };
}

/** Get players for a game. */
async function getGamePlayers(gameId: string): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from('game_players')
    .select()
    .eq('game_id', gameId)
    .order('seat');

  if (error) throw new Error(`Failed to load players: ${error.message}`);
  return data ?? [];
}

// ── Deal ──────────────────────────────────────────────────────────────────────

/**
 * Request a hand deal via the server-side Edge Function.
 * Returns only the calling player's own cards.
 */
export async function dealHand(
  gameId: string,
  handNumber: number
): Promise<{
  hand_id: string;
  your_cards: { rank: string; suit: string; id: string }[];
  starter_card: { rank: string; suit: string; id: string } | null;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('deal-hand', {
    body: { game_id: gameId, hand_number: handNumber },
  });

  if (response.error) throw new Error(`Deal failed: ${response.error.message}`);
  return response.data as {
    hand_id: string;
    your_cards: { rank: string; suit: string; id: string }[];
    starter_card: { rank: string; suit: string; id: string } | null;
  };
}

// ── Actions ───────────────────────────────────────────────────────────────────

/** Record a discard action (move cards from hand to crib destination). */
export async function submitDiscard(
  handId: string,
  cardIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from('hand_cards')
    .update({ destination: 'crib' })
    .eq('hand_id', handId)
    .in('id', cardIds);

  if (error) throw new Error(`Discard failed: ${error.message}`);
}

/** Record a pegging play (move card to pegging destination with play order). */
export async function submitPeggingPlay(
  cardDbId: string,
  playOrder: number
): Promise<void> {
  const { error } = await supabase
    .from('hand_cards')
    .update({ destination: 'pegging', play_order: playOrder })
    .eq('id', cardDbId);

  if (error) throw new Error(`Pegging play failed: ${error.message}`);
}

/** Record a score event. */
export async function recordScore(
  handId: string,
  userId: string,
  source: 'pegging' | 'hand' | 'crib' | 'heels',
  points: number,
  breakdown?: Record<string, unknown> | null
): Promise<void> {
  const { error } = await supabase.from('scores').insert({
    hand_id: handId,
    user_id: userId,
    source,
    points,
    breakdown_json: (breakdown ?? null) as import('./database.types').Json | null,
  });

  if (error) throw new Error(`Score record failed: ${error.message}`);
}

/** Abandon / complete a game. */
export async function updateGameStatus(
  gameId: string,
  status: 'complete' | 'abandoned'
): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status })
    .eq('id', gameId);

  if (error) throw new Error(`Game status update failed: ${error.message}`);
}

// ── History ───────────────────────────────────────────────────────────────────

export interface GameHistoryItem {
  gameId: string;
  playedAt: string;
  myScore: number;
  iWon: boolean;
  opponentId: string | null;
  opponentName: string;
  opponentAvatar: string | null;
  opponentScore: number;
  opponentIsAi: boolean;
}

interface RawHistoryRow {
  game_id: string;
  played_at: string;
  my_score: number;
  my_winner: boolean;
  opponent_id: string | null;
  opponent_name: string;
  opponent_avatar: string | null;
  opponent_score: number;
  opponent_is_ai: boolean;
}

/** Fetch completed game history for the given user (online games only, most recent first). */
export async function fetchGameHistory(userId: string): Promise<GameHistoryItem[]> {
  const { data, error } = await supabase.rpc('get_game_history', {
    p_user_id: userId,
    p_limit: 50,
  });
  if (error || !data) return [];
  return (data as RawHistoryRow[]).map((row) => ({
    gameId: row.game_id,
    playedAt: row.played_at,
    myScore: row.my_score,
    iWon: row.my_winner,
    opponentId: row.opponent_id,
    opponentName: row.opponent_name,
    opponentAvatar: row.opponent_avatar,
    opponentScore: row.opponent_score,
    opponentIsAi: row.opponent_is_ai,
  }));
}

// ── Realtime ──────────────────────────────────────────────────────────────────

/**
 * Subscribe to game state changes (for multiplayer).
 * Returns unsubscribe function.
 */
export function subscribeToGame(
  gameId: string,
  onUpdate: (table: string, payload: unknown) => void
): () => void {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      payload => onUpdate('games', payload)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hand_cards', filter: `hand_id=eq.${gameId}` },
      payload => onUpdate('hand_cards', payload)
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scores', filter: `hand_id=eq.${gameId}` },
      payload => onUpdate('scores', payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
