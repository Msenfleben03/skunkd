// Task 6.5: LLM-powered suggestion bar — shows contextual trash talk while typing
import { useState, useEffect, useRef } from 'react';
import { callLLM, parseLLMJson } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface SuggestionBarProps {
  gameContext: string;
  draft: string;
  onSelect: (text: string) => void;
  className?: string;
}

const DEBOUNCE_MS = 800;
const DEFAULT_SUGGESTIONS = [
  "Nice try, rookie",
  "My crib loves me",
  "Counting on your fingers?",
];

export function SuggestionBar({ gameContext, onSelect, className }: SuggestionBarProps) {
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContextRef = useRef<string>('');

  // Re-fetch suggestions when game context changes (debounced)
  useEffect(() => {
    if (gameContext === lastContextRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastContextRef.current = gameContext;
      setLoading(true);
      try {
        const { text } = await callLLM('chat_suggest', { gameContext });
        const parsed = parseLLMJson<string[]>(text, DEFAULT_SUGGESTIONS);
        setSuggestions(parsed.slice(0, 3));
      } catch {
        // Keep previous suggestions on error
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [gameContext]);

  return (
    <div
      className={cn('px-4 py-2 border-t border-white/5 flex gap-2 overflow-x-auto', className)}
      aria-label="Suggested messages"
    >
      {loading && (
        <div className="flex items-center px-2">
          <div className="w-2 h-2 rounded-full bg-gold/50 animate-pulse" />
        </div>
      )}
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-white/5 border border-white/10 text-cream/60',
            'hover:bg-gold/10 hover:border-gold/20 hover:text-cream/90',
            'transition-all whitespace-nowrap',
          )}
          data-testid={`suggestion-${i}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
