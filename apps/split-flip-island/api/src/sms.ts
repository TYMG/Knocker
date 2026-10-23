// Texting, for admins: the status of the league's toll-free number, and test texts.
//
// Test texts only ever go to phones verified in AWS (scripts/sms-verify.sh), never to a number
// typed into the app, so nobody can use this to text strangers. No phone number lives in the
// code: the league's number comes from AWS, and verified phones are shown by last 4 digits.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  DescribeAccountAttributesCommand, DescribePhoneNumbersCommand, DescribeVerifiedDestinationNumbersCommand,
  PinpointSMSVoiceV2Client, SendTextMessageCommand
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { SMS_SAMPLE, SMS_TEMPLATES, type SmsStatusResponse, type SmsTemplate, type SmsTestRequest, type SmsTestResponse } from '../../shared/sms.js';
import { requireAdmin } from './admin.js';
import { ddb } from './db.js';
import { auditPut } from './handlers.js';
import { HttpError, parseBody } from './util.js';

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
  for (const p of phones) {
    await sms.send(new SendTextMessageCommand({
      DestinationPhoneNumber: p.number,
      OriginationIdentity: origination(),
      ConfigurationSetName: configSet(),
      MessageType: 'TRANSACTIONAL',
      MessageBody: text
    }));
  }
  const entry = auditPut(`${admin.name} sent a test text (${template.label})`, admin.name);
  await ddb.send(new PutCommand(entry.Put));
  return { sent: phones.length, body: text };
}
