import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { motion } from 'motion/react';
import { useCalm } from '../hooks';
import { glide } from './motion';

/**
 * A list whose rows slide to their new places when the order changes, instead of jumping.
 * Used for standings, so a new score visibly moves a team up the table. Motion does the sliding.
 */
export default function MovingList<T>({ items, keyOf, children }: { items: T[]; keyOf: (item: T) => string; children: (item: T, index: number) => ReactNode }) {
  const calm = useCalm();
  return (
    <Box sx={{ position: 'relative' }}>
      {items.map((item, i) => (
        <Box component={motion.div} layout={calm ? false : 'position'} transition={glide} key={keyOf(item)} sx={{ position: 'relative', '& + &': { borderTop: 1, borderColor: 'divider' } }}>
          {children(item, i)}
        </Box>
      ))}
    </Box>
  );
}
