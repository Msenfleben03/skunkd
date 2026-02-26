import { supabase } from './supabase';
import type { Tables } from './database.types';

export type PlayerStats = Tables<'stats'>;

export interface RecordGameResultParams {
  userId: string;
  won: boolean;
  playerScore: number;
  opponentScore: number;
}

export async function recordGameResult(params: RecordGameResultParams): Promise<void> {
  const { error } = await supabase.rpc('record_game_result', {
    p_user_id: params.userId,
    p_won: params.won,
    p_player_score: params.playerScore,
    p_opponent_score: params.opponentScore,
  });
  if (error) throw new Error(`Failed to record game result: ${error.message}`);
}

export async function fetchStats(userId: string): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from('stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) return null;
  return data;
}
