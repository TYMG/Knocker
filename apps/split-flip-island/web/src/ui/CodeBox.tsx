import Box from '@mui/material/Box';

function hash(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A drawn stand-in for the scannable code on a machine sticker or the bar TV. It is not a real
 * code: scanning it does nothing. `to` is where the real one will point.
 */
export default function CodeBox({ to, size = 120 }: { to: string; size?: number }) {
  const n = 13;
  let seed = hash(to) || 1;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) cells.push(next() > 0.5);
  const corner = (x: number, y: number) => (x < 4 && y < 4) || (x >= n - 4 && y < 4) || (x < 4 && y >= n - 4);
  const ring = (x: number, y: number) => {
    const cx = x < 4 ? x : x - (n - 4);
    const cy = y < 4 ? y : y - (n - 4);
    return cx === 0 || cx === 3 || cy === 0 || cy === 3 || (cx > 0 && cx < 3 && cy > 0 && cy < 3);
  };
  return (
    <Box role="img" aria-label={`Code that opens ${to}`} sx={{ width: size, height: size, p: `${size / 14}px`, bgcolor: '#ffffff', borderRadius: 1, flexShrink: 0 }}>
      <svg viewBox={`0 0 ${n} ${n}`} width="100%" height="100%" shapeRendering="crispEdges">
        {cells.map((on, i) => {
          const x = i % n;
          const y = Math.floor(i / n);
          const fill = corner(x, y) ? ring(x, y) : on;
          return fill ? <rect key={i} x={x} y={y} width={1} height={1} fill="#000000" /> : null;
        })}
      </svg>
    </Box>
  );
}
