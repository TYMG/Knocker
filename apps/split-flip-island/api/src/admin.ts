// Admin accounts and sign-up approval.
//
// Each admin has their own name and password (created with scripts/admin.ts, never through
// the website), so the league log shows who approved or removed a team. New teams wait as
// "pending"; an admin approves or removes them, and sign-ups nobody approves in time are
// deleted by purgeExpired, which a schedule runs every 15 minutes.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type {
  AdminAuthResponse, AdminLoginRequest, AdminTeam, AdminTeamsResponse, RemoveTeamRequest
} from '../../shared/types.js';
import { hashPassword, issueAdminToken, readAdminToken, verifyPassword } from './auth.js';
import { ddb, keys, leagueId, s3, table } from './db.js';
import {
  auditPut, loadLeague, LOCKOUT_MS, MAX_LOGIN_FAILURES, pendingHours, toTeam, type PrivateItem, type TeamItem
} from './handlers.js';
import { env, HttpError, nowIso, parseBody } from './util.js';

export interface AdminItem {
  type: 'admin'; name: string; passHash: string; tokenVersion: number; createdAt: string;
  failures?: number; lastFailureAt?: number;
}

const adminKey = (name: string) => ({ PK: keys.admins(leagueId()), SK: keys.admin(name) });

async function getAdmin(name: string): Promise<AdminItem | undefined> {
  return (await ddb.send(new GetCommand({ TableName: table(), Key: adminKey(name) }))).Item as AdminItem | undefined;
}

/**
 * Every admin request checks the account still exists and the password hasn't been reset
 * since the token was issued, so removing an admin or resetting a password takes effect at once.
 */
export async function requireAdmin(event: APIGatewayProxyEventV2): Promise<AdminItem> {
  const denied = new HttpError(401, 'Log in as an admin to do that.');
  const token = readAdminToken(event);
  if (!token || token.leagueId !== leagueId()) throw denied;
  const admin = await getAdmin(token.name);
  if (!admin || admin.tokenVersion !== token.version) throw denied;
  return admin;
}

// ---------- POST /api/admin/login ----------

// Checked when the name is unknown, so a wrong name takes as long as a wrong password.
const DECOY_HASH = hashPassword('no such admin');

export async function adminLogin(event: APIGatewayProxyEventV2): Promise<AdminAuthResponse> {
  const { name = '', password = '' } = parseBody<AdminLoginRequest>(event);
  const wrong = new HttpError(401, "That name and password don't match.");
  if (typeof name !== 'string' || typeof password !== 'string' || !name.trim() || password.length > 200) throw wrong;

  const admin = await getAdmin(name);
  if (!admin) {
    verifyPassword(password, DECOY_HASH);
    throw wrong;
  }
  const locked = (admin.failures ?? 0) >= MAX_LOGIN_FAILURES && Date.now() - (admin.lastFailureAt ?? 0) < LOCKOUT_MS;
  if (locked) throw new HttpError(429, 'Too many wrong passwords. Wait 15 minutes and try again.');

  if (!verifyPassword(password, admin.passHash)) {
    await ddb.send(new UpdateCommand({
      TableName: table(), Key: adminKey(name),
      UpdateExpression: 'SET failures = if_not_exists(failures, :z) + :one, lastFailureAt = :now',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':z': 0, ':one': 1, ':now': Date.now() }
    }));
    throw wrong;
  }
  if (admin.failures) {
    await ddb.send(new UpdateCommand({ TableName: table(), Key: adminKey(name), UpdateExpression: 'REMOVE failures, lastFailureAt' }));
  }
  return { token: issueAdminToken(admin.name, leagueId(), admin.tokenVersion), admin: { name: admin.name } };
}

// ---------- GET /api/admin/teams ----------

const toAdminTeam = (t: TeamItem, priv: PrivateItem | undefined): AdminTeam => ({
  ...toTeam(t), createdAt: t.createdAt, phone1: priv?.phone1 ?? '', phone2: priv?.phone2 ?? ''
});

export async function adminTeams(event: APIGatewayProxyEventV2): Promise<AdminTeamsResponse> {
  await requireAdmin(event);
  const { allTeams, privates } = await loadLeague();
  const rows = allTeams
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((t) => toAdminTeam(t, privates.get(t.teamId)));
  return {
    pending: rows.filter((t) => t.status === 'pending'),
    approved: rows.filter((t) => t.status === 'approved'),
    pendingHours: pendingHours()
  };
}

// ---------- Photos ----------

async function deletePhoto(key: string) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env('PHOTOS_BUCKET'), Key: key }));
  } catch (err) {
    // The bucket clears pending/ on its own, so a failed delete only costs a few days.
    console.error('Could not delete photo', key, err);
  }
}

