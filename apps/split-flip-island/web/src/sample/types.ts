// Shapes of the made-up league the app runs on while the pages are being designed.
// Nothing here is saved or sent anywhere: it all lives in the browser and resets on reload.

export type Role = 'visitor' | 'team' | 'admin';

export interface STeam {
  teamId: string;
  teamName: string;
  /** First names only, for the admin pages. */
  players: [string, string];
  phone1: string;
  phone2: string;
  photo: string; // image address (a drawn placeholder)
  /** New teams wait for an admin. Only approved teams play and appear in standings. */
  status: 'pending' | 'approved';
  createdAt: string;
  expiresAt?: string; // pending teams only
  /** The first week this team counts in. Points scale with the number of teams in a week. */
  firstWeek: number;
}

export interface SLocation {
  locationId: string;
  name: string;
}

export interface SMachine {
  machineId: string;
  name: string;
  locationId: string;
  /** Removed machines keep their old scores but can't be picked for a week. */
  removed: boolean;
}

/** week 1 to 8 are league nights; week 9 is finals night. */
export interface SWeek {
  week: number;
  date: string; // YYYY-MM-DD
  state: 'final' | 'open' | 'upcoming';
  /** Machines picked for this week. */
  machineIds: string[];
  /** Picked machines that broke during the night: their scores don't count. */
  out: Record<string, { at: string; reason: string }>;
}

export type CheckState = 'unchecked' | 'checked' | 'flagged';

export interface SScore {
  scoreId: string;
  week: number;
  teamId: string;
  machineId: string;
  score: number;
  at: string;
  enteredBy: 'team' | 'admin';
  photoSource: 'camera' | 'library' | 'none';
  /** A photo taken in this browser while trying the app. Seeded scores have none and get a drawn stand-in. */
  photo?: string;
  /** When the photo itself was taken, if the phone recorded it. */
  photoTakenAt?: string;
  check: CheckState;
  checkedBy?: string;
  /** Why the app flagged it for a look. */
  flag?: string;
  status: 'active' | 'voided';
  /** Why an admin changed or voided it. */
  reason?: string;
  history: { at: string; text: string }[];
}

/** One machine's line: the first team is playing, the rest wait in order. */
export interface SLine {
  machineId: string;
  teamIds: string[];
  joinedAt: Record<string, string>;
  /** Teams that asked to be told when they are next. */
  notify: string[];
}

export interface SMessage {
  text: string;
  postedAt: string;
  by: string;
}

/**
 * A challenge: one team bets some of the points it already has (its season total) that it will
 * post the better score on one machine tonight. The other team accepts or passes. When the night
 * closes, the loser's points go to the winner in the season standings. A night's own points are
 * never changed by a challenge. (The first wireframes called these call-outs and played them for nothing.)
 */
export interface SChallenge {
  id: string;
  week: number;
  machineId: string;
  fromTeamId: string;
  toTeamId: string;
  at: string;
  /** Points on the line, 1 to 10. The cap stops a team throwing a game to hand over a pile of points. */
  stake: number;
  status: 'waiting' | 'live' | 'passed' | 'settled';
  /** Set when settled. Left out when the two teams tied, and then no points move. */
  winnerTeamId?: string;
}

export interface SLogEntry {
  id: string;
  at: string;
  kind: 'score' | 'admin' | 'league';
  action: string;
  reason?: string;
}

/** Things that show under "Just happened" on a team's home page. */
export interface SFeedItem {
  id: string;
  teamId: string;
  at: string;
  text: string;
  /** Where tapping it goes, if anywhere. */
  to?: string;
  linkLabel?: string;
}

export interface SWaitlistEntry {
  id: string;
  name: string;
  at: string;
}

export interface SNightSettings {
  opensAt: string; // "19:00", applies to every league night
  closesAt: string; // "21:00"
  /** Added tonight only. */
  extraMinutes: number;
}

/** A finals bracket: four teams, three games, 4-3-2-1 points per game. */
export interface SFinal {
  title: string;
  teamIds: string[]; // in seed order
  games: { machineId: string; places: Record<string, number> | null }[];
  /** The game being played right now, with scores so far. */
  live?: { game: number; scores: Record<string, number>; playing?: string; next?: string };
}

export interface SampleState {
  /** The sample league's clock is frozen so the pages always tell the same story. */
  now: string;
  role: Role;
  /** The team you are when viewing as a team. */
  myTeamId: string;
  /**
   * An admin is a player with extra powers, and may or may not be on a team. When this is true
   * and you are viewing as an admin, you are also the team above.
   */
  adminOnTeam: boolean;
  adminName: string;
  teamCap: number;
  teams: STeam[];
  locations: SLocation[];
  machines: SMachine[];
  weeks: SWeek[];
  /** Dates with no league night. Skipping a week pushes it and every later week back seven days. */
  skippedDates: string[];
  scores: SScore[];
  lines: SLine[];
  checkIns: Record<string, string>; // teamId -> time, tonight
  message: SMessage | null;
  challenges: SChallenge[];
  log: SLogEntry[];
  feed: SFeedItem[];
  waitlist: SWaitlistEntry[];
  night: SNightSettings;
  finals: { championship: SFinal; secondChance: SFinal };
  /** Counter for new ids. */
  seq: number;
}
