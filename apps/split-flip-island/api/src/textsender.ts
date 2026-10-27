// The one place that sends a real text. Kept apart so tests can swap it out.
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from '@aws-sdk/client-pinpoint-sms-voice-v2';

const client = new PinpointSMSVoiceV2Client({});

export const textingOn = () => !!process.env.SMS_ORIGINATION;

/** "2025550142" -> "+12025550142". */
export const e164 = (digits: string) => (digits.length === 10 ? `+1${digits}` : `+${digits}`);

export async function sendText(to: string, body: string): Promise<void> {
  await client.send(new SendTextMessageCommand({
    DestinationPhoneNumber: to,
    OriginationIdentity: process.env.SMS_ORIGINATION,
    ConfigurationSetName: process.env.SMS_CONFIG_SET || undefined,
    MessageBody: body,
    MessageType: 'TRANSACTIONAL'
  }));
}
