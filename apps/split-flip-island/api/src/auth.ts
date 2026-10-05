import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { env, HttpError } from './util.js';

const TOKEN_DAYS = 60;

interface TokenPayload {
  teamId: string;
  leagueId: string;
  exp: number;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');

function sign(data: string) {
  return createHmac('sha256', env('TOKEN_SECRET')).update(data).digest('base64url');
}

export function issueToken(teamId: string, leagueId: string): string {
  const payload: TokenPayload = { teamId, leagueId, exp: Date.now() + TOKEN_DAYS * 86_400_000 };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function readToken(event: APIGatewayProxyEventV2): TokenPayload | null {
  const header = event.headers['x-team-token'];
  if (!header) return null;
  const [body, sig] = header.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function requireTeam(event: APIGatewayProxyEventV2): TokenPayload {
  const token = readToken(event);
  if (!token) throw new HttpError(401, 'Log in with your team name and PIN.');
  return token;
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(pin, Buffer.from(saltHex, 'hex'), 32);
  return timingSafeEqual(hash, Buffer.from(hashHex, 'hex'));
}
