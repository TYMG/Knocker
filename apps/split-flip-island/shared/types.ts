// Types shared by the web app and the API. Change a shape here and both sides follow.

export interface Machine {
  machineId: string;
  name: string;
}

/** A player's first name and, if they gave them, their pronouns. Shown wherever names show. */
export interface Player {
  name: string;
  pronouns?: string;
}

/** The pronoun choices at sign-up. Players can also type their own (up to 20 characters). */
export const PRONOUN_CHOICES = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they', 'any pronouns'] as const;
export const PRONOUNS_MAX = 20;
export const PLAYER_NAME_MAX = 20;

export interface Team {
  teamId: string;
  teamName: string;
  /** The two players, in sign-up order (Player 1 first). Missing on teams from before Oct 27. */
  players?: [Player, Player];
  photoUrl: string | null;
  /** New teams wait for an admin. Only approved teams play, score and appear in standings. */
  status: 'pending' | 'approved';
  /** Pending teams only: when the sign-up is deleted if nobody approves it. */
  expiresAt?: string;
}

export interface Night {
  date: string; // YYYY-MM-DD
  week: number;
  machineIds: string[]; // machines in play tonight (broken ones removed)
  open: boolean;
  /** When the night starts (UTC ISO). Check-in opens 30 minutes before; the reminder text goes out 5 before. */
  startsAt?: string;
}

// ---- Check-in ----

/** requested: the team tapped "I'm here". confirmed / declined: the admin's answer. */
export type CheckInState = 'none' | 'requested' | 'confirmed' | 'declined';

export interface CheckInResponse {
  night: { date: string; week: number; startsAt?: string } | null;
  state: CheckInState;
  at?: string;
}

export interface AdminCheckInsResponse {
  night: { date: string; week: number; startsAt?: string } | null;
  teams: { teamId: string; teamName: string; state: CheckInState; at?: string }[];
}

export interface NightStartRequest { startTime: string } // "19:00", league time

export interface Score {
  scoreId: string;
  teamId: string;
  machineId: string;
  date: string;
  score: number;
  submittedAt: string;
  enteredBy: 'team' | 'admin';
  photoUrl: string | null;
  thumbUrl: string | null;
  photoUnavailable: boolean;
  status: 'active' | 'voided';
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  reason?: string;
}

export interface PresignedUpload {
  url: string;
  fields: Record<string, string>;
  key: string;
}

export interface UploadResponse {
  photo: PresignedUpload;
  thumb?: PresignedUpload;
}

// ---- Requests ----

export interface RegisterRequest {
  teamName: string;
  players: [Player, Player];
  phone1: string;
  phone2: string;
  pin: string;
  photoKey: string;
  /** Each player ticked "text me a league-night reminder" for their own phone. Off if missing. */
  texts?: [boolean, boolean];
}

export interface LoginRequest {
  teamName: string;
  pin: string;
}

export interface SubmitScoreRequest {
  machineId: string;
  score: number;
  photoKey: string;
  thumbKey: string;
}

// ---- Responses ----

export interface AuthResponse {
  token: string;
  team: Team;
}

export interface MachineStatus {
  machine: Machine;
  attempts: number;
  best: number | null;
}

export interface MeResponse {
  team: Team;
  night: Night | null;
  machines: MachineStatus[];
  recentScores: Score[];
}

export interface LeaderboardRow {
  team: Team;
  best: number;
  attempts: number;
  points: number;
  thumbUrl: string | null;
  photoUrl: string | null;
  photoUnavailable: boolean;
}

export interface MachineBoard {
  machine: Machine;
  rows: LeaderboardRow[];
}

export interface StandingRow {
  team: Team;
  points: number;
  rank: number;
  /**
   * Season standings only: places moved since the previous league night.
   * Positive = moved up, negative = moved down, 0 = held. Left out until week 2.
   */
  change?: number;
}

export interface StandingsResponse {
  night: Night | null;
  teamCount: number;
  tonight: {
    boards: MachineBoard[];
    machinePoints: StandingRow[]; // tonight's machine points per team
  };
  season: {
    option1: StandingRow[]; // machine points add up
    option2: StandingRow[]; // rank the night
    nightsPlayed: number;
    byNight: NightPoints[]; // points and rank after each night, for the season charts
  };
}

export interface NightPoints {
  date: string;
  week: number;
  option1: Record<string, number>; // teamId -> machine points that night
  option2: Record<string, number>; // teamId -> league points that night
  /** Season rank after this night, from running totals (ties share a rank). */
  ranks: {
    option1: Record<string, number>; // teamId -> rank
    option2: Record<string, number>;
  };
}

export interface AuditResponse {
  entries: AuditEntry[];
}

// ---- Admin ----

export interface AdminLoginRequest {
  name: string;
  password: string;
}

export interface AdminAuthResponse {
  token: string;
  admin: { name: string };
}

/** A team as admins see it. Phone numbers never leave the admin pages. */
export interface AdminTeam extends Team {
  createdAt: string;
  phone1: string;
  phone2: string;
}

export interface AdminTeamsResponse {
  pending: AdminTeam[]; // oldest first
  approved: AdminTeam[];
  /** Hours a sign-up waits before it is deleted. */
  pendingHours: number;
}

export interface RemoveTeamRequest {
  reason: string;
}

export interface ApiError {
  error: string;
}
