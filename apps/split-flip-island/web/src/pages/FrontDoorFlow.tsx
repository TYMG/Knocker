// The front door's scroll show (Build Plan phase 6), drawn with GSAP and its ScrollTrigger and
// MotionPath plugins. This file is lazy-loaded from FrontDoor.tsx, so GSAP only downloads for
// people who see the front door, and never in calm mode.
//
//   6.1 the title letters drop in when the page opens
//   6.2 a ball rolls down a lane through the sections as you scroll
//   6.3 two flippers at the bottom swing as the ball gets there
//   6.4 every drawn piece is a named slot, ready for Matt's Illustrator drawings:
//         ball            the ball               (StandIns.Ball below)
//         flipper-left    the left flipper       (StandIns.FlipperLeft)
//         flipper-right   the right flipper      (StandIns.FlipperRight)
//         ball-path       the lane the ball follows. Worked out from the page's size, so it
//                         stays a path in code, not a drawing.
//       How to drop a drawing in: docs/front-door-drawings.md in the repo.

import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import { colors } from '../theme';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);

/** Ball size in pixels. Keep a drawing's ball square. */
const BALL = 22;
/** Flipper size: each is drawn in a FLIP_W x FLIP_H box, pivot at its outer end. */
const FLIP_W = 74;
const FLIP_H = 22;

// ---------- The stand-ins. Swap each for a drawing; keep the size and the pivot. ----------

const StandIns = {
  /** A plain chrome ball. */
  Ball: () => (
    <svg viewBox="0 0 64 64" width={BALL} height={BALL} aria-hidden="true">
      <defs>
        <radialGradient id="fd-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#d9d6d0" />
          <stop offset="1" stopColor="#4a463f" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#fd-ball)" stroke={colors.black} strokeWidth="3" />
      <ellipse cx="24" cy="20" rx="8" ry="5" fill="#fff" opacity="0.85" />
    </svg>
  ),
  /** Pivot on the left end, tip on the right. */
  FlipperLeft: () => (
    <svg viewBox={`0 0 ${FLIP_W} ${FLIP_H}`} width={FLIP_W} height={FLIP_H} aria-hidden="true">
      <path d={`M11 2 A9 9 0 0 0 11 20 L${FLIP_W - 6} 14 A3 3 0 0 0 ${FLIP_W - 6} 8 Z`} fill={colors.coral} stroke={colors.black} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="3.5" fill={colors.black} />
    </svg>
  ),
  /** The mirror image: pivot on the right end. */
  FlipperRight: () => (
    <svg viewBox={`0 0 ${FLIP_W} ${FLIP_H}`} width={FLIP_W} height={FLIP_H} aria-hidden="true" style={{ transform: 'scaleX(-1)' }}>
      <path d={`M11 2 A9 9 0 0 0 11 20 L${FLIP_W - 6} 14 A3 3 0 0 0 ${FLIP_W - 6} 8 Z`} fill={colors.coral} stroke={colors.black} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="3.5" fill={colors.black} />
    </svg>
  )
};

// ---------- The lane ----------

/**
 * The lane, in page pixels: from the top right of the hero, swinging side to side down the
 * margins, ending between the flippers. Rebuilt whenever the page changes size.
 */
function lanePath(w: number, h: number): string {
  const edge = BALL;
  const left = edge;
  const right = w - edge;
  const top = 96;
  const end = h - 70;
  const turns = Math.max(2, Math.round((end - top) / 520));
  const step = (end - top) / turns;
  let d = `M${right} ${top}`;
  for (let i = 1; i <= turns; i++) {
    const y0 = top + (i - 1) * step;
    const y1 = top + i * step;
    const from = i % 2 === 1 ? right : left;
    const to = i === turns ? w / 2 : i % 2 === 1 ? left : right;
    d += ` C${from} ${y0 + step * 0.55} ${to} ${y1 - step * 0.55} ${to} ${y1}`;
  }
  return d;
}

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const watch = new ResizeObserver(() => setSize({ w: node.offsetWidth, h: node.offsetHeight }));
    watch.observe(node);
    return () => watch.disconnect();
  }, [ref]);
  return size;
}

/** Lays the show over the front door. `page` is the box that holds the whole front door. */
export default function FrontDoorFlow({ page }: { page: RefObject<HTMLDivElement | null> }) {
  const layer = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(page);

  // 6.1 The title letters drop in, one after another, with a little bounce.
  useGSAP(() => {
    const letters = page.current?.querySelectorAll('.fd-letter');
    if (!letters?.length) return;
    gsap.from(letters, { y: -90, rotation: () => gsap.utils.random(-25, 25), opacity: 0, duration: 0.7, ease: 'bounce.out', stagger: 0.04, delay: 0.15 });
  }, { scope: page });

  // 6.2 and 6.3: the ball rides the lane with the scroll; the flippers flip at the bottom.
  useGSAP(
    () => {
      if (!w || !h) return;
      const ball = layer.current?.querySelector('[data-slot="ball"]');
      const left = layer.current?.querySelector('[data-slot="flipper-left"]');
      const right = layer.current?.querySelector('[data-slot="flipper-right"]');
      if (!ball || !left || !right) return;

      gsap.set(left, { transformOrigin: `${11}px ${FLIP_H / 2}px` });
      gsap.set(right, { transformOrigin: `${FLIP_W - 11}px ${FLIP_H / 2}px` });
      const flip = gsap.timeline({ paused: true })
        .to(left, { rotation: -32, duration: 0.09, ease: 'power2.out' }, 0)
        .to(right, { rotation: 32, duration: 0.09, ease: 'power2.out' }, 0);

      gsap.to(ball, {
        motionPath: { path: '[data-slot="ball-path"]', align: '[data-slot="ball-path"]', alignOrigin: [0.5, 0.5] },
        rotation: 1080,
        ease: 'none',
        scrollTrigger: {
          trigger: page.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (st) => (st.progress > 0.97 ? flip.play() : flip.reverse())
        }
      });
      ScrollTrigger.refresh();
    },
    { scope: layer, dependencies: [w, h], revertOnUpdate: true }
  );

  if (!w || !h) return null;
  const d = lanePath(w, h);
  return (
    <div ref={layer} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
      <svg width={w} height={h} style={{ position: 'absolute', inset: 0 }}>
        {/* The lane is drawn faintly so the ball's route reads as a lane. */}
        <path data-slot="ball-path" d={d} fill="none" stroke={colors.sand} strokeOpacity={0.28} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round" />
      </svg>
      <div data-slot="flipper-left" style={{ position: 'absolute', left: w / 2 - FLIP_W - 6, top: h - 52, width: FLIP_W, height: FLIP_H, rotate: '18deg' }}>
        <StandIns.FlipperLeft />
      </div>
      <div data-slot="flipper-right" style={{ position: 'absolute', left: w / 2 + 6, top: h - 52, width: FLIP_W, height: FLIP_H, rotate: '-18deg' }}>
        <StandIns.FlipperRight />
      </div>
      <div data-slot="ball" style={{ position: 'absolute', left: 0, top: 0, width: BALL, height: BALL }}>
        <StandIns.Ball />
      </div>
    </div>
  );
}
