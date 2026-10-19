import { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';
import { useCalm } from '../hooks';

// tsParticles only downloads when a page actually shows the balls.
const PinballField = lazy(() => import('./pinballs/PinballField'));

/**
 * A few pinballs drifting behind the page (Build Plan phase 5). Calm mode turns them off.
 *
 * It sits one layer below the page. The box it lives in needs `isolation: 'isolate'` so the
 * balls stay above that box's own background but behind the cards on the page.
 *
 *   fixed   pinned to the screen while the page scrolls (normal pages)
 *   lively  the bar TV version
 */
export default function PinballBackground({ lively = false, fixed = true }: { lively?: boolean; fixed?: boolean }) {
  const calm = useCalm();
  if (calm) return null;
  return (
    <Box aria-hidden sx={{ position: fixed ? 'fixed' : 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
      <Suspense fallback={null}>
        <PinballField lively={lively} />
      </Suspense>
    </Box>
  );
}
