// SKUNK'D — llm-proxy Edge Function
// Single Gemini proxy for all LLM features. Applies Sir John Skunkling personality,
// enforces per-user rate limits, routes to Flash vs Pro based on task.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Personality ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Sir John Skunkling, the sharp-tongued cribbage coach for SKUNK'D.

Style:
- Witty and direct. 2-4 sentences max (chat suggestions: ≤8 words each).
- Use cribbage terminology naturally: nobs, his heels, go, pegging, crib, muggins, skunked.
- Celebrate clever plays; roast bad decisions with charm ("ha, rookie move" not cruelty).
- Reference the skunk threat dramatically when relevant (losing below 91 = skunked).
- Never use markdown. Plain text only. No bullet points in explanations.

You explain scoring, review decisions, generate trash talk, and analyze games.
Always keep it brief, sharp, and cribbage-specific.`;

// ── Task prompts ─────────────────────────────────────────────────────────────

function buildPrompt(task: string, context: Record<string, unknown>): { prompt: string; model: string } {
  switch (task) {
    case 'score_explanation':
      return {
        model: 'gemini-2.5-flash',
        prompt: `The player just scored ${context.total} points in "${context.label}".
Cards: ${(context.cards as string[]).join(', ')}, Cut: ${context.starter}.
Breakdown — Fifteens: ${(context.breakdown as Record<string, number>).fifteens}, Pairs: ${(context.breakdown as Record<string, number>).pairs}, Runs: ${(context.breakdown as Record<string, number>).runs}, Flush: ${(context.breakdown as Record<string, number>).flush}, Nobs: ${(context.breakdown as Record<string, number>).nobs}.
Explain this score in 2-3 sentences using cribbage terminology. ${context.total === 0 ? 'They scored zero — roast them gently.' : ''}`,
      };

    case 'coaching_review':
      return {
        model: 'gemini-2.5-flash',
        prompt: `Coaching review for Hand ${context.handNumber}:
Player scored — Pegging: ${context.pegging}, Hand: ${context.hand}, Crib: ${context.crib} pts.
Opponent scored — Pegging: ${context.oppPegging}, Hand: ${context.oppHand}, Crib: ${context.oppCrib} pts.
${context.decisions ? `Key decisions: ${context.decisions}` : ''}
In 3-4 sentences, give sharp coaching advice on what they did well and where they lost points.`,
      };

    case 'match_analysis':
      return {
        model: 'gemini-2.5-flash',
        prompt: `End of game analysis:
Winner: ${context.winner} | Score: ${context.playerScore} – ${context.opponentScore}.
${context.skunkType ? `Result: ${context.skunkType}!` : ''}
Hands played: ${context.handsPlayed}. ${context.stats ? `Stats: ${context.stats}` : ''}
In 4-5 sentences, analyze the match and assign a Cribbage Grade (A through F) with one sentence explaining the grade. Start with the grade.`,
      };

    case 'chat_suggest':
      return {
        model: 'gemini-2.5-flash',
        prompt: `In a cribbage game: ${context.gameContext}.
Generate exactly 3 short trash talk lines (≤8 words each), appropriate for this moment.
Respond with a JSON array only, no other text. Example: ["Nice try, rookie", "That crib smells", "Counting on your fingers?"]`,
      };

    case 'quick_reactions':
      return {
        model: 'gemini-2.5-flash',
        prompt: `Generate 4 one-tap cribbage reaction phrases (2-4 words each) for this moment: ${context.moment}.
Respond with a JSON array only. Example: ["Muggins!", "Nice nobs", "Go yourself", "29 or bust"]`,
      };

    default:
      throw new Error(`Unknown task: ${task}`);
  }
}

// ── Edge Function ─────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, context } = await req.json() as { task: string; context: Record<string, unknown> };

    if (!task || !context) {
      return jsonResponse({ error: 'task and context are required' }, 400);
    }

    // Auth: identify requesting user
    const authHeader = req.headers.get('Authorization');
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Rate limit: max 30 calls/hour per user
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseService
      .from('llm_calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('called_at', oneHourAgo);

    if ((count ?? 0) >= 30) {
      return jsonResponse({ error: 'Rate limit exceeded. Try again in an hour.' }, 429);
    }

    // Build prompt and call Gemini
    const { prompt, model } = buildPrompt(task, context);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: task === 'match_analysis' ? 500 : 300,
            temperature: task === 'chat_suggest' || task === 'quick_reactions' ? 1.0 : 0.75,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      throw new Error(`Gemini API error ${geminiRes.status}: ${errBody}`);
    }

    const geminiData = await geminiRes.json();
    const text: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Log the call (best-effort, don't fail on error)
    supabaseService.from('llm_calls').insert({ user_id: user.id, task }).then(() => {});

    return jsonResponse({ text }, 200);

  } catch (err) {
    console.error('llm-proxy error:', err);
    return jsonResponse({ error: 'Sir John Skunkling is temporarily unavailable.' }, 500);
  }
});
