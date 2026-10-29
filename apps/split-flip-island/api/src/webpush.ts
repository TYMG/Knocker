// Sending one Web Push message (RFC 8030), encrypted for the phone (RFC 8291, aes128gcm) and
// signed for the push service (VAPID, RFC 8292). Done with Node's own crypto, so no extra library.
// The league's VAPID key is an EC P-256 private key (PEM) made by Terraform and given to the
// function as VAPID_PRIVATE_KEY; the public key is worked out from it.
import { createCipheriv, createECDH, createHmac, createPrivateKey, createPublicKey, randomBytes, sign, type KeyObject } from 'node:crypto';

export interface PushSub { endpoint: string; p256dh: string; auth: string }

const b64url = (b: Buffer) => b.toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url');

let keys: { priv: KeyObject; publicRaw: Buffer } | null = null;
function vapid() {
  if (keys) return keys;
  const pem = process.env.VAPID_PRIVATE_KEY;
  if (!pem) throw new Error('VAPID_PRIVATE_KEY is not set');
  const priv = createPrivateKey(pem);
  const jwk = createPublicKey(priv).export({ format: 'jwk' }) as { x: string; y: string };
  keys = { priv, publicRaw: Buffer.concat([Buffer.from([4]), unb64(jwk.x), unb64(jwk.y)]) };
  return keys;
}

export const pushOn = () => !!process.env.VAPID_PRIVATE_KEY;
/** The public key a phone subscribes with (base64url, uncompressed point). */
export const vapidPublicKey = () => b64url(vapid().publicRaw);
/** For tests: forget the cached key after the env var changes. */
export const resetVapidCache = () => { keys = null; };

const hmac = (key: Buffer, data: Buffer) => createHmac('sha256', key).update(data).digest();
/** HKDF with one output block (up to 32 bytes), which is all Web Push needs. */
const hkdf = (salt: Buffer, ikm: Buffer, info: Buffer, length: number) => hmac(hmac(salt, ikm), Buffer.concat([info, Buffer.from([1])])).subarray(0, length);

/** The encrypted body for one phone: header (salt, record size, our public key) then the ciphertext. */
export function encryptPayload(sub: Pick<PushSub, 'p256dh' | 'auth'>, payload: Buffer, salt = randomBytes(16)): Buffer {
  const uaPublic = unb64(sub.p256dh);
  const authSecret = unb64(sub.auth);
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = hkdf(authSecret, shared, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic]), 32);
  const cek = hkdf(salt, ikm, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
  const nonce = hkdf(salt, ikm, Buffer.from('Content-Encoding: nonce\0'), 12);
  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  // One record: the message, then the "last record" delimiter.
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

/** The VAPID header: a short-lived token, signed with our key, for this push service. */
export function vapidAuthorization(endpoint: string, now = Date.now()): string {
  const { priv, publicRaw } = vapid();
  const header = b64url(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(Buffer.from(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: 'https://split-flip-island.knckr.com' })));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), { key: priv, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${b64url(publicRaw)}`;
}

/** Push services the league will send to. Anything else is refused, so nobody can make the server call an address of their choosing. */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/];
export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname)) && endpoint.length <= 1000;
  } catch {
    return false;
  }
}

/** Sends one message. Returns 'gone' when the phone has turned notifications off (remove it). */
export async function sendPush(sub: PushSub, message: object, ttlSeconds = 600): Promise<'sent' | 'gone' | 'failed'> {
  if (!isPushEndpoint(sub.endpoint)) return 'gone';
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidAuthorization(sub.endpoint),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(ttlSeconds),
      Urgency: 'high'
    },
    body: new Uint8Array(encryptPayload(sub, Buffer.from(JSON.stringify(message)))),
    signal: AbortSignal.timeout(4000)
  });
  if (res.status === 404 || res.status === 410) return 'gone';
  return res.ok ? 'sent' : 'failed';
}
