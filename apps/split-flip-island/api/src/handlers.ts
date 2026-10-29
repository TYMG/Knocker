// Team endpoints that touch private data, on top of the league record (leagueStore.ts):
// photo uploads, sign-up, log-in and posting a score. Each saves its private part (PIN hash,
// phone numbers, the name claim) in its own items and applies the same rule the pages use.
import { randomUUID } from 'node:crypto';
import { nameProblem } from '../../shared/moderation.js';
import { SIGNED_OUT, stillSignedIn } from './session.js';
import { limit, limitAddress } from './limits.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { AuthResponse, LoginRequest, RegisterRequest, SubmitScoreRequest, Team, UploadResponse, PresignedUpload, Player } from '../../shared/types.js';
import { PLAYER_NAME_MAX, PRONOUNS_MAX } from '../../shared/types.js';
import { pinProblem } from '../../shared/pin.js';
import { canPlayTonight, currentWeek, findTeamByName, pendingTeams } from '../../shared/league/league.js';
import type { STeam } from '../../shared/league/types.js';
import { ddb, keys, leagueId, queryAll, s3, table } from './db.js';
import { runLeagueClock } from './leagueClock.js';
import { clearLoginStrikes, hashPin, issueToken, readAdminToken, requireTeam, takeLoginStrike, verifyPin } from './auth.js';
import { requireAdmin } from './admin.js';
import { applyAction, loadLeagueState, RuleRefused, type League } from './leagueStore.js';
import { env, HttpError, nowIso, parseBody, photoUrl, text } from './util.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Hours a new sign-up waits for approval before it is deleted. */
export const pendingHours = () => Number(process.env.PENDING_TEAM_HOURS) || 24;
/** Most sign-ups allowed to wait at once, so nobody can flood the approval list. */
export const maxPendingTeams = () => Number(process.env.MAX_PENDING_TEAMS) || 25;

const NOT_APPROVED = 'Your team is waiting for the league to approve it. You can play once it is approved.';

/** A team's private item: never in the league record, never sent to anyone but admins. */
export interface PrivateItem {
  pinHash: string; phone1: string; phone2: string; failures?: number; lastFailureAt?: number;
  /** Reminder texts, one setting per phone (1 = Player 1). The time of each latest yes or no is the consent record. */
  smsOptIn1?: boolean; smsOptIn2?: boolean; smsChangedAt1?: string; smsChangedAt2?: string;
  pinChangedAt?: string;
}

export const privateKey = (teamId: string) => ({ PK: keys.league(leagueId()), SK: keys.teamPrivate(teamId) });

/** Every team's private item, by team (admin views and the reminder job only). */
export async function loadPrivates(): Promise<Map<string, PrivateItem>> {
  const items = await queryAll<Record<string, unknown>>({
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': keys.league(leagueId()) }
  });
  const out = new Map<string, PrivateItem>();
  for (const i of items) {
    const match = i.type === 'private' && /^TEAM#(.+)#PRIVATE$/.exec(String(i.SK));
    if (match) out.set(match[1], i as unknown as PrivateItem);
  }
  return out;
}

/** A team as the sign-up and log-in answers show it. */
export const toTeam = (t: STeam): Team => ({
  teamId: t.teamId, teamName: t.teamName, photoUrl: photoUrl(t.photo.startsWith('leagues/') ? t.photo : null),
  status: t.status === 'withdrawn' ? 'approved' : t.status,
  players: [{ name: t.players[0], ...(t.pronouns?.[0] ? { pronouns: t.pronouns[0] } : {}) }, { name: t.players[1], ...(t.pronouns?.[1] ? { pronouns: t.pronouns[1] } : {}) }],
  ...(t.status === 'pending' && t.expiresAt ? { expiresAt: t.expiresAt } : {})
});

async function league(): Promise<League> {
  const state = await loadLeagueState();
  if (!state) throw new HttpError(409, 'The league has not been set up yet.');
  return state.league;
}

// ---------- Photos ----------

export async function photoExists(key: string) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: env('PHOTOS_BUCKET'), Key: key }));
    return (head.ContentLength ?? 0) > 0;
  } catch {
    return false;
  }
}

