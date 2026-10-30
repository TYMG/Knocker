// Confirming a phone before the league texts it (decided Oct 30). Saying yes to texts at sign-up
// is the consent; the code proves the number is really theirs, so nobody can sign a stranger's
// number up for texts. Until a phone is confirmed, nothing is texted to it.
//
//   Teams:  GET  /api/me/texts                  { texts, confirmed } per player
//           POST /api/me/texts/confirm-start    { player }        texts that phone a 6-digit code
//           POST /api/me/texts/confirm          { player, code }
//   Solos:  GET  /api/solo/texts                { texts, confirmed }
//           POST /api/solo/texts/confirm-start
//           POST /api/solo/texts/confirm        { code }
//
// The code is kept only as a keyed hash, good for 10 minutes and 5 tries. Sending one goes
// through the usual text caps (3 a day per phone, the league's daily ceiling).

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { phoneCodeText, type PhoneTextsResponse } from '../../shared/sms.js';
import { ddb, keys, leagueId, table } from './db.js';
import { limitAddress } from './limits.js';
import { requireTeamSession } from './session.js';
import { e164, sendText, TextLimitReached, textingOn } from './textsender.js';
import { env, HttpError, parseBody, text } from './util.js';
import { requireSolo, waitKey, type WaitPrivate } from './waitlist.js';

const CODE_MINUTES = 10;
const MAX_TRIES = 5;

/** A code waiting to be typed in: its hash, when it stops working, and wrong tries so far. */
export interface PhoneCode { hash: string; exp: number; tries: number }

const hashCode = (where: string, code: string) => createHmac('sha256', env('TOKEN_SECRET')).update(`phonecode:${where}:${code}`).digest('base64url');

const sameHash = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

type Key = { PK: string; SK: string };
const getItem = async <T>(key: Key) => (await ddb.send(new GetCommand({ TableName: table(), Key: key }))).Item as T | undefined;

/** Makes a code, saves its hash in `field`, and texts it. */
async function sendCode(event: APIGatewayProxyEventV2, key: Key, field: string, phone: string) {
  if (!textingOn()) throw new HttpError(409, "The league isn't sending texts yet. Nothing to confirm for now.");
  await limitAddress(event, 'phoneCodes');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const saved: PhoneCode = { hash: hashCode(`${key.SK}:${field}`, code), exp: Date.now() + CODE_MINUTES * 60_000, tries: 0 };
  await ddb.send(new UpdateCommand({ TableName: table(), Key: key, UpdateExpression: `SET ${field} = :c`, ConditionExpression: 'attribute_exists(PK)', ExpressionAttributeValues: { ':c': saved } }));
  try {
    await sendText(e164(phone), phoneCodeText(code));
  } catch (err) {
    if (err instanceof TextLimitReached) throw new HttpError(429, 'That phone has had all its texts for today. Try again tomorrow.');
    throw err;
  }
}

/** Checks a typed code; on a match sets `verifiedField` and clears the code. Wrong tries are counted. */
async function checkCode(key: Key, codeField: string, verifiedField: string, saved: PhoneCode | undefined, typed: string) {
  const code = typed.replace(/\D/g, '');
  if (!saved || saved.exp < Date.now() || saved.tries >= MAX_TRIES) throw new HttpError(409, 'That code has run out. Send a new one.');
  if (code.length !== 6 || !sameHash(saved.hash, hashCode(`${key.SK}:${codeField}`, code))) {
    const counted: PhoneCode = { ...saved, tries: saved.tries + 1 };
    await ddb.send(new UpdateCommand({ TableName: table(), Key: key, UpdateExpression: `SET ${codeField} = :c`, ConditionExpression: 'attribute_exists(PK)', ExpressionAttributeValues: { ':c': counted } }));
    throw new HttpError(401, saved.tries + 1 >= MAX_TRIES ? 'Too many wrong tries. Send a new code.' : "That code isn't right. Check the text and try again.");
  }
  await ddb.send(new UpdateCommand({ TableName: table(), Key: key, UpdateExpression: `SET ${verifiedField} = :t REMOVE ${codeField}`, ExpressionAttributeValues: { ':t': true } }));
}

