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
  /** Each player's pronouns, as given at sign-up ('' when they skipped it). */
  pronouns?: [string, string];
  /** Each player's own phone gets the check-in reminder text (Player 1 first). */
  texts?: [boolean, boolean];
  /** Answered the end-of-season "keep the reminder texts?" question. */
  smsSeasonAsked?: boolean;
  /** Paired from the waitlist and hasn't finished setting up yet: team name, photo and PIN. */
  needsSetup?: boolean;
  /** Every phone logged in before this was signed out (an admin's Reset PIN). */
  signedOutAt?: string;
  photo: string; // image address (a drawn placeholder)
  /** New teams wait for an admin. Only approved teams play and appear in standings. */
  status: 'pending' | 'approved' | 'withdrawn';
  /** Set when an admin withdrew the team mid-season. Its scores stop counting everywhere. */
  withdrawn?: { at: string; week: number; reason: string };
  /**
   * Set on a team's third no-show. It keeps the points it had, can still come and play for fun,
   * but nothing after that week counts and it can't make the finals or win season prizes.
   */
  eliminated?: { at: string; week: number; seen?: boolean };
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
  /** A small copy of the photo for lists (server photos only). */
  thumb?: string;
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
  /** An admin took the photo down (it stays in storage as evidence; nobody else sees it). */
  photoHidden?: boolean;
  /** Teams that reported the photo. Only admins are told who. */
  reportedBy?: string[];
}

/** One machine's line: the first team is playing, the rest wait in order. */
export interface SLine {
  machineId: string;
  teamIds: string[];
  joinedAt: Record<string, string>;
  /** Teams that asked to be told when they are next. */
  notify: string[];
  /** The team whose turn it is (teamIds[0]) when the turn began. */
  upTeamId?: string;
  /** When that team's turn began, in real time (ms). They have 5 minutes to start. */
  upAt?: number;
  /** The team tapped "We started". */
  started?: boolean;
  /** Names this turn, so "Hide for now" stays hidden for it and no other. */
  turnId?: string;
}

/** A team that did not start its turn in time, or was forfeited by an admin. */
export interface SForfeit {
  id: string;
  teamId: string;
  machineId: string;
  week: number;
  at: string;
  by: 'clock' | 'admin';
  /** The team has seen the "turn forfeited" alert. */
  seen?: boolean;
  /** An admin forgave it (one per team per night): it does not count toward the season's 3. */
  forgiven?: boolean;
  /** The team has seen the "you were forgiven" alert. */
  forgivenSeen?: boolean;
}

/** Something on a line an admin may want a quick heads-up about. */
/** A team that wasn't checked in when a league night closed. Two a season are allowed. */
export interface SNoShow {
  id: string;
  teamId: string;
  week: number;
  at: string;
  /** An admin excused it: it doesn't count toward the two. */
  excused?: boolean;
  /** The team has seen the "you missed a night" alert. */
  seen?: boolean;
}

/** A sub, in for one partner for one night. Each player can be subbed out once a season. */
export interface SSub {
  id: string;
  teamId: string;
  week: number;
  /** Which partner is out: 0 or 1, as in STeam.players. */
  outPlayer: 0 | 1;
  subName: string;
  at: string;
}

export interface SLineEvent {
  id: string;
  kind: 'started' | 'forfeit';
  teamId: string;
  machineId: string;
  /** Real time (ms), so an admin's screen only shows ones that happened while it was open. */
  real: number;
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
  /** As given when they joined ('' or missing when they skipped it). */
  pronouns?: string;
  at: string;
  /** The matchmaker answers (missing for players who joined before it existed). */
  traits?: import('./match.js').SoloTraits;
  /** Who they want to play with. Private: only the server and the sample league read it. */
  wants?: import('./match.js').Wants;
  /** Swiped right: would team up. Private: only that player sees their own. */
  likes?: string[];
  /** Swiped left. Private, and never shown to anyone else. */
  passes?: string[];
  /** Asked this matched player to pair up, waiting for their answer. */
  asked?: string;
  /** Sent to a solo player about another: you both swiped right (names are shown from here on). */
  matched?: boolean;
  /** Sent to a solo player about a match: they've asked you to pair up. */
  askedMe?: boolean;
  /** Sent to admins only: the other waiting players this one fits (both ways). */
  fitsWith?: string[];
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
  games: SFinalGame[];
  /** The game being played right now, with scores so far. */
  live?: { game: number; scores: Record<string, number>; playing?: string; next?: string };
  /** An admin locked in the teams and is running this final for real (not the made-up preview). */
  locked?: boolean;
  /** Set once the final is decided: after game 3, or after a one-ball playoff for a tie at the top. */
  winnerId?: string;
}

/**
 * One finals game. Game 1: the 1st seed picks the machine and the order is by seed. Games 2 and 3:
 * in seed order, each team picks either the machine or a spot in the play order; one machine pick
 * per game, and the last team gets what is left. No machine is played twice in a final.
 */
export interface SFinalGame {
  machineId: string; // '' until picked
  places: Record<string, number> | null;
  /** Choices so far, in seed order: 'machine', or a play spot (1 to 4). */
  picks?: { teamId: string; pick: 'machine' | number }[];
  /** Play order, once settled. */
  order?: string[];
  scores?: Record<string, number>;
}

export interface SampleState {
  /** The sample league's clock is frozen so the pages always tell the same story. */
  now: string;
  role: Role;
  /** The team you are when viewing as a team. */
  myTeamId: string;
  /** The solo player you are, when logged in as one (on the waitlist, looking for a partner). */
  mySoloId?: string;
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
  forfeits?: SForfeit[];
  noShows?: SNoShow[];
  /** Subs confirmed at check-in, all season. */
  subs?: SSub[];
  /** Subs a team asked for when it tapped "I'm here", waiting with the check-in request. */
  pendingSubs?: Record<string, { outPlayer: 0 | 1; subName: string }[]>;
  lineEvents?: SLineEvent[];
  checkIns: Record<string, string>; // teamId -> time, tonight
  /** Teams that tapped "I'm here" and are waiting for an admin to confirm: teamId -> time. */
  checkInRequests?: Record<string, string>;
  message: SMessage | null;
  challenges: SChallenge[];
  log: SLogEntry[];
  feed: SFeedItem[];
  waitlist: SWaitlistEntry[];
  night: SNightSettings;
  finals: { championship: SFinal; secondChance: SFinal };
  /** Counter for new ids. */
  seq: number;
  /** Set while the guided "new league" story is running: which step it is on. */
  story?: { step: number };
  /**
   * Paused by an admin: nights don't open by themselves, no reminder texts, no new sign-ups.
   * Everyone can still look at the league, and admins can still change things.
   */
  paused?: boolean;
  /** Viewer field: the admin looking is the league's owner (can start the league over). */
  adminIsOwner?: boolean;
  /**
   * Viewer field, live league only: set when the one looking isn't a player in the league yet
   * (a visitor, a solo player, a team waiting for approval). They're sent the schedule and these
   * counts, and nothing else about the league (Matt, Oct 30: visitors see only the demo).
   */
  outsider?: { approvedTeams: number; pendingTeams: number };
}
