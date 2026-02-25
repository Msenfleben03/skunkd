interface Props {
  speech: string;
  isThinking?: boolean;
}

export function AIAvatar({ speech, isThinking }: Props) {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2 min-h-[56px] relative z-10">
      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-base flex-shrink-0 border border-muted-gold/30 shadow-md">
        🦨
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[11px] font-semibold text-muted-foreground">Muggins McGee <span className="font-normal italic opacity-60">· Heir of Suckling</span></span>
        {speech && <div className="speech-bubble mt-1">{speech}</div>}
        {isThinking && !speech && <div className="speech-bubble mt-1 opacity-50">🤔 Consulting the ancestors...</div>}
      </div>
    </div>
  );
}
