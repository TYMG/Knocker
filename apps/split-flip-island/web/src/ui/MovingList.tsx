import { useLayoutEffect, useRef, type ReactNode } from 'react';
import Box from '@mui/material/Box';

/**
 * A list whose rows slide to their new places when the order changes, instead of jumping.
 * Used for standings, so a new score visibly moves a team up the table.
 */
export default function MovingList<T>({ items, keyOf, children }: { items: T[]; keyOf: (item: T) => string; children: (item: T, index: number) => ReactNode }) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const next = new Map<string, number>();
    for (const [key, node] of nodes.current) {
      const top = node.offsetTop;
      next.set(key, top);
      const before = tops.current.get(key);
      if (!still && before !== undefined && before !== top && typeof node.animate === 'function') {
        node.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], { duration: 550, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      }
    }
    tops.current = next;
  });

  return (
    <Box sx={{ position: 'relative' }}>
      {items.map((item, i) => {
        const key = keyOf(item);
        return (
          <Box
            key={key}
            ref={(node: HTMLElement | null) => {
              if (node) nodes.current.set(key, node);
              else nodes.current.delete(key);
            }}
            sx={{ position: 'relative', '& + &': { borderTop: 1, borderColor: 'divider' } }}
          >
            {children(item, i)}
          </Box>
        );
      })}
    </Box>
  );
}
