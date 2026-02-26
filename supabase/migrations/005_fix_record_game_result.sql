-- SKUNK'D Migration 005: fix record_game_result RPC
-- Removes unused p_hands_played parameter.
-- Adds row-count guard to raise an error if the user's stats row is missing.

-- Drop the old 5-param version first (CREATE OR REPLACE cannot change signature)
DROP FUNCTION IF EXISTS public.record_game_result(UUID, BOOLEAN, INT, INT, INT);

CREATE OR REPLACE FUNCTION public.record_game_result(
  p_user_id        UUID,
  p_won            BOOLEAN,
  p_player_score   INT,
  p_opponent_score INT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_loser_score       INT;
  v_is_single_skunk   BOOLEAN;
  v_is_double_skunk   BOOLEAN;
  v_rows_affected     INT;
BEGIN
  -- Loser's score determines skunk tier
  v_loser_score     := CASE WHEN p_won THEN p_opponent_score ELSE p_player_score END;
  v_is_double_skunk := v_loser_score < 61;
  v_is_single_skunk := v_loser_score < 91 AND NOT v_is_double_skunk;

  UPDATE public.stats SET
    games_played           = games_played + 1,
    wins                   = wins   + CASE WHEN p_won     THEN 1 ELSE 0 END,
    losses                 = losses + CASE WHEN NOT p_won THEN 1 ELSE 0 END,
    current_streak         = CASE WHEN p_won THEN current_streak + 1 ELSE 0 END,
    best_streak            = GREATEST(best_streak, CASE WHEN p_won THEN current_streak + 1 ELSE 0 END),
    skunks_given           = skunks_given           + CASE WHEN p_won     AND v_is_single_skunk THEN 1 ELSE 0 END,
    double_skunks_given    = double_skunks_given    + CASE WHEN p_won     AND v_is_double_skunk THEN 1 ELSE 0 END,
    skunks_received        = skunks_received        + CASE WHEN NOT p_won AND v_is_single_skunk THEN 1 ELSE 0 END,
    double_skunks_received = double_skunks_received + CASE WHEN NOT p_won AND v_is_double_skunk THEN 1 ELSE 0 END,
    updated_at             = NOW()
  WHERE user_id = p_user_id;

  -- Guard: stats row must exist (created by trigger on user creation)
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'stats row not found for user_id %', p_user_id;
  END IF;
END;
$$;

-- Re-apply permissions (DROP + CREATE resets them)
REVOKE ALL ON FUNCTION public.record_game_result FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_game_result TO authenticated;
