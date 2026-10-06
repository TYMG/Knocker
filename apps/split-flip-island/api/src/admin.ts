// Admin accounts and sign-up approval.
//
// Each admin has their own name and password (created with scripts/admin.ts, never through
// the website), so the league log shows who approved or removed a team. New teams wait as
// "pending"; an admin approves or removes them, and sign-ups nobody approves in time are
// deleted by purgeExpired, which a schedule runs every 15 minutes.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type {
  AdminAuthResponse, AdminLoginRequest, AdminTeam, AdminTeamsResponse, RemoveTeamRequest
} from '../../shared/types.js';
import { clearLoginStrikes, hashPassword, issueAdminToken, readAdminToken, takeLoginStrike, verifyPassword } from './auth.js';
import { ddb, keys, leagueId, s3, table } from './db.js';
import { auditPut, loadLeague, pendingHours, toTeam, type PrivateItem, type TeamItem } from './handlers.js';
import { env, HttpError, nowIso, parseBody, text } from './util.js';

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
  const body = parseBody<AdminLoginRequest>(event);
  const name = text(body.name);
  const password = text(body.password);
  const wrong = new HttpError(401, "That name and password don't match.");
  if (!name.trim() || name.length > 60 || password.length > 200) throw wrong;

  const admin = await getAdmin(name);
  if (!admin) {
    verifyPassword(password, DECOY_HASH);
    throw wrong;
  }
  // Every attempt is counted before the password is checked; a correct one clears the count.
  // (`./scripts/admin.sh password "Name"` also clears it, if someone keeps an admin locked out.)
  if (!(await takeLoginStrike(adminKey(name)))) throw new HttpError(429, 'Too many wrong passwords. Wait 15 minutes and try again.');
  if (!verifyPassword(password, admin.passHash)) throw wrong;
  await clearLoginStrikes(adminKey(name));
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

const keptPhotoKey = (teamId: string) => `leagues/${leagueId()}/teams/${teamId}.jpg`;

/**
 * Copies an approved team's photo out of pending/ so the bucket's cleanup leaves it alone.
 * Returns '' when the photo no longer exists (the team is approved without one). Any other
 * failure stops the approval, so a passing error never costs a team its photo.
 */
async function keepPhoto(team: TeamItem): Promise<string> {
  const Bucket = env('PHOTOS_BUCKET');
  let bytes: Uint8Array;
  try {
    const original = await s3.send(new GetObjectCommand({ Bucket, Key: team.photoKey }));
    bytes = await original.Body!.transformToByteArray();
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'NoSuchKey' || name === 'NotFound') return '';
    console.error('Could not read team photo', team.photoKey, err);
    throw new HttpError(503, "Couldn't save the team's photo just now. Nothing changed; try again.");
  }
  try {
    await s3.send(new PutObjectCommand({ Bucket, Key: keptPhotoKey(team.teamId), Body: bytes, ContentType: 'image/jpeg' }));
  } catch (err) {
    console.error('Could not keep team photo', team.photoKey, err);
    throw new HttpError(503, "Couldn't save the team's photo just now. Nothing changed; try again.");
  }
  return keptPhotoKey(team.teamId);
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
    if ((err as Error).name !== 'TransactionCanceledException') throw err;
    // Someone got there first. If they approved it, the copy we just made is the team's photo,
    // so leave it. If the team was removed or expired, clean the copy up.
    const { allTeams } = await loadLeague();
    const current = allTeams.find((t) => t.teamId === teamId);
    if (current?.status === 'approved') return { ok: true };
    await deletePhoto(photoKey);
    throw HANDLED;
  }
  // The pending original is only deleted once the kept copy exists.
  if (photoKey) await deletePhoto(team.photoKey);
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
    // The team was never approved, so its name stays out of the public log.
    await deletePendingTeam(team, auditPut(`${admin.name} removed a sign-up`, admin.name, reason));
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
      await deletePendingTeam(team, auditPut('A sign-up expired without approval', 'League'));
      purged += 1;
    } catch (err) {
      // Approved in the same instant, or a passing error. The next run tries again.
      failed += 1;
      console.error('Could not purge sign-up', team.teamId, err);
    }
  }
  return { purged, failed };
}
