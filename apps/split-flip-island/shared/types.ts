// Types shared by the web app and the API. Change a shape here and both sides follow.

export interface Machine {
  machineId: string;
  name: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  photoUrl: string | null;
}

export interface Night {
  date: string; // YYYY-MM-DD
  week: number;
  machineIds: string[]; // machines in play tonight (broken ones removed)
  open: boolean;
}

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
  phone1: string;
  phone2: string;
  pin: string;
  photoKey: string;
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

export interface ApiError {
  error: string;
}
