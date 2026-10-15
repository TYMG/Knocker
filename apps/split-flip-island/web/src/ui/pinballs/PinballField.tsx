// The drifting pinballs (Build Plan phase 5). This file is only downloaded when a page shows the
// background, through the lazy import in ../PinballBackground.tsx, so tsParticles stays out of
// the first load.
//
// The balls are drawn here as a small shiny SVG. When Matt's drawings arrive, swap BALL for his
// file and nothing else needs to change.

import { useMemo } from 'react';
import { Particles, ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Engine, ISourceOptions } from '@tsparticles/engine';

const BALL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#d9d6d0"/><stop offset="0.75" stop-color="#8d877b"/><stop offset="1" stop-color="#4a463f"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#g)"/><ellipse cx="24" cy="20" rx="8" ry="5" fill="#fff" opacity="0.85"/></svg>`
  );

const init = async (engine: Engine) => {
  await loadSlim(engine);
};

export interface PinballFieldProps {
  /** The bar TV: more balls, brighter, faster. Nobody reads small text over them there. */
  lively?: boolean;
}

export default function PinballField({ lively = false }: PinballFieldProps) {
  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      fpsLimit: 60,
      detectRetina: true,
      particles: {
        number: { value: lively ? 18 : 8 },
        shape: { type: 'image', options: { image: { src: BALL, width: 64, height: 64 } } },
        size: { value: lively ? { min: 14, max: 26 } : { min: 9, max: 16 } },
        opacity: { value: lively ? 0.5 : 0.16 },
        move: { enable: true, speed: lively ? 2.2 : 0.7, direction: 'none', straight: false, outModes: { default: 'bounce' } },
        // They knock into each other like real balls.
        collisions: { enable: true, mode: 'bounce' }
      },
      // 5.2: balls scatter away from a finger or the mouse. The canvas ignores taps (the page
      // under it still gets them); the window reports where the finger is.
      interactivity: {
        detectsOn: 'window',
        events: {
          onHover: { enable: !lively, mode: 'repulse' },
          onClick: { enable: !lively, mode: 'repulse' }
        },
        modes: { repulse: { distance: 110, duration: 0.6, speed: 1 } }
      }
    }),
    [lively]
  );

  return (
    <ParticlesProvider init={init}>
      <Particles id={lively ? 'pinballs-tv' : 'pinballs'} options={options} style={{ position: 'absolute', inset: 0 }} />
    </ParticlesProvider>
  );
}
