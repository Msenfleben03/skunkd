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
 * Join a game by invite code. Adds the current user as seat 1.
 */
export async function joinGame(inviteCode: string): Promise<GameSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in to join a game');

  // Find game by invite code — only games the user can see (RLS)
  const { data: game, error: findError } = await supabase
    .from('games')
    .select()
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (findError || !game) throw new Error('Game not found or no longer available');

  // Add player as seat 1
  const { error: joinError } = await supabase
    .from('game_players')
    .insert({ game_id: game.id, user_id: user.id, seat: 1 });

  if (joinError) throw new Error(`Failed to join: ${joinError.message}`);

  // Mark game active
  await supabase.from('games').update({ status: 'active' }).eq('id', game.id);

  const players = await getGamePlayers(game.id);
  return { game: { ...game, status: 'active' }, players };
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
): Promise<{ hand_id: string; your_cards: { rank: string; suit: string; id: string }[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('deal-hand', {
    body: { game_id: gameId, hand_number: handNumber },
  });

  if (response.error) throw new Error(`Deal failed: ${response.error.message}`);
  return response.data as { hand_id: string; your_cards: { rank: string; suit: string; id: string }[] };
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