// ---------- Teams ----------

/** The team's private item, as far as texting goes. */
interface TeamPrivate { phone1?: string; phone2?: string; smsOptIn1?: boolean; smsOptIn2?: boolean; smsVerified1?: boolean; smsVerified2?: boolean; smsCode1?: PhoneCode; smsCode2?: PhoneCode }

const teamKey = (teamId: string) => ({ PK: keys.league(leagueId()), SK: keys.teamPrivate(teamId) });

async function teamPrivate(teamId: string): Promise<TeamPrivate> {
  const item = await getItem<TeamPrivate>(teamKey(teamId));
  if (!item) throw new HttpError(401, 'Your team was not found. Log in again.');
  return item;
}

export const teamTextsView = (p: TeamPrivate): PhoneTextsResponse & { texts: [boolean, boolean]; confirmed: [boolean, boolean] } => ({
  texts: [p.smsOptIn1 === true, p.smsOptIn2 === true],
  confirmed: [p.smsVerified1 === true, p.smsVerified2 === true]
});

const whichPlayer = (event: APIGatewayProxyEventV2) => {
  const body = parseBody<{ player?: unknown; code?: unknown }>(event);
  if (body.player !== 0 && body.player !== 1) throw new HttpError(400, 'Say which player: 0 for Player 1, 1 for Player 2.');
  return { n: (body.player + 1) as 1 | 2, code: text(body.code) };
};

export async function teamConfirmStart(event: APIGatewayProxyEventV2): Promise<{ sent: true }> {
  const { teamId } = await requireTeamSession(event);
  const { n } = whichPlayer(event);
  const p = await teamPrivate(teamId);
  const phone = n === 1 ? p.phone1 : p.phone2;
  if (!phone) throw new HttpError(400, "There's no phone number for that player.");
  if ((n === 1 ? p.smsVerified1 : p.smsVerified2) === true) throw new HttpError(409, 'That phone is already confirmed.');
  await sendCode(event, teamKey(teamId), `smsCode${n}`, phone);
  return { sent: true };
}

export async function teamConfirm(event: APIGatewayProxyEventV2) {
  const { teamId } = await requireTeamSession(event);
  await limitAddress(event, 'login');
  const { n, code } = whichPlayer(event);
  const p = await teamPrivate(teamId);
  await checkCode(teamKey(teamId), `smsCode${n}`, `smsVerified${n}`, n === 1 ? p.smsCode1 : p.smsCode2, code);
  return teamTextsView(await teamPrivate(teamId));
}

// ---------- Solo players ----------

async function soloPrivate(soloId: string): Promise<WaitPrivate> {
  const item = await getItem<WaitPrivate>(waitKey(soloId));
  if (!item) throw new HttpError(401, "You're not on the waitlist any more.");
  return item;
}

const soloView = (p: WaitPrivate) => ({ texts: p.texts === true, confirmed: p.verified === true });

export async function soloTexts(event: APIGatewayProxyEventV2) {
  return soloView(await soloPrivate(requireSolo(event).soloId));
}

export async function soloConfirmStart(event: APIGatewayProxyEventV2): Promise<{ sent: true }> {
  const { soloId } = requireSolo(event);
  const p = await soloPrivate(soloId);
  if (p.verified) throw new HttpError(409, 'Your phone is already confirmed.');
  await sendCode(event, waitKey(soloId), 'code', p.phone);
  return { sent: true };
}

export async function soloConfirm(event: APIGatewayProxyEventV2) {
  const { soloId } = requireSolo(event);
  await limitAddress(event, 'login');
  const p = await soloPrivate(soloId);
  await checkCode(waitKey(soloId), 'code', 'verified', p.code, text(parseBody<{ code?: unknown }>(event).code));
  return soloView(await soloPrivate(soloId));
}