async function presign(key: string): Promise<PresignedUpload> {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: env('PHOTOS_BUCKET'),
    Key: key,
    Conditions: [['content-length-range', 1, MAX_PHOTO_BYTES], ['eq', '$Content-Type', 'image/jpeg']],
    Fields: { 'Content-Type': 'image/jpeg' },
    Expires: 300
  });
  return { url, fields, key };
}

// ---------- POST /api/uploads ----------

export async function createUpload(event: APIGatewayProxyEventV2): Promise<UploadResponse> {
  const { purpose } = parseBody<{ purpose: 'team' | 'score' }>(event);
  const l = leagueId();
  if (purpose === 'team') {
    await limitAddress(event, 'photoUpload');
    // Sign-up photos wait under pending/, which the bucket empties on its own after a few
    // days. Approving a team moves its photo to teams/.
    return { photo: await presign(`leagues/${l}/pending/${randomUUID()}.jpg`) };
  }
  if (purpose === 'score') {
    // A team uploads its own score photo; an admin entering a score uploads one for that team.
    const admin = readAdminToken(event) ? await requireAdmin(event) : null;
    const token = admin ? null : requireTeam(event);
    const teamId = admin ? text(parseBody<{ teamId?: string }>(event).teamId) : token!.teamId;
    if (!admin) await limit('scoreUpload', `team:${teamId}`);
    const s = await league();
    if (token && !stillSignedIn(token, s)) throw SIGNED_OUT();
    const team = s.teams.find((t) => t.teamId === teamId);
    if (!team) throw new HttpError(401, 'Your team was not found. Log in again.');
    if (team.status !== 'approved') throw new HttpError(403, NOT_APPROVED);
    if (currentWeek(s).state !== 'open') throw new HttpError(409, "There's no league night open right now.");
    const base = `leagues/${l}/scores/${currentWeek(s).date}/${teamId}-${randomUUID()}`;
    return { photo: await presign(`${base}.jpg`), thumb: await presign(`${base}-thumb.jpg`) };
  }
  throw new HttpError(400, 'purpose must be "team" or "score".');
}

// ---------- POST /api/teams (sign up) ----------

/** Two players, each a first name (1 to 20 characters) and optional pronouns (up to 20). */
function cleanPlayers(raw: unknown): [Player, Player] {
  const list = Array.isArray(raw) ? raw : [];
  const one = (p: unknown, n: number): Player => {
    const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const name = text(o.name).trim().replace(/\s+/g, ' ');
    const pronouns = text(o.pronouns).trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > PLAYER_NAME_MAX) throw new HttpError(400, `Enter Player ${n}'s name (up to ${PLAYER_NAME_MAX} characters).`);
    if (pronouns.length > PRONOUNS_MAX) throw new HttpError(400, `Player ${n}'s pronouns can be up to ${PRONOUNS_MAX} characters.`);
    return pronouns ? { name, pronouns } : { name };
  };
  return [one(list[0], 1), one(list[1], 2)];
}

