import { PegPositions } from '@/engine/types';

interface Props {
  pegPositions: PegPositions;
}

// Generate 121 hole positions along a U-shaped path
function computeHoles(rightX: number, leftX: number): { x: number; y: number }[] {
  const holes: { x: number; y: number }[] = [];
  const bottomY = 545;
  const topY = 32;
  const height = bottomY - topY;

  // Compute normalized offsets with group gaps (every 5 holes)
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < 60; i++) {
    offsets.push(acc);
    if (i < 59) acc += (i + 1) % 5 === 0 ? 1.5 : 1;
  }
  const maxOff = offsets[59];

  // Right side going UP (holes 1→60)
  for (let i = 0; i < 60; i++) {
    holes.push({ x: rightX, y: bottomY - (offsets[i] / maxOff) * height });
  }
  // Left side going DOWN (holes 61→120)
  for (let i = 0; i < 60; i++) {
    holes.push({ x: leftX, y: topY + (offsets[i] / maxOff) * height });
  }
  // Finish hole (121)
  holes.push({ x: leftX, y: bottomY + 14 });

  return holes;
}

// Track configurations
const PLAYER_RX = 112, PLAYER_LX = 68;
const AI_RX = 142, AI_LX = 38;
const playerHoles = computeHoles(PLAYER_RX, PLAYER_LX);
const aiHoles = computeHoles(AI_RX, AI_LX);

