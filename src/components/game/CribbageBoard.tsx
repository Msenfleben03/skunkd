import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface PegPosition {
  /** Hole number the front peg is in (0 = not started, 1–121) */
  front: number;
  /** Hole number the back peg is in (0 = not placed yet) */
  back: number;
}

export interface CribbageBoardProps {
  /** Human player peg positions */
  player: PegPosition;
  /** Opponent peg positions */
  opponent: PegPosition;
  className?: string;
}

// ─── Board geometry ──────────────────────────────────────────────────────────

const VIEWBOX_W = 180;
const VIEWBOX_H = 580;
const BOTTOM_Y = 548;
const TOP_Y = 30;

/**
 * Computes (x, y) for each of the 121 holes along one U-shaped track column pair.
 * Holes go UP the right side (1→60), then DOWN the left side (61→120), then
 * hole 121 is the finish at the bottom-left.
 */
function computeHoles(rightX: number, leftX: number): { x: number; y: number }[] {
  const height = BOTTOM_Y - TOP_Y;

  // Accumulate spacings: every 5th gap gets 1.5× spacing to create group dividers
  const offsets: number[] = [];
  let acc = 0;
  for (let i = 0; i < 60; i++) {
    offsets.push(acc);
    if (i < 59) acc += (i + 1) % 5 === 0 ? 1.5 : 1;
  }
  const maxOff = offsets[59];

  const holes: { x: number; y: number }[] = [];

  // Right column: holes 1–60, going UP
  for (let i = 0; i < 60; i++) {
    holes.push({
      x: rightX,
      y: BOTTOM_Y - (offsets[i] / maxOff) * height,
    });
  }
  // Left column: holes 61–120, going DOWN
  for (let i = 0; i < 60; i++) {
    holes.push({
      x: leftX,
      y: TOP_Y + (offsets[i] / maxOff) * height,
    });
  }
  // Hole 121 — finish hole (index 120 in array)
  holes.push({ x: leftX, y: BOTTOM_Y + 16 });

  return holes;
}

// Player track: inner pair of columns
const PLAYER_RX = 108;
const PLAYER_LX = 70;
// Opponent track: outer pair of columns
const OPP_RX = 140;
const OPP_LX = 38;

// Precompute hole arrays (stable across renders)
const playerHoles = computeHoles(PLAYER_RX, PLAYER_LX);
const oppHoles = computeHoles(OPP_RX, OPP_LX);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders the engraved track groove + hole dots for one track pair */
function Track({
  holes,
  rx,
  lx,
  color,
}: {
  holes: { x: number; y: number }[];
  rx: number;
  lx: number;
  color: string;
}) {
  const r = (rx - lx) / 2;
  return (
    <g>
      {/* Track groove */}
      <path
        d={`M ${rx} ${BOTTOM_Y + 4} V ${TOP_Y} A ${r} ${r} 0 0 0 ${lx} ${TOP_Y} V ${BOTTOM_Y + 4}`}
        stroke={color}
        strokeWidth={18}
        fill="none"
        strokeLinecap="round"
        opacity={0.22}
      />
      {/* Individual holes */}
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={2} fill="url(#holeFill)" />
      ))}
      {/* Group separator lines every 5 holes */}
      {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(n => {
        const rh = holes[n - 1];
        const lh = holes[60 + n - 1];
        return (
          <g key={n}>
            <line x1={rx - 7} y1={rh.y - 3} x2={rx + 7} y2={rh.y - 3}
              stroke={color} strokeWidth={0.5} opacity={0.25} />
            {lh && (
              <line x1={lx - 7} y1={lh.y + 3} x2={lx + 7} y2={lh.y + 3}
                stroke={color} strokeWidth={0.5} opacity={0.25} />
            )}
          </g>
        );
      })}
    </g>
  );
}

