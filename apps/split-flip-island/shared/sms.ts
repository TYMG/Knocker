// The league's text messages, used by the API (to send) and the web app (to preview).
//
// Rules for every text: plain characters only (no emoji or curly quotes, so each stays one
// 160-character segment), says who it's from, and ends with how to stop. Texts are opt-in.
// Decided Oct 19: only the check-in reminder is texted for real; the rest are in-app alerts,
// Oct 28: plus "you're a team" when two solo players have both agreed to pair up.
// kept here so the admin can preview them and send a test.

export type SmsTemplate = 'checkInReminder' | 'teamMade' | 'youreNext' | 'yourTurn' | 'forfeit' | 'noShow';

export interface SmsSample {
  teamName: string;
  machineName: string;
  minutes: number;
  week: number;
  noShows: number;
  /** For "you're a team": the other player's first name. */
  partnerName: string;
}

const SIGN_OFF = ' Reply STOP to stop.';

export const SMS_TEMPLATES: Record<SmsTemplate, { label: string; texted: boolean; body: (v: SmsSample) => string }> = {
  checkInReminder: {
    label: 'Check-in reminder',
    texted: true,
    body: (v) => `Split Flipper Island: league night starts in ${v.minutes} min. ${v.teamName}, check in on the app so you can play. Partner out? Use a sub.${SIGN_OFF}`
  },
  teamMade: {
    label: "You're a team (solo players who paired up)",
    texted: true,
    body: (v) => `Split Flipper Island: you and ${v.partnerName} are a team! Open the app to pick your team name, photo and PIN: split-flip-island.knckr.com${SIGN_OFF}`
  },
  youreNext: {
    label: "You're next",
    texted: false,
    body: (v) => `Split Flipper Island: ${v.teamName}, you're next on ${v.machineName}. Head over now: you get 5 min to start once it's free.${SIGN_OFF}`
  },
  yourTurn: {
    label: 'Your turn',
    texted: false,
    body: (v) => `Split Flipper Island: your turn on ${v.machineName}! Start within 5 min and tap We started, or you forfeit the turn.${SIGN_OFF}`
  },
  forfeit: {
    label: 'Turn forfeited',
    texted: false,
    body: (v) => `Split Flipper Island: ${v.teamName} forfeited the turn on ${v.machineName}. Sign up again on the app to play it.${SIGN_OFF}`
  },
  noShow: {
    label: 'No-show',
    texted: false,
    body: (v) => `Split Flipper Island: we missed you in week ${v.week}. That's ${v.noShows} of 2 no-shows this season; a 3rd takes you out of the running.${SIGN_OFF}`
  }
};

export const SMS_SAMPLE: SmsSample = { teamName: 'Left & Right', machineName: 'Godzilla', minutes: 5, week: 4, noShows: 1, partnerName: 'Rosa' };

/** GSM-7 only and 160 characters or fewer: one segment, one charge. */
export function smsFitsOneSegment(text: string): boolean {
  return text.length <= 160 && /^[A-Za-z0-9 @$_!"#%&'()*+,\-./:;<=>?\n\r]*$/.test(text);
}

// ---- API shapes ----

export interface SmsStatusResponse {
  enabled: boolean;
  /** The league's toll-free number, and whether the carriers have approved it (ACTIVE). */
  phoneNumber?: string;
  phoneStatus?: string;
  /** SANDBOX: texts reach verified phones only. PRODUCTION: anyone who opted in. */
  accountTier?: string;
  /** Test phones verified in AWS, last 4 digits only. */
  verifiedPhones: { last4: string; status: string }[];
}

export interface SmsTestRequest { template: SmsTemplate }

/** Each player's reminder-text setting for their own phone (Player 1 first). Switchable any time. */
export interface TeamTextsResponse { texts: [boolean, boolean] }
export interface TeamTextsRequest { player: 0 | 1; optIn: boolean }
export interface SmsTestResponse { sent: number; body: string }
