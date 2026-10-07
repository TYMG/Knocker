import confetti from 'canvas-confetti';
import { colors } from '../theme';
import { isCalm } from './calm';

/**
 * Confetti for the big moments. One function, one name per moment, so every page celebrates the
 * same way. Nothing happens in calm mode.
 *
 *   first       your score went top of a machine's board
 *   seasonHigh  your score is the new season high on a machine (worth 10 bonus points)
 *   challenge   you won a challenge
 *   approved    your sign-up was approved
 *   champion    the League Champion is decided
 *
 * `from` is the element the burst should come out of. Without it the burst starts mid-screen.
 */
export type Moment = 'first' | 'seasonHigh' | 'challenge' | 'approved' | 'champion';

let heartShape: confetti.Shape | undefined;
function heart(): confetti.Shape {
  heartShape ??= confetti.shapeFromPath({ path: 'M10 30 A20 20 0 0 1 50 30 A20 20 0 0 1 90 30 Q90 60 50 90 Q10 60 10 30 Z' });
  return heartShape;
}

function originOf(from?: Element | null) {
  if (!from) return { x: 0.5, y: 0.45 };
  const r = from.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
}

export function celebrate(moment: Moment, from?: Element | null) {
  if (typeof window === 'undefined' || isCalm()) return;
  const origin = originOf(from);
  const base = { origin, disableForReducedMotion: true, zIndex: 2000 };
  const party = [colors.lime, colors.coral, colors.paleYellow, '#ffffff'];

  if (moment === 'first') {
    confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 38, colors: party });
  } else if (moment === 'challenge') {
    confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 40, colors: [colors.lime, colors.coral, '#ffffff'] });
  } else if (moment === 'seasonHigh') {
    const amber = [colors.dmdAmber, colors.coral, '#ffd58a'];
    confetti({ ...base, particleCount: 110, spread: 90, startVelocity: 45, colors: amber });
    window.setTimeout(() => confetti({ ...base, particleCount: 70, spread: 120, startVelocity: 30, colors: amber }), 250);
  } else if (moment === 'approved') {
    confetti({ ...base, particleCount: 36, spread: 80, startVelocity: 32, scalar: 2.2, shapes: [heart()], colors: [colors.coral, '#ff9aa2', '#ffffff'] });
  } else {
    // Champion: both sides of the screen fire for three seconds.
    const until = Date.now() + 3000;
    const fire = () => {
      confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: party, disableForReducedMotion: true, zIndex: 2000 });
      confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: party, disableForReducedMotion: true, zIndex: 2000 });
      if (Date.now() < until && !isCalm()) window.requestAnimationFrame(fire);
    };
    fire();
  }
}

/**
 * Celebrate something once per browser tab, however many times the page is opened.
 * `key` names the thing, e.g. `challenge:c12`. Returns true the one time it fires.
 */
export function celebrateOnce(key: string, moment: Moment, from?: Element | null): boolean {
  const name = `sfi-cheered:${key}`;
  try {
    if (window.sessionStorage.getItem(name)) return false;
    window.sessionStorage.setItem(name, '1');
  } catch {
    // Storage can be blocked (private windows). Celebrating twice is better than not at all.
  }
  celebrate(moment, from);
  return true;
}
