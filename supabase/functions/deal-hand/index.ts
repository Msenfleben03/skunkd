// SKUNK'D — deal-hand Edge Function
// Security: Card dealing MUST happen server-side so clients never see opponent hands.
// This function shuffles the deck, deals 6 cards to each player, and inserts them
// into hand_cards with per-player user_id so RLS enforces isolation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;
const SUITS = ['H', 'D', 'S', 'C'] as const;

type Rank = typeof RANKS[number];
type Suit = typeof SUITS[number];
interface Card { rank: Rank; suit: Suit; id: string; }

interface DealRequest {
  game_id: string;
  hand_number: number;
}

interface DealResponse {
  hand_id: string;
  /** Only the requesting player's own cards are returned */
  your_cards: Card[];
}

// Fisher-Yates shuffle
function shuffleDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse and validate request body
    const body: DealRequest = await req.json();
    if (!body.game_id || typeof body.hand_number !== 'number') {
      return new Response(JSON.stringify({ error: 'game_id and hand_number are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create service-role client (bypasses RLS for dealing)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Create user-scoped client to identify the requesting player
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify requesting user is a player in this game
    const { data: playerRow, error: playerError } = await supabaseService
      .from('game_players')
      .select('seat')
      .eq('game_id', body.game_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (playerError || !playerRow) {
      return new Response(JSON.stringify({ error: 'Not a participant in this game' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent re-dealing the same hand (idempotency check)
    const { data: existingHand } = await supabaseService
      .from('hands')
      .select('id')
      .eq('game_id', body.game_id)
      .eq('hand_number', body.hand_number)
      .maybeSingle();

    if (existingHand) {
      return new Response(
        JSON.stringify({ error: 'Hand already dealt', hand_id: existingHand.id }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all (non-AI) players in this game
    const { data: players, error: playersError } = await supabaseService
      .from('game_players')
      .select('user_id, seat, is_ai')
      .eq('game_id', body.game_id)
      .order('seat');

    if (playersError || !players || players.length < 2) {
      return new Response(JSON.stringify({ error: 'Could not load game players' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the hand record
    const { data: hand, error: handError } = await supabaseService
      .from('hands')
      .insert({
        game_id: body.game_id,
        hand_number: body.hand_number,
      })
      .select('id')
      .single();

    if (handError || !hand) {
      return new Response(JSON.stringify({ error: 'Failed to create hand record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Shuffle and deal 6 cards to each player
    const deck = shuffleDeck();
    const handCardRows: {
      hand_id: string;
      user_id: string;
      card: { rank: Rank; suit: Suit; id: string };
      destination: 'hand';
    }[] = [];

    const humanPlayers = players.filter(p => !p.is_ai);
    const aiPlayers = players.filter(p => p.is_ai);

    // Deal to human players
    humanPlayers.forEach((player, i) => {
      for (let c = 0; c < 6; c++) {
        handCardRows.push({
          hand_id: hand.id,
          user_id: player.user_id,
          card: deck[i * 6 + c],
          destination: 'hand',
        });
      }
    });

    // For AI players, store cards with AI's user_id (AI reads via service role)
    aiPlayers.forEach((player, i) => {
      const offset = humanPlayers.length * 6;
      for (let c = 0; c < 6; c++) {
        handCardRows.push({
          hand_id: hand.id,
          user_id: player.user_id,
          card: deck[offset + i * 6 + c],
          destination: 'hand',
        });
      }
    });

    // Insert all cards via service role (bypasses RLS insert restriction)
    const { error: insertError } = await supabaseService
      .from('hand_cards')
      .insert(handCardRows);

    if (insertError) {
      // Clean up orphaned hand record
      await supabaseService.from('hands').delete().eq('id', hand.id);
      return new Response(JSON.stringify({ error: 'Failed to deal cards' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return ONLY the requesting player's cards
    const yourCards = handCardRows
      .filter(r => r.user_id === user.id)
      .map(r => r.card);

    const response: DealResponse = {
      hand_id: hand.id,
      your_cards: yourCards,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('deal-hand error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
