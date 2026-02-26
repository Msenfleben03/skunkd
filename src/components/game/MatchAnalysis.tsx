// Task 6.4: End-of-game match analysis with Cribbage Grade
import { useState } from 'react';
import { callLLM } from '@/lib/gemini';
import { cn } from '@/lib/utils';

interface MatchAnalysisProps {
  playerScore: number;
  opponentScore: number;
  humanWon: boolean;
  handsPlayed?: number;
  skunkType?: 'single' | 'double' | null;
  className?: string;
}

export function MatchAnalysis({
  playerScore,
  opponentScore,
  humanWon,
  handsPlayed,
  skunkType,
  className,
}: MatchAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Extract the Cribbage Grade from the analysis text (format: "Grade: B" or leading "B+:")
  const gradeMatch = analysis?.match(/\b([A-F][+-]?)\b/);
  const grade = gradeMatch?.[1] ?? null;

  const handleAnalyze = async () => {
    if (analysis) { setOpen(o => !o); return; }
    setLoading(true);
    setError(null);
    setOpen(true);

    let skunkDesc = '';
    if (skunkType === 'double') skunkDesc = 'The player was double-skunked (opponent below 61)!';
    else if (skunkType === 'single') skunkDesc = 'The player was skunked (opponent below 91).';

    try {
      const { text } = await callLLM('match_analysis', {
        winner: humanWon ? 'Player' : 'Opponent',
        playerScore,
        opponentScore,
        skunkType: skunkDesc || null,
        handsPlayed: handsPlayed ?? 'unknown',
        stats: `Player ${playerScore} pts vs Opponent ${opponentScore} pts.`,
      });
      setAnalysis(text);
    } catch (e) {
      setError('Sir John Skunkling lost the scoreboard. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Trigger button */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className={cn(
          'w-full rounded-xl py-3 px-4 font-semibold text-sm',
          'border border-white/10 text-cream/60',
          'hover:border-gold/20 hover:text-cream/80 transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && analysis && 'border-gold/20',
        )}
        data-testid="view-analysis-btn"
      >
        {loading ? 'Analysing…' : analysis ? (open ? 'Hide Analysis' : 'View Match Analysis') : 'View Match Analysis'}
      </button>

      {open && (
        <div className="mt-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-3 h-3 rounded-full bg-gold/60 animate-pulse" />
              <span className="text-cream/40 text-xs italic">Sir John Skunkling is judging your game…</span>
            </div>
          )}

          {error && !loading && (
            <p className="text-red-400/70 text-xs text-center py-2">{error}</p>
          )}

          {analysis && !loading && (
            <div
              className="px-4 py-4 rounded-xl border border-gold/15 bg-gold/5 space-y-3"
              data-testid="match-analysis-content"
              aria-live="polite"
            >
              {/* Grade badge */}
              {grade && (
                <div className="flex items-center justify-center">
                  <div
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center',
                      'border-2 border-gold/40 bg-gold/10',
                    )}
                    aria-label={`Cribbage Grade: ${grade}`}
                  >
                    <span
                      className="text-3xl font-black text-gold"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {grade}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] text-gold/60 uppercase tracking-widest mb-1">Sir John Skunkling'S ANALYSIS</p>
                <p className="text-cream/70 text-xs leading-relaxed">{analysis}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