export async function register(event: APIGatewayProxyEventV2): Promise<AuthResponse> {
  await limitAddress(event, 'signUp');
  const body = parseBody<RegisterRequest>(event);
  const l = leagueId();
  const teamName = text(body.teamName).trim().replace(/\s+/g, ' ');
  const phone1 = text(body.phone1).replace(/\D/g, '');
  const phone2 = text(body.phone2).replace(/\D/g, '');
  const pin = text(body.pin);
  const photoKey = text(body.photoKey);
  const players = cleanPlayers(body.players);
  const texts: [boolean, boolean] = [body.texts?.[0] === true, body.texts?.[1] === true];

  if (teamName.length < 2 || teamName.length > 30) throw new HttpError(400, 'Team name must be 2 to 30 characters.');
  const unkind = nameProblem(teamName) || players.map((p) => nameProblem(p.name, 'person')).find(Boolean);
  if (unkind) throw new HttpError(400, unkind);
  if (phone1.length < 10 || phone2.length < 10) throw new HttpError(400, 'Enter a 10-digit phone number for both players.');
  if (phone1 === phone2) throw new HttpError(400, 'Each player needs their own phone number.');
  const badPin = pinProblem(pin);
  if (badPin) throw new HttpError(400, badPin);
  if (!/^leagues\/[a-z0-9-]+\/pending\/[0-9a-f-]{36}\.jpg$/.test(photoKey) || !photoKey.startsWith(`leagues/${l}/pending/`) || !(await photoExists(photoKey))) {
    throw new HttpError(400, 'Add a team photo before signing up.');
  }

  const s = await league();
  if (s.paused) throw new HttpError(409, 'Sign-ups are closed while the league is paused. Try again later.');
  if (findTeamByName(s, teamName)) throw new HttpError(409, 'That team name is taken. Try another.');
  if (pendingTeams(s).length >= maxPendingTeams()) {
    throw new HttpError(409, 'Sign-ups are paused while the league catches up on approvals. Try again later or tell the organizer.');
  }

  const at = nowIso();
  let teamId = '';
  try {
    const saved = await applyAction(
      { kind: 'league' },
      { type: 'signUp', payload: { teamName, players: players.map((p) => ({ name: p.name, pronouns: p.pronouns ?? '' })), phone1: '', phone2: '', texts, photo: photoKey, pendingHours: pendingHours() } },
      {
        extraWrites: (next) => {
          // The rule picks the team's id; the private parts are saved with it, in the same write.
          teamId = next.teams[next.teams.length - 1]!.teamId;
          return [
            // Claims the name so no two teams share it. Also used for log-in.
            { Put: { TableName: table(), Item: { PK: keys.league(l), SK: keys.teamName(teamName), type: 'teamName', teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
            { Put: { TableName: table(), Item: { ...privateKey(teamId), type: 'private', pinHash: hashPin(pin), phone1, phone2, smsOptIn1: texts[0], smsOptIn2: texts[1], smsChangedAt1: at, smsChangedAt2: at }, ConditionExpression: 'attribute_not_exists(PK)' } }
          ];
        }
      }
    );
    const team = saved.league.teams.find((t) => t.teamId === teamId)!;
    return { token: issueToken(teamId, l), team: toTeam(team) };
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, 'That team name is taken. Try another.');
    throw err;
  }
}

// ---------- POST /api/login ----------

export async function login(event: APIGatewayProxyEventV2): Promise<AuthResponse> {
  await limitAddress(event, 'login');
  const body = parseBody<LoginRequest>(event);
  const teamName = text(body.teamName);
  const pin = text(body.pin);
  const l = leagueId();
  const wrong = new HttpError(401, "That team name and PIN don't match.");

  const claim = await ddb.send(new GetCommand({ TableName: table(), Key: { PK: keys.league(l), SK: keys.teamName(teamName) } }));
  const teamId = claim.Item?.teamId as string | undefined;
  if (!teamId) throw wrong;

  const key = privateKey(teamId);
  const priv = (await ddb.send(new GetCommand({ TableName: table(), Key: key }))).Item as PrivateItem | undefined;
  if (!priv) throw wrong;

  // Every attempt is counted before the PIN is checked; a correct PIN clears the count.
  if (!(await takeLoginStrike(key))) throw new HttpError(429, 'Too many wrong PINs. Wait 15 minutes or ask the league admin.');
  if (!verifyPin(pin, priv.pinHash)) throw wrong;
  await clearLoginStrikes(key);

  const team = (await league()).teams.find((t) => t.teamId === teamId);
  if (!team) throw wrong;
  return { token: issueToken(teamId, l), team: toTeam(team) };
}

// ---------- POST /api/scores ----------

/**
 * A score's photo and small copy, exactly as /api/uploads named them for this team tonight:
 * leagues/<league>/scores/<date>/<team>-<uuid>.jpg and the same with -thumb. Nothing else is
 * accepted, so a score can never point at someone else's photo or anywhere outside the folder.
 */
function scorePhotoPair(date: string, teamId: string, photo: string, thumb: string): boolean {
  const base = `leagues/${leagueId()}/scores/${date}/${teamId}-`;
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/.exec(photo.slice(base.length));
  return photo.startsWith(base) && !!m && thumb === `${base}${m[1]}-thumb.jpg`;
}

export async function submitScore(event: APIGatewayProxyEventV2): Promise<{ version: number }> {
  // A night past its closing time closes first, so a late score is refused.
  await runLeagueClock();
  const token = requireTeam(event);
  const { teamId } = token;
  const body = parseBody<SubmitScoreRequest>(event);
  const s = await league();
  if (!stillSignedIn(token, s)) throw SIGNED_OUT();
  const team = s.teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(401, 'Your team was not found. Log in again.');
  if (team.status !== 'approved') throw new HttpError(403, NOT_APPROVED);
  const week = currentWeek(s);
  if (week.state !== 'open') throw new HttpError(409, "There's no league night open right now.");
  if (!canPlayTonight(s, teamId)) throw new HttpError(409, "Check in first: the admin confirms you're here, then you can post scores.");
  if (!week.machineIds.includes(text(body.machineId)) || week.out[text(body.machineId)]) throw new HttpError(400, "That machine isn't in play tonight.");

  const score = Number(body.score);
  if (!Number.isSafeInteger(score) || score <= 0) throw new HttpError(400, 'Enter the score as a whole number.');

  const photoKey = text(body.photoKey);
  const thumbKey = text(body.thumbKey);
  if (!scorePhotoPair(week.date, teamId, photoKey, thumbKey) || !(await photoExists(photoKey))) {
    throw new HttpError(400, 'Every score needs a photo of the score display.');
  }
  const saved = await applyAction({ kind: 'team', teamId }, {
    type: 'submitScore', payload: { machineId: body.machineId, score, photoSource: 'camera', photo: photoKey, thumb: thumbKey }
  });
  return { version: saved.version };
}

// ---------- POST /api/admin/scores (an admin enters a score for a team) ----------

export interface AdminScoreRequest { teamId: string; machineId: string; score: number; reason: string; noPhoto: boolean; photoKey?: string; thumbKey?: string }

/** For when a team's phone dies: the admin types the score in, with a reason, photo or not. */
export async function adminEnterScore(event: APIGatewayProxyEventV2): Promise<{ version: number }> {
  // A night past its closing time closes first, so a late score is refused.
  await runLeagueClock();
  const admin = await requireAdmin(event);
  const body = parseBody<AdminScoreRequest>(event);
  const s = await league();
  const teamId = text(body.teamId);
  const machineId = text(body.machineId);
  const team = s.teams.find((t) => t.teamId === teamId);
  if (!team || team.status !== 'approved') throw new HttpError(400, 'Pick an approved team.');
  const week = currentWeek(s);
  if (week.state !== 'open') throw new HttpError(409, 'Scores can only be entered during league night.');
  if (!week.machineIds.includes(machineId) || week.out[machineId]) throw new HttpError(400, "That machine isn't in play tonight.");
  const score = Number(body.score);
  if (!Number.isSafeInteger(score) || score <= 0) throw new HttpError(400, 'Enter the score as a whole number.');
  const reason = text(body.reason).trim().replace(/\s+/g, ' ');
  if (reason.length < 3 || reason.length > 200) throw new HttpError(400, 'Say why in a few words. The reason goes in the league log.');
  const noPhoto = body.noPhoto === true;
  let photo: string | undefined;
  let thumb: string | undefined;
  if (!noPhoto) {
    photo = text(body.photoKey);
    thumb = text(body.thumbKey);
    if (!scorePhotoPair(week.date, teamId, photo, thumb) || !(await photoExists(photo))) {
      throw new HttpError(400, 'Add a photo of the score, or say there is none.');
    }
  }
  const saved = await applyAction({ kind: 'admin', name: admin.name }, {
    type: 'adminEnterScore', payload: { teamId, machineId, score, reason, noPhoto, photo, thumb, photoSource: noPhoto ? undefined : 'camera' }
  });
  return { version: saved.version };
}
