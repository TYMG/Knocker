// Per-person limits: how often one network address, team, solo player or phone can do something.
// Each limit is a counter in DynamoDB (RATE#<league> / <what>#<who>#<window>) that deletes itself
// after its window (the table's expireAt), so nothing piles up. Counting and checking is one
// atomic update, so a burst of requests at once can't slip past.
//
// These sit on top of the per-account PIN lockout and the server's overall request limit, and
// they're what stops one person (or bot) from guessing PINs, flooding sign-ups or uploads,
// spamming the league, or running up the texting bill.
import { createHmac } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, leagueId, table } from './db.js';
import { env, HttpError } from './util.js';

export interface Limit { max: number; seconds: number }

/** The limits, in one place. */
export const LIMITS = {
  login: { max: 20, seconds: 15 * 60 },            // per address: team and solo log-ins
  adminLogin: { max: 10, seconds: 15 * 60 },       // per address
  signUp: { max: 5, seconds: 60 * 60 },            // per address: team sign-ups and joining the waitlist
  photoUpload: { max: 15, seconds: 60 * 60 },      // per address: sign-up photos (no account yet)
  scoreUpload: { max: 40, seconds: 60 * 60 },      // per team
  actions: { max: 90, seconds: 60 },               // per team, solo player or admin: league actions
  addressActions: { max: 300, seconds: 60 },       // per address, all of the above together
  pushSubscribe: { max: 20, seconds: 60 * 60 },    // per team or solo player
  textsPerPhone: { max: 3, seconds: 24 * 60 * 60 } // per phone, a day
} satisfies Record<string, Limit>;

/** Never keep raw addresses or phone numbers in a counter's name. */
const scramble = (what: string) => createHmac('sha256', env('TOKEN_SECRET')).update(`limit:${what}`).digest('base64url').slice(0, 22);

/** The visitor's network address: set by the site's front door (gate.js), which a visitor can't fake. */
export function clientAddress(event: APIGatewayProxyEventV2): string {
  return event.headers?.['x-viewer-ip'] || event.requestContext?.http?.sourceIp || 'unknown';
}

/** Counts one more. False when the limit is already used up for this window. */
export async function take(what: string, who: string, limit: Limit, now = Date.now()): Promise<boolean> {
  const window = Math.floor(now / 1000 / limit.seconds);
  try {
    await ddb.send(new UpdateCommand({
      TableName: table(),
      Key: { PK: `RATE#${leagueId()}`, SK: `${what}#${scramble(who)}#${window}` },
      UpdateExpression: 'SET n = if_not_exists(n, :zero) + :one, expireAt = :exp',
      ConditionExpression: 'attribute_not_exists(n) OR n < :max',
      ExpressionAttributeValues: { ':zero': 0, ':one': 1, ':max': limit.max, ':exp': (window + 2) * limit.seconds }
    }));
    return true;
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}

const TOO_MANY = (minutes: number) => new HttpError(429, `Too many tries from here. Wait ${minutes >= 60 ? 'an hour' : `${minutes} minutes`} and try again.`);

/** Refuses (429) when the limit is used up. */
export async function limit(what: keyof typeof LIMITS, who: string): Promise<void> {
  const l = LIMITS[what];
  if (!(await take(what, who, l))) throw TOO_MANY(Math.ceil(l.seconds / 60));
}

/** For an address: limit(what, clientAddress(event)). */
export const limitAddress = (event: APIGatewayProxyEventV2, what: keyof typeof LIMITS) => limit(what, clientAddress(event));
