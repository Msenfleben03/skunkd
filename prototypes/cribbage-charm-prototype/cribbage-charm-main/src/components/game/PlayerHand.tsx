import { Card, cardValue, rankOrder } from '@/engine/types';
import { GameCard } from './GameCard';

interface Props {
  cards: Card[];
  selectedCards: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  peggingCount?: number;
  dealing?: boolean;
}

export function PlayerHand({ cards, selectedCards, onSelect, disabled, peggingCount, dealing }: Props) {
  const sorted = [...cards].sort((a, b) => rankOrder(a) - rankOrder(b));
  const n = sorted.length;
  const maxAngle = Math.min(n * 4, 20);
  const startAngle = -maxAngle / 2;
  const step = n > 1 ? maxAngle / (n - 1) : 0;

  return (
    <div className="relative flex items-end justify-center h-[125px] px-4 pb-1">
      {sorted.map((card, i) => {
        const angle = startAngle + i * step;
        const yOff = Math.abs(angle) * 0.5;
        const sel = selectedCards.includes(card.id);
        const unplayable = peggingCount !== undefined && cardValue(card) + peggingCount > 31;

        return (
          <GameCard
            key={card.id}
            card={card}
            selected={sel}
            dimmed={!disabled && unplayable}
            onClick={() => !disabled && !unplayable && onSelect(card.id)}
            className={dealing ? 'animate-deal' : ''}
            style={{
              transform: `rotate(${angle}deg) translateY(${yOff}px)`,
              transformOrigin: 'bottom center',
              zIndex: sel ? 20 : i,
              marginLeft: i === 0 ? 0 : '-10px',
              animationDelay: dealing ? `${i * 80}ms` : undefined,
              cursor: disabled || unplayable ? 'default' : 'pointer',
            }}
          />
        );
      })}
    </div>
  );
}
