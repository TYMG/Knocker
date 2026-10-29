// The one place that sends a real text. Kept apart so tests can swap it out.
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const client = new PinpointSMSVoiceV2Client({});

export const textingOn = () => !!process.env.SMS_ORIGINATION;

/** "2025550142" -> "+12025550142". */
export const e164 = (digits: string) => (digits.length === 10 ? `+1${digits}` : `+${digits}`);

/** The most texts the league sends in a day, whatever happens (a backstop against a bug or abuse). */
const dailyCap = () => Number(process.env.SMS_DAILY_CAP) || 200;

export class TextLimitReached extends Error { name = 'TextLimitReached'; }

export async function sendText(to: string, body: string): Promise<void> {
  // Caps before every text: a few a day per phone, and a ceiling for the whole league.
  const { LIMITS, take } = await import('./limits.js');
  // The log line (never the number) is what the texts-capped alarm watches for.
  if (!(await take('textsPerPhone', to, LIMITS.textsPerPhone))) { console.warn('TextLimitReached', 'per phone'); throw new TextLimitReached('That phone has had its texts for today.'); }
  if (!(await take('textsTotal', 'league', { max: dailyCap(), seconds: 24 * 60 * 60 }))) { console.warn('TextLimitReached', 'daily total'); throw new TextLimitReached("The league's texts for today are used up."); }
  await client.send(new SendTextMessageCommand({
    DestinationPhoneNumber: to,
    OriginationIdentity: process.env.SMS_ORIGINATION,
    ConfigurationSetName: process.env.SMS_CONFIG_SET || undefined,
    MessageBody: body,
    MessageType: 'TRANSACTIONAL'
  }));
}
