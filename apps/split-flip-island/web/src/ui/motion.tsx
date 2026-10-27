// Movement built with Motion: things slide to their new places, ease in, and give when pressed.
// Calm mode (Effects off in Settings, or the phone's own reduce-motion setting) turns all of it off.

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { useCalm } from '../hooks';

/** The spring rows and cards travel on: quick, with a soft landing and no bounce. */
export const glide = { type: 'spring', stiffness: 420, damping: 38 } as const;

/** A block that slides to its new place when things around it move, and eases in when it first appears. */
export function Slide({ children, enter = false }: { children: ReactNode; enter?: boolean }) {
  const calm = useCalm();
  if (calm) return <div>{children}</div>;
  return (
    <motion.div layout="position" transition={glide} initial={enter ? { opacity: 0, y: -10 } : false} animate={{ opacity: 1, y: 0 }}>
      {children}
    </motion.div>
  );
}

/** What is inside a pop-up eases up into place. */
export function PopIn({ children }: { children: ReactNode }) {
  const calm = useCalm();
  if (calm) return <>{children}</>;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
      {children}
    </motion.div>
  );
}
