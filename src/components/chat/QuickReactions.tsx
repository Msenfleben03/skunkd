// Task 6.5: LLM-generated one-tap reactions for game moments
import { useState, useEffect } from 'react';
import { callLLM, parseLLMJson } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface QuickReactionsProps {
  moment: string;  // e.g. "opponent just scored 29 points"
  onReact: (text: string) => void;
  className?: string;
}

const DEFAULT_REACTIONS = ['Muggins!', 'Nice nobs', 'Go yourself', '29 or bust'];

export function QuickReactions({ moment, onReact, className }: QuickReactionsProps) {
  const [reactions, setReactions] = useState<string[]>(DEFAULT_REACTIONS);
  const [loading, setLoading] = useState(true);
  const [usedIndex, setUsedIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    callLLM('quick_reactions', { moment })
      .then(({ text }) => {
        if (cancelled) return;
        const parsed = parseLLMJson<string[]>(text, DEFAULT_REACTIONS);
        setReactions(parsed.slice(0, 4));
      })
      .catch(() => {/* keep defaults */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [moment]);

  const handleReact = (text: string, index: number) => {
    setUsedIndex(index);
    onReact(text);
  };

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      aria-label="Quick reactions"
    >
      {reactions.map((r, i) => (
        <button
          key={i}
          onClick={() => handleReact(r, i)}
          disabled={loading || usedIndex !== null}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold',
            'border transition-all',
            usedIndex === i
              ? 'bg-skunk-green/20 border-skunk-green/40 text-skunk-green'
              : 'bg-white/5 border-white/10 text-cream/60 hover:bg-gold/10 hover:border-gold/20 hover:text-cream',
            loading && 'opacity-50',
          )}
          data-testid={`reaction-${i}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