/** Copies an approved team's photo out of pending/ so the bucket's cleanup leaves it alone. */
async function keepPhoto(team: TeamItem): Promise<string> {
  const Bucket = env('PHOTOS_BUCKET');
  const kept = `leagues/${leagueId()}/teams/${team.teamId}.jpg`;
  try {
    const original = await s3.send(new GetObjectCommand({ Bucket, Key: team.photoKey }));
    const bytes = await original.Body!.transformToByteArray();
    await s3.send(new PutObjectCommand({ Bucket, Key: kept, Body: bytes, ContentType: 'image/jpeg' }));
    return kept;
  } catch (err) {
    // Approve anyway; the team shows without a photo.
    console.error('Could not keep team photo', team.photoKey, err);
    return '';
  }
}

// ---------- POST /api/admin/teams/{teamId}/approve ----------

const HANDLED = new HttpError(409, 'Someone already handled that sign-up. Refresh the list.');
const GONE = new HttpError(404, 'That sign-up is gone. It may have expired or been removed.');

async function findTeam(teamId: string): Promise<TeamItem> {
  const { allTeams } = await loadLeague();
  const team = allTeams.find((t) => t.teamId === teamId);
  if (!team) throw GONE;
  return team;
}

export async function approveTeam(event: APIGatewayProxyEventV2, teamId: string): Promise<{ ok: true }> {
  const admin = await requireAdmin(event);
  const team = await findTeam(teamId);
  if (team.status === 'approved') return { ok: true };

  const photoKey = await keepPhoto(team);
  try {
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: table(),
            Key: { PK: keys.league(leagueId()), SK: keys.team(teamId) },
            UpdateExpression: 'SET #status = :approved, photoKey = :photo, approvedAt = :at, approvedBy = :by REMOVE expiresAt',
            ConditionExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':approved': 'approved', ':pending': 'pending', ':photo': photoKey, ':at': nowIso(), ':by': admin.name }
          }
        },
        auditPut(`${admin.name} approved ${team.teamName}`, admin.name)
      ]
    }));
  } catch (err) {
    if ((err as Error).name === 'TransactionCanceledException') {
      await deletePhoto(photoKey);
      throw HANDLED;
    }
    throw err;
  }
  await deletePhoto(team.photoKey);
  return { ok: true };
}

// ---------- Removing a sign-up ----------

/** Deletes a pending team completely: its record, private info, name claim and photo. */
async function deletePendingTeam(team: TeamItem, audit: ReturnType<typeof auditPut>) {
  const PK = keys.league(leagueId());
  await ddb.send(new TransactWriteCommand({
    TransactItems: [
      {
        Delete: {
          TableName: table(), Key: { PK, SK: keys.team(team.teamId) },
          // Never delete a team that was approved a moment ago.
          ConditionExpression: '#status = :pending',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':pending': 'pending' }
        }
      },
      { Delete: { TableName: table(), Key: { PK, SK: keys.teamPrivate(team.teamId) } } },
      { Delete: { TableName: table(), Key: { PK, SK: keys.teamName(team.teamName) } } },
      audit
    ]
  }));
  await deletePhoto(team.photoKey);
}

// ---------- POST /api/admin/teams/{teamId}/remove ----------

export async function removeTeam(event: APIGatewayProxyEventV2, teamId: string): Promise<{ ok: true }> {
  const admin = await requireAdmin(event);
  const body = parseBody<RemoveTeamRequest>(event);
  const reason = typeof body.reason === 'string' ? body.reason.trim().replace(/\s+/g, ' ') : '';
  if (reason.length < 3 || reason.length > 200) {
    throw new HttpError(400, 'Say why in a few words. The reason goes in the league log.');
  }
  const team = await findTeam(teamId);
  if (team.status !== 'pending') throw new HttpError(409, "That team is already approved. Approved teams can't be removed here.");
  try {
    await deletePendingTeam(team, auditPut(`${admin.name} removed ${team.teamName}'s sign-up`, admin.name, reason));
  } catch (err) {
    if ((err as Error).name === 'TransactionCanceledException') throw HANDLED;
    throw err;
  }
  return { ok: true };
}

// ---------- Scheduled: delete sign-ups nobody approved in time ----------

export function expiredSignUps(teams: TeamItem[], now: number): TeamItem[] {
  return teams.filter((t) => t.status === 'pending' && typeof t.expiresAt === 'string' && Date.parse(t.expiresAt) <= now);
}

export async function purgeExpired(now = Date.now()): Promise<{ purged: number; failed: number }> {
  const { allTeams } = await loadLeague();
  let purged = 0;
  let failed = 0;
  for (const team of expiredSignUps(allTeams, now)) {
    try {
      await deletePendingTeam(team, auditPut(`${team.teamName}'s sign-up expired without approval`, 'League'));
      purged += 1;
    } catch (err) {
      // Approved in the same instant, or a passing error. The next run tries again.
      failed += 1;
      console.error('Could not purge sign-up', team.teamId, err);
    }
  }
  return { purged, failed };
}
