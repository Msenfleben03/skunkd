interface Props {
  playerScore: number;
  aiScore: number;
  dealer: 'player' | 'ai';
  showBoard: boolean;
  onToggleBoard: () => void;
}

export function ScorePanel({ playerScore, aiScore, dealer, showBoard, onToggleBoard }: Props) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 bg-walnut relative z-20 border-b border-border cursor-pointer"
      onClick={onToggleBoard}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gold shadow-sm" />
          <span className="text-sm font-bold text-foreground tabular-nums">You: {playerScore}</span>
          {dealer === 'player' && <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">D</span>}
        </div>
        <span className="text-muted-foreground/40">|</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-secondary shadow-sm" />
          <span className="text-sm font-bold text-foreground tabular-nums">AI: {aiScore}</span>
          {dealer === 'ai' && <span className="text-[9px] text-muted-foreground bg-muted px-1 rounded">D</span>}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{showBoard ? '▲ Board' : '▼ Board'}</span>
    </div>
  );
}
