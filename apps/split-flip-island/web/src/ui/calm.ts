import { store } from '../store';

/**
 * Calm mode: no confetti, no drifting backgrounds, no pop-ups, no big animations.
 * It is on when someone flips the switch in the top bar, or when their phone or computer is set
 * to reduce motion. Every effect added to the app asks this first.
 *
 * Inside a component, use the `useCalm()` hook from hooks.ts so the page updates when it changes.
 * This plain function is for code that runs outside a component, such as celebrate.ts.
 */
export function isCalm(): boolean {
  if (store.getState().ui.calm) return true;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
