// Phone notifications on this phone (Web Push), for the live league. The service worker
// (public/sw.js) shows them; the server decides what to send (api/src/push.ts).
// iPhones only allow them in the app added to the Home Screen (iOS 16.4 and later).
import { live } from './client';

export type PushState = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';

const supported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Starts the service worker. Safe to call on every load; it does nothing where it can't run. */
export function registerWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register('/sw.js').catch(() => { /* notifications just won't be offered */ });
}

async function subscription(): Promise<PushSubscription | null> {
  if (!supported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return isIos() && !installed() ? 'needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return (await subscription()) ? 'on' : 'off';
}

const keyBytes = (b64url: string) => {
  const raw = atob(b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Asks for permission (the phone's own prompt), subscribes, and tells the server who this phone is. */
export async function turnOn(): Promise<PushState> {
  if (!supported()) return pushState();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const { publicKey } = await live.pushKey();
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  await live.pushSubscribe(sub.toJSON());
  return 'on';
}

export async function turnOff(): Promise<PushState> {
  const sub = await subscription();
  if (sub) {
    await live.pushUnsubscribe(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe();
  }
  return pushState();
}

/** After logging in as someone else (or a solo player becoming a team), this phone's notifications follow. */
export async function resendPush(): Promise<void> {
  try {
    const sub = await subscription();
    if (sub && Notification.permission === 'granted') await live.pushSubscribe(sub.toJSON());
  } catch { /* not logged in yet, or offline: tried again next time */ }
}
