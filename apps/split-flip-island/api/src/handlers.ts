import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, QueryCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type {
  AuditEntry, AuditResponse, AuthResponse, LoginRequest, Machine, MeResponse, Night, RegisterRequest,
  Score, StandingRow, StandingsResponse, SubmitScoreRequest, Team, UploadResponse, PresignedUpload
} from '../../shared/types.js';
import { ddb, keys, leagueId, queryAll, table } from './db.js';
import { hashPin, issueToken, requireTeam, verifyPin } from './auth.js';
import { rankTotals, scoreNight } from './scoring.js';
import { env, HttpError, nowIso, parseBody, photoUrl } from './util.js';

const s3 = new S3Client({});
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_LOGIN_FAILURES = 10;
const LOCKOUT_MS = 15 * 60_000;

// ---------- Stored item shapes ----------

interface TeamItem { type: 'team'; teamId: string; teamName: string; photoKey: string; createdAt: string }
interface MachineItem { type: 'machine'; machineId: string; name: string; order?: number }
interface NightItem { type: 'night'; date: string; week: number; machineIds: string[]; open: boolean }
interface MetaItem { type: 'meta'; activeNight?: string }
interface PrivateItem { pinHash: string; phone1: string; phone2: string; failures?: number; lastFailureAt?: number }
interface ScoreItem {
  type: 'score'; scoreId: string; teamId: string; machineId: string; date: string; score: number;
  submittedAt: string; enteredBy: 'team' | 'admin'; photoKey?: string; thumbKey?: string;
  photoUnavailable: boolean; status: 'active' | 'voided'; reason?: string;
}

const toTeam = (t: TeamItem): Team => ({ teamId: t.teamId, teamName: t.teamName, photoUrl: photoUrl(t.photoKey) });
const toMachine = (m: MachineItem): Machine => ({ machineId: m.machineId, name: m.name });
const toNight = (n: NightItem): Night => ({ date: n.date, week: n.week, machineIds: n.machineIds, open: n.open });
const toScore = (s: ScoreItem): Score => ({
  scoreId: s.scoreId, teamId: s.teamId, machineId: s.machineId, date: s.date, score: s.score,
  submittedAt: s.submittedAt, enteredBy: s.enteredBy, photoUrl: photoUrl(s.photoKey), thumbUrl: photoUrl(s.thumbKey),
  photoUnavailable: s.photoUnavailable, status: s.status
});

// ---------- Shared loaders ----------

async function loadLeague() {
  const l = leagueId();
  const items = await queryAll<Record<string, unknown>>({
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': keys.league(l) }
  });
  const meta = (items.find((i) => i.type === 'meta') ?? { type: 'meta' }) as unknown as MetaItem;
  const teams = items.filter((i) => i.type === 'team') as unknown as TeamItem[];
  const machines = (items.filter((i) => i.type === 'machine') as unknown as MachineItem[])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  const nights = (items.filter((i) => i.type === 'night') as unknown as NightItem[]).sort((a, b) => a.date.localeCompare(b.date));
  const activeNight = nights.find((n) => n.date === meta.activeNight) ?? null;
  return { meta, teams, machines, nights, activeNight };
}

async function loadNightScores(date: string): Promise<ScoreItem[]> {
  const items = await queryAll<ScoreItem>({
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': keys.nightPartition(leagueId(), date) }
  });
  return items.filter((s) => s.status === 'active');
}

function auditPut(action: string, actor: string, reason?: string) {
  const at = nowIso();
  const id = randomUUID();
  return {
    Put: {
      TableName: table(),
      Item: { PK: keys.audit(leagueId()), SK: `${at}#${id}`, type: 'audit', id, at, actor, action, reason }
    }
  };
}

async function photoExists(key: string) {
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
    return { photo: await presign(`leagues/${l}/teams/${randomUUID()}.jpg`) };
  }
  if (purpose === 'score') {
    const { teamId } = requireTeam(event);
    const { activeNight } = await loadLeague();
    if (!activeNight?.open) throw new HttpError(409, "There's no league night open right now.");
    const base = `leagues/${l}/scores/${activeNight.date}/${teamId}-${randomUUID()}`;
    return { photo: await presign(`${base}.jpg`), thumb: await presign(`${base}-thumb.jpg`) };
  }
  throw new HttpError(400, 'purpose must be "team" or "score".');
}

// ---------- POST /api/teams (sign up) ----------