/** Renders front + back pegs for one player, with animated movement */
function Pegs({
  holes,
  pos,
  gradId,
}: {
  holes: { x: number; y: number }[];
  pos: PegPosition;
  gradId: string;
}) {
  // Peg animation: transition cx/cy via CSS (works in modern browsers)
  const ease = (duration: number): string =>
    `cx ${duration}s cubic-bezier(0.34,1.56,0.64,1), cy ${duration}s cubic-bezier(0.34,1.56,0.64,1)`;

  const frontIdx = pos.front > 0 && pos.front <= 121 ? pos.front - 1 : null;
  const backIdx = pos.back > 0 && pos.back <= 121 ? pos.back - 1 : null;

  return (
    <g>
      {/* Back peg — smaller, more transparent */}
      {backIdx !== null && (
        <circle
          r={3}
          fill={`url(#${gradId})`}
          opacity={0.5}
          style={
            {
              cx: holes[backIdx].x,
              cy: holes[backIdx].y,
              transition: ease(0.5),
            } as CSSProperties
          }
        />
      )}

      {/* Front peg — glow halo + main peg */}
      {frontIdx !== null && (
        <>
          {/* Soft halo */}
          <circle
            r={6.5}
            fill={`url(#${gradId})`}
            opacity={0.15}
            style={
              {
                cx: holes[frontIdx].x,
                cy: holes[frontIdx].y,
                transition: ease(0.55),
              } as CSSProperties
            }
          />
          {/* Main peg */}
          <circle
            r={4}
            fill={`url(#${gradId})`}
            stroke="#fff"
            strokeWidth={0.7}
            opacity={0.95}
            style={
              {
                cx: holes[frontIdx].x,
                cy: holes[frontIdx].y,
                transition: ease(0.6),
              } as CSSProperties
            }
          />
        </>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/** Scores visible at these hole numbers (right side going up) */
const SCORE_MARKERS_R = [15, 30, 45];
const SCORE_MARKERS_L = [75, 90, 105];

export function CribbageBoard({ player, opponent, className }: CribbageBoardProps) {
  // Skunk and double-skunk line Y positions
  const skunkY = playerHoles[90]?.y ?? 0;   // hole 91
  const dblSkunkY = playerHoles[60]?.y ?? 0; // hole 61

  return (
    <div
      className={cn('flex justify-center relative', className)}
      aria-label="Cribbage board"
      data-testid="cribbage-board"
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-[160px] h-[520px] drop-shadow-xl"
        role="img"
        aria-label={`Cribbage board — You: ${player.front}, Opponent: ${opponent.front}`}
      >
        <defs>
          {/* Wood grain gradient */}
          <linearGradient id="woodBg" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#c89240" />
            <stop offset="30%" stopColor="#a87228" />
            <stop offset="70%" stopColor="#9a6420" />
            <stop offset="100%" stopColor="#c89240" />
          </linearGradient>

          {/* Hole fill — dark depression look */}
          <radialGradient id="holeFill">
            <stop offset="0%" stopColor="#120a04" />
            <stop offset="100%" stopColor="#3a1e0c" stopOpacity={0.6} />
          </radialGradient>

          {/* Player peg: warm gold */}
          <radialGradient id="goldPeg">
            <stop offset="0%" stopColor="#ffe898" />
            <stop offset="60%" stopColor="#d4a843" />
            <stop offset="100%" stopColor="#a07820" />
          </radialGradient>

          {/* Opponent peg: neon skunk-green */}
          <radialGradient id="greenPeg">
            <stop offset="0%" stopColor="#90ff60" />
            <stop offset="60%" stopColor="#39FF14" />
            <stop offset="100%" stopColor="#1fa80a" />
          </radialGradient>
        </defs>

        {/* ── Board body ─────────────────────────────────────────────── */}
        <rect
          x="4" y="4" width={VIEWBOX_W - 8} height={VIEWBOX_H - 8}
          rx="14"
          fill="url(#woodBg)"
          stroke="#7a5218"
          strokeWidth="2.5"
        />

        {/* Wood grain lines */}
        {Array.from({ length: 18 }, (_, i) => (
          <line
            key={i}
            x1="10" y1={28 + i * 30} x2={VIEWBOX_W - 10} y2={31 + i * 30}
            stroke="#9a7230"
            strokeWidth="0.5"
            opacity="0.22"
          />
        ))}

        {/* ── Tracks ─────────────────────────────────────────────────── */}
        {/* Opponent track (outer) — green tinted groove */}
        <Track
          holes={oppHoles}
          rx={OPP_RX}
          lx={OPP_LX}
          color="#39FF14"
        />
        {/* Player track (inner) — gold tinted groove */}
        <Track
          holes={playerHoles}
          rx={PLAYER_RX}
          lx={PLAYER_LX}
          color="#d4a843"
        />

        {/* ── Skunk lines ────────────────────────────────────────────── */}
        {/* Skunk at 91 */}
        <line
          x1="16" y1={skunkY}
          x2={VIEWBOX_W - 16} y2={skunkY}
          stroke="#d4a843" strokeWidth="1"
          strokeDasharray="4,3" opacity="0.55"
        />
        <text
          x={VIEWBOX_W - 13} y={skunkY + 3}
          fill="#d4a843" fontSize="7"
          textAnchor="middle" opacity="0.7"
          fontWeight="bold"
        >
          S
        </text>

        {/* Double-skunk at 61 */}
        <line
          x1="16" y1={dblSkunkY}
          x2={VIEWBOX_W - 16} y2={dblSkunkY}
          stroke="#d4a843" strokeWidth="0.8"
          strokeDasharray="3,4" opacity="0.4"
        />
        <text
          x={VIEWBOX_W - 13} y={dblSkunkY + 3}
          fill="#d4a843" fontSize="6"
          textAnchor="middle" opacity="0.55"
          fontWeight="bold"
        >
          2S
        </text>

        {/* ── Score number markers ────────────────────────────────────── */}
        {SCORE_MARKERS_R.map(n => (
          <text
            key={n}
            x={OPP_RX + 15}
            y={(playerHoles[n - 1]?.y ?? 0) + 3}
            fill="#d4a843" fontSize="6"
            opacity="0.45"
            fontFamily="DM Sans, sans-serif"
          >
            {n}
          </text>
        ))}
        {SCORE_MARKERS_L.map(n => (
          <text
            key={n}
            x={OPP_LX - 14}
            y={(playerHoles[n - 1]?.y ?? 0) + 3}
            fill="#d4a843" fontSize="6"
            textAnchor="end" opacity="0.45"
            fontFamily="DM Sans, sans-serif"
          >
            {n}
          </text>
        ))}

        {/* START / 60 / WIN labels */}
        <text
          x={VIEWBOX_W / 2} y={VIEWBOX_H - 8}
          fill="#d4a843" fontSize="7"
          textAnchor="middle" opacity="0.45"
          fontFamily="DM Sans, sans-serif"
        >
          START
        </text>
        <text
          x={VIEWBOX_W / 2} y={TOP_Y - 10}
          fill="#d4a843" fontSize="7"
          textAnchor="middle" opacity="0.45"
          fontFamily="DM Sans, sans-serif"
        >
          60
        </text>
        <text
          x={PLAYER_LX}
          y={(playerHoles[120]?.y ?? BOTTOM_Y) + 13}
          fill="#d4a843" fontSize="6"
          textAnchor="middle" opacity="0.55"
          fontFamily="DM Sans, sans-serif"
        >
          WIN
        </text>

        {/* ── Pegs (with CSS-transition animation) ───────────────────── */}
        {/* Opponent pegs (green, outer track) */}
        <Pegs holes={oppHoles} pos={opponent} gradId="greenPeg" />
        {/* Player pegs (gold, inner track) */}
        <Pegs holes={playerHoles} pos={player} gradId="goldPeg" />
      </svg>
    </div>
  );
}
