// Client-side helper for all LLM features via the llm-proxy Edge Function.
import { supabase } from './supabase';

export type LLMTask =
  | 'score_explanation'
  | 'coaching_review'
  | 'match_analysis'
  | 'chat_suggest'
  | 'quick_reactions';

export interface LLMResponse {
  text: string;
}

/** Call the llm-proxy Edge Function. Throws on error or rate limit. */
export async function callLLM(
  task: LLMTask,
  context: Record<string, unknown>
): Promise<LLMResponse> {
  const { data, error } = await supabase.functions.invoke('llm-proxy', {
    body: { task, context },
  });

  if (error) throw new Error(error.message ?? 'LLM call failed');
  if (!data?.text) throw new Error('Empty response from LLM');

  return { text: data.text as string };
}

/** Parse JSON from LLM response (for chat_suggest / quick_reactions). */
export function parseLLMJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return fallback;
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}
