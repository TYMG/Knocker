// Texting, for admins: the status of the league's toll-free number, and test texts.
//
// Test texts only ever go to phones verified in AWS (scripts/sms-verify.sh), never to a number
// typed into the app, so nobody can use this to text strangers. No phone number lives in the
// code: the league's number comes from AWS, and verified phones are shown by last 4 digits.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  DescribeAccountAttributesCommand, DescribePhoneNumbersCommand, DescribeVerifiedDestinationNumbersCommand,
  PinpointSMSVoiceV2Client
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import {
  SMS_SAMPLE, SMS_TEMPLATES, type SmsStatusResponse, type SmsTemplate, type SmsTestRequest, type SmsTestResponse,
  type TeamTextsRequest, type TeamTextsResponse
} from '../../shared/sms.js';
import { requireAdmin } from './admin.js';
import { sendText } from './textsender.js';
import { requireTeamSession } from './session.js';
import { ddb, keys, leagueId, table } from './db.js';
import { applyAction, RuleRefused } from './leagueStore.js';
import { HttpError, nowIso, parseBody } from './util.js';

const sms = new PinpointSMSVoiceV2Client({});
const origination = () => process.env.SMS_ORIGINATION ?? '';
const configSet = () => process.env.SMS_CONFIG_SET || undefined;

async function verifiedPhones() {
  const out = await sms.send(new DescribeVerifiedDestinationNumbersCommand({}));
  return (out.VerifiedDestinationNumbers ?? []).map((v) => ({
    number: v.DestinationPhoneNumber ?? '',
    status: v.Status ?? 'UNKNOWN'
  }));
}

// ---------- GET /api/admin/sms ----------

export async function smsStatus(event: APIGatewayProxyEventV2): Promise<SmsStatusResponse> {
  await requireAdmin(event);
  if (!origination()) return { enabled: false, verifiedPhones: [] };
  const [numbers, account, phones] = await Promise.all([
    sms.send(new DescribePhoneNumbersCommand({ PhoneNumberIds: [origination()] })),
    sms.send(new DescribeAccountAttributesCommand({})),
    verifiedPhones()
  ]);
  const number = numbers.PhoneNumbers?.[0];
  return {
    enabled: true,
    phoneNumber: number?.PhoneNumber,
    phoneStatus: number?.Status,
    accountTier: account.AccountAttributes?.find((a) => a.Name === 'ACCOUNT_TIER')?.Value,
    verifiedPhones: phones.map((p) => ({ last4: p.number.slice(-4), status: p.status }))
  };
}

// ---------- POST /api/admin/sms/test ----------

export async function smsTest(event: APIGatewayProxyEventV2): Promise<SmsTestResponse> {
  const admin = await requireAdmin(event);
  if (!origination()) throw new HttpError(409, 'Texting is turned off for this league.');
  const body = parseBody<SmsTestRequest>(event);
  const template = SMS_TEMPLATES[body.template as SmsTemplate];
  if (!template) throw new HttpError(400, 'Pick a message to send.');

  const numbers = await sms.send(new DescribePhoneNumbersCommand({ PhoneNumberIds: [origination()] }));
  const status = numbers.PhoneNumbers?.[0]?.Status;
  if (status !== 'ACTIVE') {
    throw new HttpError(409, `The league's number can't send yet (it is ${status ?? 'not found'}). A toll-free number sends once its carrier registration is approved.`);
  }
  const phones = (await verifiedPhones()).filter((p) => p.status === 'VERIFIED').slice(0, 10);
  if (phones.length === 0) throw new HttpError(409, 'No verified test phone yet. Run scripts/sms-verify.sh to add yours.');

  const text = template.body(SMS_SAMPLE);
  // Through the same caps as every other text (3 per phone a day, the daily total).
  let sent = 0;
  for (const p of phones) {
    try {
      await sendText(p.number, text);
      sent++;
    } catch (err) {
      if ((err as Error).name !== 'TextLimitReached') throw err;
    }
  }
  // A test is the admin's own business, so it goes in the server log, not the league log.
  console.log('Test text sent', JSON.stringify({ by: admin.name, template: body.template, phones: sent }));
  return { sent, body: text };
}

// ---------- A team's own setting: GET / POST /api/me/texts ----------
// Kept in the team's private item, never in the league log. Turning texts off here stops the
// league from sending; a STOP reply also stops them at AWS, and only START undoes that.

const privKey = (teamId: string) => ({ PK: keys.league(leagueId()), SK: keys.teamPrivate(teamId) });

export async function teamTexts(event: APIGatewayProxyEventV2): Promise<TeamTextsResponse> {
  const { teamId } = await requireTeamSession(event);
  const item = (await ddb.send(new GetCommand({ TableName: table(), Key: privKey(teamId) }))).Item;
  if (!item) throw new HttpError(401, 'Your team was not found. Log in again.');
  return { texts: [item.smsOptIn1 === true, item.smsOptIn2 === true] };
}

export async function setTeamTexts(event: APIGatewayProxyEventV2): Promise<TeamTextsResponse> {
  const { teamId } = await requireTeamSession(event);
  const body = parseBody<TeamTextsRequest>(event);
  if (body.player !== 0 && body.player !== 1) throw new HttpError(400, 'Say which player: 0 for Player 1, 1 for Player 2.');
  if (typeof body.optIn !== 'boolean') throw new HttpError(400, 'Say whether they want texts (optIn: true or false).');
  const n = body.player + 1;
  const update = {
    TableName: table(),
    Key: privKey(teamId),
    UpdateExpression: `SET smsOptIn${n} = :v, smsChangedAt${n} = :at`,
    ConditionExpression: 'attribute_exists(PK)',
    ExpressionAttributeValues: { ':v': body.optIn, ':at': nowIso() }
  };
  const notFound = (e: Error) => {
    if (e.name === 'ConditionalCheckFailedException' || e.name === 'TransactionCanceledException') throw new HttpError(401, 'Your team was not found. Log in again.');
    throw e;
  };
  // The private item is the consent record; the league shows the same setting on the pages.
  // Both change in one write. If the league already shows it, only the record is touched.
  try {
    await applyAction({ kind: 'league' }, { type: 'setSmsOptIn', payload: { teamId, player: body.player, optIn: body.optIn } }, { extraWrites: () => [{ Update: update }] });
  } catch (e) {
    if (!(e instanceof RuleRefused)) notFound(e as Error);
    await ddb.send(new UpdateCommand(update)).catch(notFound);
  }
  return teamTexts(event);
}
