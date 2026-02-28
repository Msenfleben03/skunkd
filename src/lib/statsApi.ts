import { supabase } from './supabase';
import type { Tables } from './database.types';

export type PlayerStats = Tables<'stats'>;

export interface RecordGameResultParams {
  won: boolean;
  playerScore: number;
  opponentScore: number;
  totalPegging?: number;
  totalHand?: number;
  totalCrib?: number;
  handsPlayed?: number;
  bestPegging?: number;
  bestHand?: number;
  bestCrib?: number;
  optimalDiscards?: number;
  totalDiscards?: number;
  evDeficit?: number;
  /** Online game ID — when provided, also persists final score to game_players */
  gameId?: string;
  finalScore?: number;
}

export async function recordGameResult(params: RecordGameResultParams): Promise<void> {
  const { error } = await supabase.rpc('record_game_result', {
    p_won: params.won,
    p_player_score: params.playerScore,
    p_opponent_score: params.opponentScore,
    p_total_pegging: params.totalPegging ?? 0,
    p_total_hand: params.totalHand ?? 0,
    p_total_crib: params.totalCrib ?? 0,
    p_hands_played: params.handsPlayed ?? 0,
    p_best_pegging: params.bestPegging ?? 0,
    p_best_hand: params.bestHand ?? 0,
    p_best_crib: params.bestCrib ?? 0,
    p_optimal_discards: params.optimalDiscards ?? 0,
    p_total_discards: params.totalDiscards ?? 0,
    p_ev_deficit: params.evDeficit ?? 0,
    ...(params.gameId !== undefined && {
      p_game_id: params.gameId,
      p_final_score: params.finalScore ?? 0,
    }),
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
