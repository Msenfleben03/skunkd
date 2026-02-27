import { cn } from '@/lib/utils';

interface AveragesBestsProps {
  avgPegging: number;
  bestPegging: number;
  avgHand: number;
  bestHand: number;
  avgCrib: number;
  bestCrib: number;
  className?: string;
}

export function AveragesBests({
  avgPegging,
  bestPegging,
  avgHand,
  bestHand,
  avgCrib,
  bestCrib,
  className,
}: AveragesBestsProps) {
  const rows = [
    { label: 'Pegging', avg: avgPegging, best: bestPegging },
    { label: 'Hand', avg: avgHand, best: bestHand },
    { label: 'Crib', avg: avgCrib, best: bestCrib },
  ];

  return (
    <div
      data-testid="averages-bests"
      className={cn(
        'rounded-xl bg-white/5 border border-white/10 p-4',
        className,
      )}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-cream/40 text-xs uppercase tracking-wider">
            <th className="text-left pb-2 font-medium">Category</th>
            <th className="text-right pb-2 font-medium">AVG</th>
            <th className="text-right pb-2 font-medium">BEST</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, avg, best }) => (
            <tr key={label} className="border-t border-white/5">
              <td className="text-cream/60 py-1.5">{label}</td>
              <td
                className="text-right text-cream/80 tabular-nums py-1.5"
                data-testid={`avg-${label.toLowerCase()}`}
              >
                {avg.toFixed(1)}
              </td>
              <td
                className="text-right font-semibold tabular-nums py-1.5"
                style={{ color: '#d4a843' }}
                data-testid={`best-${label.toLowerCase()}`}
              >
                {best}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
