// Two-step log-in for admins: a 6-digit code from an authenticator app (Google Authenticator,
// 1Password, Authy...), RFC 6238 with the settings every app uses: SHA-1, 30 seconds, 6 digits.
// Decided Oct 30 (Matt: "two-step login with Google Authenticator").
//
// The shared secret is kept sealed (AES-256-GCM, key derived from TOKEN_SECRET), so a copy of the
// table alone can't make codes. Each code works once: the step it was made in is saved, and a
// code from that step or earlier is refused.

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from './util.js';

const STEP_SECONDS = 30;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** A new secret: 20 random bytes, written the way authenticator apps expect (base32). */
export const newSecret = () => base32(randomBytes(20));

export const stepAt = (ms: number) => Math.floor(ms / 1000 / STEP_SECONDS);

/** The 6-digit code for one 30-second step. */
export function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', fromBase32(secret)).update(counter).digest();
  const at = mac[mac.length - 1]! & 15;
  const n = (mac.readUInt32BE(at) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, '0');
}

/**
 * The step a typed code belongs to, or null. Allows one step either side for a phone clock
 * that's a little off, and refuses any step at or before `usedStep` (a code is good once).
 */
export function checkCode(secret: string, typed: string, now: number, usedStep = 0): number | null {
  const code = String(typed ?? '').replace(/\D/g, '');
  if (code.length !== 6) return null;
  const here = stepAt(now);
  for (const step of [here, here - 1, here + 1]) {
    if (step > usedStep && codeAt(secret, step) === code) return step;
  }
  return null;
}

const sealKey = () => createHmac('sha256', env('TOKEN_SECRET')).update('admin-2fa-seal').digest();

/** Seals a secret for the table. */
export function seal(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey(), iv);
  const body = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

/** Opens a sealed secret; '' if it was tampered with or sealed with another key. */
export function unseal(sealed: string | undefined): string {
  const [v, iv, tag, body] = String(sealed ?? '').split('.');
  if (v !== 'v1' || !iv || !tag || !body) return '';
  try {
    const decipher = createDecipheriv('aes-256-gcm', sealKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

const ISSUER = 'Split Flipper Island';

/** The link an authenticator app opens to add the account (tap it on the phone with the app). */
export const otpauthLink = (name: string, secret: string) =>
  `otpauth://totp/${encodeURIComponent(`${ISSUER}:${name}`)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
