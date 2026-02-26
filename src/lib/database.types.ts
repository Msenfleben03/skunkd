// Auto-generate from Supabase CLI with: npx supabase gen types typescript --local > src/lib/database.types.ts
// This file is manually maintained until project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          cribbage_grade: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          cribbage_grade?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          cribbage_grade?: string;
        };
      };
      games: {
        Row: {
          id: string;
          mode: 'vs_ai' | 'vs_human';
          status: 'waiting' | 'active' | 'complete' | 'abandoned';
          created_by: string;
          invite_code: string;
          is_async: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          mode: 'vs_ai' | 'vs_human';
          status?: 'waiting' | 'active' | 'complete' | 'abandoned';
          created_by: string;
          invite_code?: string;
          is_async?: boolean;
          created_at?: string;
        };
        Update: {
          mode?: 'vs_ai' | 'vs_human';
          status?: 'waiting' | 'active' | 'complete' | 'abandoned';
          is_async?: boolean;
        };
      };
      game_players: {
        Row: {
          game_id: string;
          user_id: string;
          seat: number;
          is_dealer: boolean;
          is_ai: boolean;
        };
        Insert: {
          game_id: string;
          user_id: string;
          seat: number;
          is_dealer?: boolean;
          is_ai?: boolean;
        };
        Update: {
          is_dealer?: boolean;
        };
      };
      hands: {
        Row: {
          id: string;
          game_id: string;
          hand_number: number;
          dealer_user_id: string | null;
          starter_card: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          hand_number: number;
          dealer_user_id?: string | null;
          starter_card?: Json | null;
          created_at?: string;
        };
        Update: {
          starter_card?: Json | null;
        };
      };
      hand_cards: {
        Row: {
          id: string;
          hand_id: string;
          user_id: string;
          card: Json;
          destination: 'hand' | 'crib' | 'pegging';
          play_order: number | null;
        };
        Insert: {
          id?: string;
          hand_id: string;
          user_id: string;
          card: Json;
          destination?: 'hand' | 'crib' | 'pegging';
          play_order?: number | null;
        };
        Update: {
          destination?: 'hand' | 'crib' | 'pegging';
          play_order?: number | null;
        };
      };
      scores: {
        Row: {
          id: string;
          hand_id: string;
          user_id: string;
          source: 'pegging' | 'hand' | 'crib' | 'heels';
          points: number;
          breakdown_json: Json | null;
          scored_at: string;
        };
        Insert: {
          id?: string;
          hand_id: string;
          user_id: string;
          source: 'pegging' | 'hand' | 'crib' | 'heels';
          points: number;
          breakdown_json?: Json | null;
          scored_at?: string;
        };
        Update: never;
      };
      decisions: {
        Row: {
          id: string;
          hand_id: string;
          user_id: string;
          phase: 'discard' | 'pegging';
          action: Json;
          was_optimal: boolean | null;
          optimal_action: Json | null;
          ev_delta: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          hand_id: string;
          user_id: string;
          phase: 'discard' | 'pegging';
          action: Json;
          was_optimal?: boolean | null;
          optimal_action?: Json | null;
          ev_delta?: number | null;
          created_at?: string;
        };
        Update: never;
      };
      stats: {
        Row: {
          user_id: string;
          games_played: number;
          wins: number;
          losses: number;
          skunks_given: number;
          skunks_received: number;
          double_skunks_given: number;
          double_skunks_received: number;
          highest_hand: number;
          best_streak: number;
          current_streak: number;
          avg_cribbage_grade: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          games_played?: number;
          wins?: number;
          losses?: number;
          skunks_given?: number;
          skunks_received?: number;
          double_skunks_given?: number;
          double_skunks_received?: number;
          highest_hand?: number;
          best_streak?: number;
          current_streak?: number;
          avg_cribbage_grade?: number;
          updated_at?: string;
        };
        Update: {
          games_played?: number;
          wins?: number;
          losses?: number;
          skunks_given?: number;
          skunks_received?: number;
          double_skunks_given?: number;
          double_skunks_received?: number;
          highest_hand?: number;
          best_streak?: number;
          current_streak?: number;
          avg_cribbage_grade?: number;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          game_id: string;
          user_id: string;
          content: string;
          is_ai_suggested: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          user_id: string;
          content: string;
          is_ai_suggested?: boolean;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
