import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, table } from './db.js';
import { env, HttpError } from './util.js';

const TOKEN_DAYS = 60;
const ADMIN_TOKEN_HOURS = 12;

interface TokenPayload {
  teamId: string;
  leagueId: string;
  exp: number;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url');
// Token bodies are strict base64url. Checking that first keeps a body signed for one kind of
// token (admin bodies are signed with an "admin:" prefix) from ever being read as the other.
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function parsePayload<T>(body: string): T | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return value && typeof value === 'object' ? (value as T) : null;
  } catch {
    return null;
  }
}

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
  if (!body || !sig || !BASE64URL.test(body)) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const payload = parsePayload<TokenPayload>(body);
  if (!payload || typeof payload.teamId !== 'string' || payload.leagueId !== env('LEAGUE_ID') || !(payload.exp > Date.now())) return null;
  return payload;
}

export function requireTeam(event: APIGatewayProxyEventV2): TokenPayload {
  const token = readToken(event);
  if (!token) throw new HttpError(401, 'Log in with your team name and PIN.');
  return token;
}

// ---------- Admin tokens ----------
// Signed with a different prefix than team tokens, so one can never pass as the other.

export interface AdminTokenPayload {
  kind: 'admin';
  name: string;
  leagueId: string;
  /** Matches the account's tokenVersion; a password reset bumps it and ends old sessions. */
  version: number;
  exp: number;
}

const signAdmin = (body: string) => sign(`admin:${body}`);

export function issueAdminToken(name: string, leagueId: string, version: number): string {
  const payload: AdminTokenPayload = { kind: 'admin', name, leagueId, version, exp: Date.now() + ADMIN_TOKEN_HOURS * 3_600_000 };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signAdmin(body)}`;
}

/** Checks the signature and expiry only. The caller must still confirm the account exists. */
export function readAdminToken(event: APIGatewayProxyEventV2): AdminTokenPayload | null {
  const header = event.headers['x-admin-token'];
  if (!header) return null;
  const [body, sig] = header.split('.');
  if (!body || !sig || !BASE64URL.test(body)) return null;
  const expected = Buffer.from(signAdmin(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const payload = parsePayload<AdminTokenPayload>(body);
  if (!payload || payload.kind !== 'admin' || typeof payload.name !== 'string' || !(payload.exp > Date.now())) return null;
  return payload;
}

/** True when both strings are equal, compared in constant time. */
export function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
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
  const stored32 = Buffer.from(hashHex, 'hex');
  return stored32.length === hash.length && timingSafeEqual(hash, stored32);
}

// Admin passwords use the same salted scrypt hash as PINs.
export const hashPassword = hashPin;
export const verifyPassword = verifyPin;

// ---------- Wrong-guess limit, shared by team PINs and admin passwords ----------

export const MAX_LOGIN_FAILURES = 10;
export const LOCKOUT_MS = 15 * 60_000;

const isConditionFailure = (err: unknown) =>
  err instanceof ConditionalCheckFailedException || (err as Error | undefined)?.name === 'ConditionalCheckFailedException';

/**
 * Counts a login attempt against an account BEFORE the secret is checked, in one atomic
 * update, so a burst of parallel guesses can't all slip in under the limit. Returns false
 * when the account is locked (or gone). Call clearLoginStrikes after a correct login.
 */
export async function takeLoginStrike(key: { PK: string; SK: string }, now = Date.now()): Promise<boolean> {
  const count = async (update: string, condition: string, values: Record<string, number>) => {
    try {
      await ddb.send(new UpdateCommand({
        TableName: table(), Key: key, UpdateExpression: update,
        ConditionExpression: `attribute_exists(PK) AND (${condition})`,
        ExpressionAttributeValues: values
      }));
      return true;
    } catch (err) {
      if (isConditionFailure(err)) return false;
      throw err;
    }
  };
  // Normal case: still under the limit.
  if (await count(
    'SET failures = if_not_exists(failures, :zero) + :one, lastFailureAt = :now',
    'attribute_not_exists(failures) OR failures < :max',
    { ':zero': 0, ':one': 1, ':now': now, ':max': MAX_LOGIN_FAILURES }
  )) return true;
  // At the limit: start a fresh count only if the lockout has run out.
  return count('SET failures = :one, lastFailureAt = :now', 'lastFailureAt < :unlockedBefore', { ':one': 1, ':now': now, ':unlockedBefore': now - LOCKOUT_MS });
}

export async function clearLoginStrikes(key: { PK: string; SK: string }): Promise<void> {
  await ddb.send(new UpdateCommand({ TableName: table(), Key: key, UpdateExpression: 'REMOVE failures, lastFailureAt', ConditionExpression: 'attribute_exists(PK)' }))
    .catch((err) => { if (!isConditionFailure(err)) throw err; });
}