export async function register(event: APIGatewayProxyEventV2): Promise<AuthResponse> {
  const body = parseBody<RegisterRequest>(event);
  const l = leagueId();
  const teamName = (body.teamName ?? '').trim().replace(/\s+/g, ' ');
  const phone1 = (body.phone1 ?? '').replace(/\D/g, '');
  const phone2 = (body.phone2 ?? '').replace(/\D/g, '');
  const pin = body.pin ?? '';
  const photoKey = body.photoKey ?? '';

  if (teamName.length < 2 || teamName.length > 30) throw new HttpError(400, 'Team name must be 2 to 30 characters.');
  if (phone1.length < 10 || phone2.length < 10) throw new HttpError(400, 'Enter a 10-digit phone number for both players.');
  if (phone1 === phone2) throw new HttpError(400, 'Each player needs their own phone number.');
  if (!/^\d{4}$/.test(pin)) throw new HttpError(400, 'PIN must be exactly 4 digits.');
  if (!photoKey.startsWith(`leagues/${l}/teams/`) || !(await photoExists(photoKey))) {
    throw new HttpError(400, 'Add a team photo before signing up.');
  }

  const teamId = randomUUID().slice(0, 8);
  const createdAt = nowIso();
  const team: TeamItem = { type: 'team', teamId, teamName, photoKey, createdAt };

  try {
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        // Claims the name so no two teams share it. Also used for login.
        { Put: { TableName: table(), Item: { PK: keys.league(l), SK: keys.teamName(teamName), type: 'teamName', teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Put: { TableName: table(), Item: { PK: keys.league(l), SK: keys.team(teamId), ...team } } },
        { Put: { TableName: table(), Item: { PK: keys.league(l), SK: keys.teamPrivate(teamId), type: 'private', pinHash: hashPin(pin), phone1, phone2 } } },
        auditPut(`${teamName} joined the league`, teamName)
      ]
    }));
  } catch (err) {
    if ((err as Error).name === 'TransactionCanceledException') throw new HttpError(409, 'That team name is taken. Try another.');
    throw err;
  }
  return { token: issueToken(teamId, l), team: toTeam(team) };
}

// ---------- POST /api/login ----------

export async function login(event: APIGatewayProxyEventV2): Promise<AuthResponse> {
  const { teamName = '', pin = '' } = parseBody<LoginRequest>(event);
  const l = leagueId();
  const wrong = new HttpError(401, "That team name and PIN don't match.");

  const claim = await ddb.send(new GetCommand({ TableName: table(), Key: { PK: keys.league(l), SK: keys.teamName(teamName) } }));
  const teamId = claim.Item?.teamId as string | undefined;
  if (!teamId) throw wrong;

  const privKey = { PK: keys.league(l), SK: keys.teamPrivate(teamId) };
  const priv = (await ddb.send(new GetCommand({ TableName: table(), Key: privKey }))).Item as PrivateItem | undefined;
  if (!priv) throw wrong;

  const locked = (priv.failures ?? 0) >= MAX_LOGIN_FAILURES && Date.now() - (priv.lastFailureAt ?? 0) < LOCKOUT_MS;
  if (locked) throw new HttpError(429, 'Too many wrong PINs. Wait 15 minutes or ask the league admin.');

  if (!verifyPin(pin, priv.pinHash)) {
    await ddb.send(new UpdateCommand({
      TableName: table(), Key: privKey,
      UpdateExpression: 'SET failures = if_not_exists(failures, :z) + :one, lastFailureAt = :now',
      ExpressionAttributeValues: { ':z': 0, ':one': 1, ':now': Date.now() }
    }));
    throw wrong;
  }
  if (priv.failures) {
    await ddb.send(new UpdateCommand({ TableName: table(), Key: privKey, UpdateExpression: 'REMOVE failures, lastFailureAt' }));
  }

  const team = (await ddb.send(new GetCommand({ TableName: table(), Key: { PK: keys.league(l), SK: keys.team(teamId) } }))).Item as TeamItem;
  return { token: issueToken(teamId, l), team: toTeam(team) };
}

// ---------- GET /api/me (team home) ----------

export async function me(event: APIGatewayProxyEventV2): Promise<MeResponse> {
  const { teamId } = requireTeam(event);
  const { teams, machines, activeNight } = await loadLeague();
  const team = teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(401, 'Your team was not found. Log in again.');

  const scores = activeNight ? (await loadNightScores(activeNight.date)).filter((s) => s.teamId === teamId) : [];
  const inPlay = activeNight ? machines.filter((m) => activeNight.machineIds.includes(m.machineId)) : [];
  return {
    team: toTeam(team),
    night: activeNight ? toNight(activeNight) : null,
    machines: inPlay.map((m) => {
      const mine = scores.filter((s) => s.machineId === m.machineId);
      return { machine: toMachine(m), attempts: mine.length, best: mine.length ? Math.max(...mine.map((s) => s.score)) : null };
    }),
    recentScores: scores.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map(toScore)
  };
}

// ---------- POST /api/scores ----------

