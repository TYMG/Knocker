// The 5-minute turn clock, shared by the team's alerts and the admin's Lines page.
import { useEffect, useState } from 'react';
import { TURN_MS } from '../sample/slice';

/** The current time, ticking every second while `active`. */
export function useNow(active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/** Milliseconds left to start, never below 0. */
export const turnLeft = (upAt: number | undefined, now: number) => (upAt ? Math.max(0, upAt + TURN_MS - now) : TURN_MS);

/** 4:05 */
export function mmss(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Admins can quiet the "started" notes. Kept on this device only.
const KEY = 'sfi-admin-blips';
export function blipsMuted(): boolean {
  try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
}
export function setBlipsMuted(muted: boolean) {
  try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch { /* private mode */ }
  window.dispatchEvent(new Event('sfi-blips'));
}
export function useBlipsMuted(): boolean {
  const [muted, set] = useState(blipsMuted);
  useEffect(() => {
    const on = () => set(blipsMuted());
    window.addEventListener('sfi-blips', on);
    return () => window.removeEventListener('sfi-blips', on);
  }, []);
  return muted;
}