export function CribbageBoard({ pegPositions }: Props) {
  const renderTrack = (
    holes: { x: number; y: number }[],
    rx: number, lx: number,
    color: string, opacity: number
  ) => {
    const r = (rx - lx) / 2;
    return (
      <g>
        {/* Track background */}
        <path
          d={`M ${rx} 550 V 32 A ${r} ${r} 0 0 0 ${lx} 32 V 560`}
          stroke={color} strokeWidth={20} fill="none" strokeLinecap="round" opacity={opacity}
        />
        {/* Holes */}
        {holes.map((h, i) => (
          <circle key={i} cx={h.x} cy={h.y} r={2.2} fill="url(#holeFill)" />
        ))}
        {/* Group separators - thin lines every 5 holes */}
        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(n => {
          const rightHole = holes[n - 1];
          const leftHole = holes[60 + n - 1];
          return (
            <g key={n}>
              <line x1={rx - 8} y1={rightHole.y - 3.5} x2={rx + 8} y2={rightHole.y - 3.5}
                stroke={color} strokeWidth={0.5} opacity={0.3} />
              {leftHole && (
                <line x1={lx - 8} y1={leftHole.y + 3.5} x2={lx + 8} y2={leftHole.y + 3.5}
                  stroke={color} strokeWidth={0.5} opacity={0.3} />
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const pegEase = (duration: number) =>
    `cx ${duration}s cubic-bezier(0.34,1.56,0.64,1), cy ${duration}s cubic-bezier(0.34,1.56,0.64,1)`;

  const renderPegs = (
    holes: { x: number; y: number }[],
    pos: { front: number; back: number },
    gradId: string
  ) => (
    <g>
      {pos.back > 0 && pos.back <= 121 && (
        <circle r={3.5}
          fill={`url(#${gradId})`} opacity={0.55}
          style={{ cx: holes[pos.back - 1].x, cy: holes[pos.back - 1].y, transition: pegEase(0.5) } as React.CSSProperties} />
      )}
      {pos.front > 0 && pos.front <= 121 && (
        <>
          <circle r={7}
            fill={`url(#${gradId})`} opacity={0.12}
            style={{ cx: holes[pos.front - 1].x, cy: holes[pos.front - 1].y, transition: pegEase(0.5) } as React.CSSProperties} />
          <circle r={4.5}
            fill={`url(#${gradId})`} stroke="#fff" strokeWidth={0.6}
            style={{ cx: holes[pos.front - 1].x, cy: holes[pos.front - 1].y, transition: pegEase(0.6) } as React.CSSProperties} />
        </>
      )}
    </g>
  );

  // Skunk line positions
  const s91y = playerHoles[90]?.y ?? 0;
  const s61y = playerHoles[60]?.y ?? 0;

  return (
    <div className="flex justify-center py-2 relative z-10">
      <svg viewBox="0 0 180 580" className="w-[180px] h-[580px] drop-shadow-lg">
        <defs>
          <linearGradient id="woodBg" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor="#c89440" />
            <stop offset="35%" stopColor="#b07828" />
            <stop offset="65%" stopColor="#a56a20" />
            <stop offset="100%" stopColor="#c89440" />
          </linearGradient>
          <radialGradient id="holeFill">
            <stop offset="0%" stopColor="#1a0f08" />
            <stop offset="100%" stopColor="#3a2010" stopOpacity="0.7" />
          </radialGradient>
          <radialGradient id="goldPeg">
            <stop offset="0%" stopColor="#ffe090" />
            <stop offset="100%" stopColor="#c89430" />
          </radialGradient>
          <radialGradient id="redPeg">
            <stop offset="0%" stopColor="#ff6666" />
            <stop offset="100%" stopColor="#cc2222" />
          </radialGradient>
        </defs>

        {/* Board body */}
        <rect x="5" y="5" width="170" height="570" rx="12" fill="url(#woodBg)" stroke="#8a6020" strokeWidth="2.5" />

        {/* Wood grain lines */}
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1="10" y1={35 + i * 34} x2="170" y2={38 + i * 34}
            stroke="#9a7030" strokeWidth="0.6" opacity="0.25" />
        ))}

        {/* AI track (outer - red) */}
        {renderTrack(aiHoles, AI_RX, AI_LX, '#c04040', 0.28)}

        {/* Player track (inner - blue) */}
        {renderTrack(playerHoles, PLAYER_RX, PLAYER_LX, '#4080c4', 0.32)}

        {/* Skunk lines */}
        <line x1="20" y1={s91y} x2="160" y2={s91y}
          stroke="#d4a843" strokeWidth="1" opacity="0.45" strokeDasharray="4,3" />
        <text x="166" y={s91y + 3} fill="#d4a843" fontSize="7" opacity="0.6" fontWeight="bold">S</text>

        <line x1="20" y1={s61y} x2="160" y2={s61y}
          stroke="#d4a843" strokeWidth="1" opacity="0.45" strokeDasharray="4,3" />
        <text x="163" y={s61y + 3} fill="#d4a843" fontSize="6" opacity="0.6" fontWeight="bold">2S</text>

        {/* Number labels */}
        <text x="90" y="568" fill="#d4a843" fontSize="7" textAnchor="middle" opacity="0.5" fontFamily="DM Sans">START</text>
        <text x="90" y="24" fill="#d4a843" fontSize="7" textAnchor="middle" opacity="0.5" fontFamily="DM Sans">60</text>

        {/* Score number markers along right side */}
        {[15, 30, 45].map(n => (
          <text key={n} x={AI_RX + 16} y={playerHoles[n - 1]?.y + 3} fill="#d4a843" fontSize="6"
            opacity="0.4" fontFamily="DM Sans">{n}</text>
        ))}
        {/* Left side */}
        {[75, 90, 105].map(n => (
          <text key={n} x={AI_LX - 16} y={playerHoles[n - 1]?.y + 3} fill="#d4a843" fontSize="6"
            opacity="0.4" fontFamily="DM Sans" textAnchor="end">{n}</text>
        ))}

        {/* Finish marker */}
        <text x={PLAYER_LX} y={playerHoles[120]?.y + 14} fill="#d4a843" fontSize="6"
          textAnchor="middle" opacity="0.5" fontFamily="DM Sans">WIN</text>

        {/* Pegs */}
        {renderPegs(playerHoles, pegPositions.player, 'goldPeg')}
        {renderPegs(aiHoles, pegPositions.ai, 'redPeg')}
      </svg>
    </div>
  );
}