export async function submitScore(event: APIGatewayProxyEventV2): Promise<Score> {
  const { teamId } = requireTeam(event);
  const body = parseBody<SubmitScoreRequest>(event);
  const l = leagueId();
  const { teams, machines, activeNight } = await loadLeague();
  const team = teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(401, 'Your team was not found. Log in again.');
  if (!activeNight?.open) throw new HttpError(409, "There's no league night open right now.");

  const machine = machines.find((m) => m.machineId === body.machineId);
  if (!machine || !activeNight.machineIds.includes(machine.machineId)) throw new HttpError(400, "That machine isn't in play tonight.");

  const score = Number(body.score);
  if (!Number.isSafeInteger(score) || score <= 0) throw new HttpError(400, 'Enter the score as a whole number.');

  const prefix = `leagues/${l}/scores/${activeNight.date}/${teamId}-`;
  const photoKey = body.photoKey ?? '';
  const thumbKey = body.thumbKey ?? '';
  if (!photoKey.startsWith(prefix) || !thumbKey.startsWith(prefix) || !(await photoExists(photoKey))) {
    throw new HttpError(400, 'Every score needs a photo of the score display.');
  }

  const scoreId = randomUUID();
  const submittedAt = nowIso();
  const item: ScoreItem = {
    type: 'score', scoreId, teamId, machineId: machine.machineId, date: activeNight.date, score, submittedAt,
    enteredBy: 'team', photoKey, thumbKey, photoUnavailable: false, status: 'active'
  };
  await ddb.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: table(),
          Item: {
            PK: keys.nightPartition(l, activeNight.date),
            SK: keys.score(teamId, machine.machineId, submittedAt, scoreId),
            GSI1PK: keys.teamScores(l, teamId),
            GSI1SK: `${activeNight.date}#${submittedAt}`,
            ...item
          }
        }
      },
      auditPut(`${team.teamName} submitted a score on ${machine.name}`, team.teamName)
    ]
  }));
  return toScore(item);
}

// ---------- GET /api/standings ----------

export async function standings(): Promise<StandingsResponse> {
  const { teams, machines, nights, activeNight } = await loadLeague();
  const teamIds = teams.map((t) => t.teamId);
  const teamCount = teams.length;
  const teamById = new Map(teams.map((t) => [t.teamId, toTeam(t)]));
  const machineById = new Map(machines.map((m) => [m.machineId, toMachine(m)]));
  const toRows = (totals: Map<string, number>): StandingRow[] =>
    rankTotals(totals, teamIds).map((r) => ({ team: teamById.get(r.teamId)!, points: r.points, rank: r.rank }));

  const played = nights.filter((n) => !activeNight || n.date <= activeNight.date);
  const option1 = new Map<string, number>();
  const option2 = new Map<string, number>();
  let tonight: StandingsResponse['tonight'] = { boards: [], machinePoints: [] };
  const byNight: StandingsResponse['season']['byNight'] = [];

  for (const night of played) {
    const scores = await loadNightScores(night.date);
    const result = scoreNight(scores, night.machineIds, teamCount);
    for (const [id, pts] of result.machinePoints) option1.set(id, (option1.get(id) ?? 0) + pts);
    for (const [id, pts] of result.nightPoints) option2.set(id, (option2.get(id) ?? 0) + pts);
    byNight.push({
      date: night.date,
      week: night.week,
      option1: Object.fromEntries(result.machinePoints),
      option2: Object.fromEntries(result.nightPoints)
    });

    if (night.date === activeNight?.date) {
      tonight = {
        boards: night.machineIds.filter((id) => machineById.has(id)).map((id) => ({
          machine: machineById.get(id)!,
          rows: (result.boards.get(id) ?? []).map((r) => ({
            team: teamById.get(r.teamId)!,
            best: r.best,
            attempts: r.attempts,
            points: r.points,
            thumbUrl: photoUrl(r.bestScore.thumbKey),
            photoUrl: photoUrl(r.bestScore.photoKey),
            photoUnavailable: r.bestScore.photoUnavailable
          }))
        })),
        machinePoints: toRows(result.machinePoints)
      };
    }
  }

  return {
    night: activeNight ? toNight(activeNight) : null,
    teamCount,
    tonight,
    season: { option1: toRows(option1), option2: toRows(option2), nightsPlayed: played.length, byNight }
  };
}

// ---------- GET /api/audit ----------

export async function audit(): Promise<AuditResponse> {
  const out = await ddb.send(new QueryCommand({
    TableName: table(),
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': keys.audit(leagueId()) },
    ScanIndexForward: false,
    Limit: 200
  }));
  const entries = (out.Items ?? []).map((i) => ({ id: i.id, at: i.at, actor: i.actor, action: i.action, reason: i.reason }) as AuditEntry);
  return { entries };
}
