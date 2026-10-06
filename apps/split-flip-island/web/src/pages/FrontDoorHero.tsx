// The drawn background for the front door's hero: a dark bar at night with a row of pinball
// machines. There is no photo of the bar yet, so this stands in for one. When a real photo
// arrives, replace HeroFar with it and keep (or drop) HeroMachines.
//
// It is drawn as two separate layers so the front door can slide them at different speeds as
// the page scrolls (see FrontDoor.tsx). Both are decoration only and hidden from screen readers.

import { colors } from '../theme';

// The backglass colors, in the order the machines repeat them. Brand colors only.
const TINTS = [colors.coral, colors.lime, colors.paleYellow, colors.dmdAmber];

// Both drawings are wider than any phone. `slice` keeps the middle and crops the sides, so a
// phone shows about three machines and a desktop shows eight or nine without anything stretching.
const WIDTH = 1600;

/** Soft round glows, one per tint, shared by everything in a drawing. */
function Glows({ prefix }: { prefix: string }) {
  return (
    <defs>
      {TINTS.map((tint, i) => (
        <radialGradient key={tint} id={`${prefix}-${i}`}>
          <stop offset="0" stopColor={tint} stopOpacity={0.42} />
          <stop offset="1" stopColor={tint} stopOpacity={0} />
        </radialGradient>
      ))}
    </defs>
  );
}

/** The back wall: colored haze from the room and a string of lights. Moves slowest. */
export function HeroFar() {
  // Swags of lights, hung so that the middle of the picture (all a phone shows) is the low point
  // of a swag and not a hook. Each bulb sits on the curve y = top + sag * 4t(1 - t).
  const top = 16;
  const sag = 34;
  const span = WIDTH / 4;
  const starts = [-0.5, 0.5, 1.5, 2.5, 3.5].map((s) => s * span);
  const bulbs: { x: number; y: number }[] = [];
  for (const x0 of starts) {
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) bulbs.push({ x: x0 + t * span, y: top + sag * 4 * t * (1 - t) });
  }
  const wire = `M${starts[0]} ${top} ` + starts.map((x0) => `Q${x0 + span / 2} ${top + sag * 2} ${x0 + span} ${top}`).join(' ');

  return (
    <svg className="hero-far" viewBox={`0 0 ${WIDTH} 700`} preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <Glows prefix="sfi-far" />
      <defs>
        <linearGradient id="sfi-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.black} />
          <stop offset="0.7" stopColor={colors.card} />
          <stop offset="1" stopColor={colors.black} />
        </linearGradient>
      </defs>
      <rect width={WIDTH} height={700} fill="url(#sfi-wall)" />
      {/* Light spilling up the wall from the machines */}
      <ellipse cx={560} cy={600} rx={520} ry={330} fill="url(#sfi-far-0)" opacity={0.5} />
      <ellipse cx={1040} cy={620} rx={480} ry={300} fill="url(#sfi-far-1)" opacity={0.3} />
      {/* String lights */}
      <path d={wire} fill="none" stroke={colors.sand} strokeOpacity={0.45} strokeWidth={1.5} />
      {bulbs.map((b) => (
        <g key={b.x}>
          <circle cx={b.x} cy={b.y + 5} r={15} fill="url(#sfi-far-2)" />
          <circle cx={b.x} cy={b.y + 5} r={3.2} fill={colors.paleYellow} />
        </g>
      ))}
    </svg>
  );
}

/** One machine seen from the player's side: lit backglass, playfield, cabinet, legs. 120 wide, 262 tall. */
function Cabinet({ x, n }: { x: number; n: number }) {
  const tint = TINTS[n % TINTS.length]!;
  const glow = `url(#sfi-mid-${n % TINTS.length})`;
  const edge = { stroke: colors.sand, strokeOpacity: 0.34, strokeWidth: 1.5 };
  return (
    <g transform={`translate(${x} 30)`}>
      {/* Glow around the backglass, and its reflection on the floor. The glow stays inside the
          drawing: if it reached the top edge it would be cut off in a visible straight line. */}
      <ellipse cx={60} cy={40} rx={120} ry={68} fill={glow} />
      <ellipse cx={60} cy={262} rx={86} ry={11} fill={glow} opacity={0.7} />
      {/* Legs */}
      <path d="M17 204 L10 260 M103 204 L110 260" fill="none" stroke={colors.sand} strokeOpacity={0.4} strokeWidth={5} strokeLinecap="round" />
      {/* Playfield, with a few lit inserts and the two flippers */}
      <path d="M18 92 H102 L112 150 H8 Z" fill={colors.black} {...edge} />
      <circle cx={42} cy={108} r={3} fill={tint} opacity={0.75} />
      <circle cx={66} cy={102} r={2.4} fill={colors.paleYellow} opacity={0.7} />
      <circle cx={82} cy={116} r={3} fill={tint} opacity={0.6} />
      <circle cx={34} cy={126} r={2.4} fill={colors.paleYellow} opacity={0.5} />
      <path d="M40 136 L55 143 M80 136 L65 143" fill="none" stroke={colors.paleYellow} strokeOpacity={0.85} strokeWidth={3.5} strokeLinecap="round" />
      {/* Cabinet front: coin door and start button */}
      <rect x={8} y={150} width={104} height={58} fill={colors.card} {...edge} />
      <rect x={46} y={164} width={28} height={32} rx={2} fill="none" {...edge} />
      <circle cx={23} cy={163} r={3.5} fill={colors.lime} opacity={0.9} />
      {/* Backbox and backglass. The dark shapes are made-up art, different on each machine. */}
      <rect x={10} y={0} width={100} height={92} rx={5} fill={colors.card} {...edge} />
      <rect x={17} y={7} width={86} height={58} rx={2} fill={tint} opacity={0.86} />
      <g fill={colors.black} opacity={0.6}>
        {n % 3 === 0 && (
          <>
            <circle cx={60} cy={34} r={15} />
            <path d="M17 52 H103 V65 H17 Z" />
          </>
        )}
        {n % 3 === 1 && <path d="M17 65 L42 26 L58 48 L74 18 L103 65 Z" />}
        {n % 3 === 2 && (
          <>
            <path d="M17 20 H103 V27 H17 Z M17 36 H103 V43 H17 Z" />
            <circle cx={38} cy={54} r={7} />
            <circle cx={82} cy={54} r={7} />
          </>
        )}
      </g>
      {/* Score display */}
      <rect x={26} y={72} width={68} height={12} rx={2} fill={colors.dmdGlass} />
      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
        <rect key={d} x={32 + d * 8.4} y={75.5} width={5} height={5} fill={colors.dmdAmber} opacity={d === (n * 3) % 7 ? 0.25 : 0.9} />
      ))}
    </g>
  );
}

/** The row of machines along the floor. Moves faster than the wall and slower than the words. */
export function HeroMachines() {
  const gap = 150;
  // Eleven machines, the middle one centered, so a narrow screen never crops a machine in half at its center.
  const machines = Array.from({ length: 11 }, (_, i) => WIDTH / 2 - 60 + (i - 5) * gap);
  return (
    <svg className="hero-mid" viewBox={`0 0 ${WIDTH} 300`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <Glows prefix="sfi-mid" />
      {/* The floor */}
      <rect x={0} y={288} width={WIDTH} height={12} fill={colors.black} />
      <path d={`M0 288 H${WIDTH}`} stroke={colors.sand} strokeOpacity={0.25} strokeWidth={1} />
      {machines.map((x, i) => (
        <Cabinet key={x} x={x} n={i} />
      ))}
    </svg>
  );
}
