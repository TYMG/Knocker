import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { ResponsiveRadar, type RadarCustomLayerProps } from '@nivo/radar';
import { motion } from 'motion/react';
import { colors } from '../../theme';
import { useNivo } from './nivo';

const KEY = 'Points a night';

/** The dot at each machine. Drawn here, because the library's own moving dots trip over very small numbers. */
function Dots({ data, centerX, centerY, radiusScale, angleStep }: RadarCustomLayerProps<Record<string, unknown>>) {
  const { animate, card } = useNivo();
  return (
    <g transform={`translate(${centerX}, ${centerY})`} style={{ pointerEvents: 'none' }}>
      {data.map((d, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = radiusScale(Number(d[KEY]) || 0);
        const at = { cx: Math.round(Math.cos(angle) * r * 10) / 10, cy: Math.round(Math.sin(angle) * r * 10) / 10 };
        const look = { r: 5, fill: colors.coral, stroke: card, strokeWidth: 2 };
        return animate ? <motion.circle key={i} {...look} initial={{ cx: 0, cy: 0 }} animate={at} transition={{ type: 'spring', stiffness: 120, damping: 16 }} /> : <circle key={i} {...look} {...at} />;
      })}
    </g>
  );
}

/**
 * The Love Dr.'s chart: a team's average points a night on each machine. The further out, the
 * better. It grows from the center when it first appears.
 */
export default function FormRadar({ form, max }: { form: { name: string; average: number }[]; max: number }) {
  const { theme, animate, motionConfig, quiet } = useNivo();
  const [grown, setGrown] = useState(!animate);
  useEffect(() => {
    const timer = window.setTimeout(() => setGrown(true), 120);
    return () => window.clearTimeout(timer);
  }, []);
  const data = form.map((f) => ({ machine: f.name, [KEY]: grown ? Math.round(f.average * 10) / 10 : 0 }));
  return (
    <Box sx={{ height: 260 }} role="img" aria-label={`Average points a night by machine: ${form.map((f) => `${f.name} ${f.average.toFixed(1)}`).join(', ')}.`}>
      <ResponsiveRadar
        data={data}
        keys={[KEY]}
        indexBy="machine"
        maxValue={max}
        theme={theme}
        animate={animate}
        motionConfig={motionConfig}
        margin={{ top: 30, right: 70, bottom: 30, left: 70 }}
        curve="linearClosed"
        gridShape="linear"
        gridLevels={4}
        gridLabelOffset={12}
        // Drawn plainly: the library's own moving labels trip over very small numbers.
        gridLabel={({ id, anchor, x, y }) => (
          <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" style={{ fontSize: 12, fill: quiet }}>
            {id}
          </text>
        )}
        colors={[colors.coral]}
        fillOpacity={0.35}
        borderWidth={2.5}
        enableDots={false}
        layers={['grid', 'layers', 'slices', Dots]}
      />
    </Box>
  );
}
