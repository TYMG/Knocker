// Movement shared by every chart: point at (or tap) something and it grows while the rest fade,
// with a short ease instead of a jump. The chart library marks the element under the pointer
// with data-highlighted and the others with data-faded; these styles animate those states.
// People who ask their device for less motion get the same highlighting without the movement.

const ease = '260ms cubic-bezier(0.2, 0.8, 0.2, 1)';
/** A little overshoot, so a bubble or dot "pops" rather than slides. */
const pop = '320ms cubic-bezier(0.2, 0.9, 0.3, 1.5)';
const grows = { transformBox: 'fill-box', transformOrigin: 'center' } as const;

export const chartMotion = {
  // What changes, with or without motion.
  '& [data-faded]': { opacity: 0.18 },
  '& .MuiLineChart-line[data-highlighted]': { strokeWidth: 5 },
  '& .MuiLineChart-mark[data-highlighted]': { transform: 'scale(1.6)' },
  '& .MuiScatterChart-marker': { cursor: 'pointer' },
  '& .MuiScatterChart-marker[data-highlighted], & .MuiScatterChart-marker:hover, & .MuiScatterChart-highlightedMark': { transform: 'scale(1.3)' },
  '& .MuiScatterChart-marker:active': { transform: 'scale(0.9)' },
  '& .MuiRadarChart-seriesArea': { fillOpacity: 0.3 },
  '&:hover .MuiRadarChart-seriesArea, & .MuiRadarChart-seriesArea[data-highlighted]': { fillOpacity: 0.55 },
  '&:hover .MuiRadarChart-seriesMark': { transform: 'scale(1.5)' },
  '&:active .MuiRadarChart-seriesArea': { fillOpacity: 0.75 },
  '& .MuiLineChart-mark, & .MuiScatterChart-marker, & .MuiScatterChart-highlightedMark, & .MuiRadarChart-seriesMark, & .MuiRadarChart-axisHighlightDot': grows,

  // How it gets there.
  '@media (prefers-reduced-motion: no-preference)': {
    '& .MuiLineChart-line': { transition: `opacity ${ease}, stroke-width ${ease}` },
    '& .MuiLineChart-mark': { transition: `opacity ${ease}, transform ${pop}` },
    '& .MuiScatterChart-marker, & .MuiScatterChart-highlightedMark': { transition: `opacity ${ease}, transform ${pop}` },
    '& .MuiRadarChart-seriesArea': { transition: `fill-opacity ${ease}, opacity ${ease}` },
    '& .MuiRadarChart-seriesMark, & .MuiRadarChart-axisHighlightDot': { transition: `transform ${pop}, opacity ${ease}` }
  }
} as const;
