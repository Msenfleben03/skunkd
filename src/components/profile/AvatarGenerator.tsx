// Task 6.6: SKUNK'D-style profile picture generator via Gemini Imagen
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AvatarGeneratorProps {
  currentAvatarUrl?: string | null;
  onGenerated?: (url: string) => void;
  className?: string;
}

export function AvatarGenerator({ currentAvatarUrl, onGenerated, className }: AvatarGeneratorProps) {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-avatar', {
        body: { description: description.trim() || undefined },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.avatar_url) throw new Error('No avatar URL returned');

      setPreviewUrl(data.avatar_url as string);
      onGenerated?.(data.avatar_url as string);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed';
      setError(
        msg.includes('not available') || msg.includes('not configured')
          ? 'Imagen API not available on this Gemini tier. Upgrade at console.cloud.google.com.'
          : msg
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Preview */}
      <div className="flex justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Your SKUNK'D avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-gold/30"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <span className="text-3xl">🦨</span>
          </div>
        )}
      </div>

      {/* Description input */}
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Describe yourself (optional): e.g. 'old man with a cowboy hat'"
        maxLength={100}
        className={cn(
          'w-full px-4 py-3 rounded-xl text-sm',
          'bg-white/5 border border-white/10 text-cream placeholder-cream/30',
          'focus:outline-none focus:border-gold/40 transition-colors',
        )}
      />

      {error && (
        <p className="text-red-400/80 text-xs text-center">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className={cn(
          'w-full py-3.5 rounded-xl font-bold text-base',
          'bg-gold text-skunk-dark',
          'hover:bg-gold-bright transition-all duration-150 active:scale-[0.97]',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
        data-testid="generate-avatar-btn"
      >
        {generating ? 'Generating…' : 'Generate My SKUNK\'D Avatar'}
      </button>

      <p className="text-cream/20 text-[9px] text-center">
        Generates a cartoon cribbage-player caricature in the SKUNK'D style.
      </p>
    </div>
  );
}
