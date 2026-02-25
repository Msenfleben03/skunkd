import { Card, ScoreBreakdown } from '@/engine/types';
import { GameCard } from './GameCard';

interface Props {
  label: string;
  cards: Card[];
  starter: Card;
  scoring: ScoreBreakdown;
}

export function ShowScoring({ label, cards, starter, scoring }: Props) {
  const items = [
    { label: 'Fifteens', value: scoring.fifteens },
    { label: 'Pairs', value: scoring.pairs },
    { label: 'Runs', value: scoring.runs },
    { label: 'Flush', value: scoring.flush },
    { label: 'Nobs', value: scoring.nobs },
  ].filter(i => i.value > 0);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 relative z-10 px-4 animate-fade-up">
      <h3 className="font-display text-lg text-primary">{label}</h3>

      <div className="flex gap-1.5 items-end">
        {cards.map(c => <GameCard key={c.id} card={c} mini />)}
        <div className="ml-2 flex flex-col items-center gap-0.5">
          <span className="text-[8px] text-muted-foreground uppercase">Cut</span>
          <GameCard card={starter} mini />
        </div>
      </div>

      <div className="bg-walnut/80 rounded-xl px-5 py-3 min-w-[200px] border border-border">
        {items.length > 0 ? items.map(i => (
          <div key={i.label} className="flex justify-between text-sm py-0.5">
            <span className="text-muted-foreground">{i.label}</span>
            <span className="text-foreground font-semibold tabular-nums">{i.value}</span>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground text-center py-1">Nineteen! (That's zero, mate) 😬</p>
        )}
        <div className="border-t border-border mt-1.5 pt-1.5 flex justify-between font-bold text-base">
          <span className="text-primary">Total</span>
          <span className="text-primary tabular-nums">{scoring.total}</span>
        </div>
      </div>
    </div>
  );
}
