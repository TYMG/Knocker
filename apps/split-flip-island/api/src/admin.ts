// Admin accounts and sign-up approval.
//
// Each admin has their own name and password (created with scripts/admin.ts, never through
// the website), so the league log shows who approved or removed a team. New teams wait as
// "pending"; an admin approves or removes them, and sign-ups nobody approves in time are
// deleted by purgeExpired, which a schedule runs every 15 minutes. The teams themselves live in
// the league record (leagueStore.ts); their name claim and private item are deleted with them.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { limitAddress } from './limits.js';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { AdminAuthResponse, AdminLoginRequest, RemoveTeamRequest, TwoStepSetup } from '../../shared/types.js';
import { checkCode, newSecret, otpauthLink, seal, unseal } from './totp.js';
import type { STeam } from '../../shared/league/types.js';
import { clearLoginStrikes, hashPassword, issueAdminToken, readAdminToken, takeLoginStrike, verifyPassword } from './auth.js';
import { ddb, keys, leagueId, s3, table } from './db.js';
import { privateKey } from './handlers.js';
import { applyAction, loadLeagueState, RuleRefused } from './leagueStore.js';
import { env, HttpError, parseBody, text } from './util.js';

export interface AdminItem {
  type: 'admin'; name: string; passHash: string; tokenVersion: number; createdAt: string;
  failures?: number; lastFailureAt?: number;
  /** The owner can start the whole league over (set with ./scripts/admin.sh owner "Name"). */
  owner?: boolean;
  /** The authenticator secret, sealed (totp.ts). Cleared by ./scripts/admin.sh reset-2fa "Name". */
  totp?: string;
  /** A secret being added, until the first code from it is typed in. */
  totpPending?: string;
  /** The 30-second step of the last code used, so no code works twice. */
  totpStep?: number;
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
  const admin = await adminFromToken(event);
  // Both steps, every time: a setup token (password only) can't do anything else.
  if (!readAdminToken(event)!.mfa || !admin.totp) throw new HttpError(401, 'Log in as an admin to do that.');
  return admin;
}

async function adminFromToken(event: APIGatewayProxyEventV2): Promise<AdminItem> {
  const denied = new HttpError(401, 'Log in as an admin to do that.');
  const token = readAdminToken(event);
  if (!token || token.leagueId !== leagueId()) throw denied;
  const admin = await getAdmin(token.name);
  if (!admin || admin.tokenVersion !== token.version) throw denied;
  return admin;
}

/** Saves the step of a code that was just used, unless another request used it first. */
async function useStep(admin: AdminItem, step: number, extra = '', values: Record<string, unknown> = {}): Promise<boolean> {
  try {
    await ddb.send(new UpdateCommand({
      TableName: table(), Key: adminKey(admin.name),
      UpdateExpression: `SET totpStep = :step${extra}`,
      ConditionExpression: 'attribute_not_exists(totpStep) OR totpStep < :step',
      ExpressionAttributeValues: { ':step': step, ...values }
    }));
    return true;
  } catch (err) {
    if ((err as Error).name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}

/** True when this password is the admin's. Used to re-check before something drastic (Start over). */
export const passwordMatches = (admin: AdminItem, password: unknown) => typeof password === 'string' && password.length <= 200 && verifyPassword(password, admin.passHash);

// ---------- Two-step log-in: adding the authenticator ----------

/** POST /api/admin/2fa/start: a new key for the admin's authenticator app. */
export async function startTwoStep(event: APIGatewayProxyEventV2): Promise<TwoStepSetup> {
  const admin = await adminFromToken(event);
  if (admin.totp) throw new HttpError(409, 'This admin already has an authenticator. To replace it, run ./scripts/admin.sh reset-2fa.');
  const secret = newSecret();
  await ddb.send(new UpdateCommand({
    TableName: table(), Key: adminKey(admin.name),
    UpdateExpression: 'SET totpPending = :p', ExpressionAttributeValues: { ':p': seal(secret) }
  }));
  return { key: secret.replace(/(.{4})/g, '$1 ').trim(), link: otpauthLink(admin.name, secret) };
}

/** POST /api/admin/2fa/confirm {code}: the first code from the app turns two-step log-in on. */
export async function confirmTwoStep(event: APIGatewayProxyEventV2): Promise<AdminAuthResponse> {
  await limitAddress(event, 'adminLogin');
  const admin = await adminFromToken(event);
  if (admin.totp) throw new HttpError(409, 'This admin already has an authenticator.');
  const secret = unseal(admin.totpPending);
  if (!secret) throw new HttpError(409, 'Start again: get a new key first.');
  const step = checkCode(secret, text(parseBody<{ code?: string }>(event).code), Date.now(), admin.totpStep);
  if (step === null) throw new HttpError(401, "That code didn't work. Check the app shows Split Flipper Island and try the newest code.");
  if (!(await useStep(admin, step, ', totp = :t REMOVE totpPending', { ':t': admin.totpPending }))) throw new HttpError(401, 'That code was already used. Wait for the next one.');
  return { token: issueAdminToken(admin.name, leagueId(), admin.tokenVersion), admin: { name: admin.name } };
}

// ---------- POST /api/admin/login ----------

// Checked when the name is unknown, so a wrong name takes as long as a wrong password.
const DECOY_HASH = hashPassword('no such admin');

export async function adminLogin(event: APIGatewayProxyEventV2): Promise<AdminAuthResponse> {
  await limitAddress(event, 'adminLogin');
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
  // Second step. No authenticator yet: a short setup token that can only add one.
  if (!admin.totp) return { setupToken: issueAdminToken(admin.name, leagueId(), admin.tokenVersion, false) };
  const code = text(body.code);
  if (!code) return { needsCode: true };
  const step = checkCode(unseal(admin.totp), code, Date.now(), admin.totpStep);
  if (step === null || !(await useStep(admin, step))) throw new HttpError(401, "That code didn't work. Type the newest 6-digit code from your authenticator app.");
  await clearLoginStrikes(adminKey(name));
  return { token: issueAdminToken(admin.name, leagueId(), admin.tokenVersion), admin: { name: admin.name } };
}

// ---------- Photos ----------

export async function deletePhoto(key: string) {
  if (!key || !key.startsWith('leagues/')) return;
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
export async function keepPhoto(team: Pick<STeam, "teamId" | "photo">): Promise<string> {
  const Bucket = env('PHOTOS_BUCKET');
  if (!team.photo.startsWith('leagues/')) return '';
  let bytes: Uint8Array;
  try {
    const original = await s3.send(new GetObjectCommand({ Bucket, Key: team.photo }));
    bytes = await original.Body!.transformToByteArray();
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'NoSuchKey' || name === 'NotFound') return '';
    console.error('Could not read team photo', team.photo, err);
    throw new HttpError(503, "Couldn't save the team's photo just now. Nothing changed; try again.");
  }
  try {
    await s3.send(new PutObjectCommand({ Bucket, Key: keptPhotoKey(team.teamId), Body: bytes, ContentType: 'image/jpeg' }));
  } catch (err) {
    console.error('Could not keep team photo', team.photo, err);
    throw new HttpError(503, "Couldn't save the team's photo just now. Nothing changed; try again.");
  }
  return keptPhotoKey(team.teamId);
}

// ---------- POST /api/admin/teams/{teamId}/approve ----------

const HANDLED = new HttpError(409, 'Someone already handled that sign-up. Refresh the list.');
const GONE = new HttpError(404, 'That sign-up is gone. It may have expired or been removed.');

async function pendingTeam(teamId: string): Promise<STeam> {
  const state = await loadLeagueState();
  const team = state?.league.teams.find((t) => t.teamId === teamId);
  if (!team) throw GONE;
  if (team.status !== 'pending') throw HANDLED;
  return team;
}

const isApproved = async (teamId: string) =>
  (await loadLeagueState())?.league.teams.some((t) => t.teamId === teamId && t.status === 'approved') ?? false;

/** Safe to press twice: approving a team that is already approved just says OK. */
export async function approveTeam(event: APIGatewayProxyEventV2, teamId: string): Promise<{ ok: true }> {
  const admin = await requireAdmin(event);
  if (await isApproved(teamId)) return { ok: true };
  const team = await pendingTeam(teamId);
  const kept = await keepPhoto(team);
  try {
    await applyAction({ kind: 'admin', name: admin.name }, { type: 'approveTeam', payload: teamId }, {
      // The approved team's photo is the kept copy (or none, if it had already gone).
      after: (draft) => { const t = draft.teams.find((x) => x.teamId === teamId); if (t) t.photo = kept; }
    });
  } catch (err) {
    // Another admin approved it in the same moment: that's fine.
    if (err instanceof RuleRefused && (await isApproved(teamId))) return { ok: true };
    if (err instanceof RuleRefused) throw HANDLED;
    throw err;
  }
  await deletePhoto(team.photo);
  return { ok: true };
}

// ---------- POST /api/admin/teams/{teamId}/remove ----------

/** The name claim and private item go with the team, in the same write. */
const deleteTeamItems = (team: STeam) => [
  { Delete: { TableName: table(), Key: { PK: keys.league(leagueId()), SK: keys.teamName(team.teamName) } } },
  { Delete: { TableName: table(), Key: privateKey(team.teamId) } }
];

export async function removeTeam(event: APIGatewayProxyEventV2, teamId: string): Promise<{ ok: true }> {
  const admin = await requireAdmin(event);
  const body = parseBody<RemoveTeamRequest>(event);
  const reason = typeof body.reason === 'string' ? body.reason.trim().replace(/\s+/g, ' ') : '';
  if (reason.length < 3 || reason.length > 200) {
    throw new HttpError(400, 'Say why in a few words. The reason goes in the league log.');
  }
  const team = await pendingTeam(teamId);
  try {
    // The team was never approved, so its name stays out of the public log.
    await applyAction({ kind: 'admin', name: admin.name }, { type: 'removeSignUp', payload: { teamId, reason } }, { extraWrites: () => deleteTeamItems(team) });
  } catch (err) {
    if (err instanceof RuleRefused) throw HANDLED;
    throw err;
  }
  await deletePhoto(team.photo);
  return { ok: true };
}

// ---------- Scheduled: delete sign-ups nobody approved in time ----------

export function expiredSignUps(teams: STeam[], now: number): STeam[] {
  return teams.filter((t) => t.status === 'pending' && typeof t.expiresAt === 'string' && Date.parse(t.expiresAt) <= now);
}

export async function purgeExpired(now = Date.now()): Promise<{ purged: number; failed: number }> {
  const state = await loadLeagueState();
  if (!state) return { purged: 0, failed: 0 };
  let purged = 0;
  let failed = 0;
  for (const team of expiredSignUps(state.league.teams, now)) {
    try {
      await applyAction({ kind: 'league' }, { type: 'expireSignUp', payload: team.teamId }, { extraWrites: () => deleteTeamItems(team) });
      await deletePhoto(team.photo);
      purged += 1;
    } catch (err) {
      // Approved in the same instant, or a passing error. The next run tries again.
      failed += 1;
      console.error('Could not purge sign-up', team.teamId, err);
    }
  }
  return { purged, failed };
}

// ---------- POST /api/admin/teams/{teamId}/rename ----------

/** An admin renames a team (an unkind name that got through, or at the team's request). The name claim moves in the same write. */
export async function renameTeam(event: APIGatewayProxyEventV2, teamId: string): Promise<{ ok: true; teamName: string }> {
  const admin = await requireAdmin(event);
  const body = parseBody<{ teamName?: string; reason?: string }>(event);
  const teamName = text(body.teamName).trim().replace(/\s+/g, ' ');
  const reason = text(body.reason).trim();
  if (teamName.length < 2 || teamName.length > 30) throw new HttpError(400, 'Team name must be 2 to 30 characters.');
  if (reason.length < 3) throw new HttpError(400, 'Say why in a few words. The reason goes in the league log.');
  const state = await loadLeagueState();
  const team = state?.league.teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(404, 'That team was not found.');
  const l = keys.league(leagueId());
  try {
    await applyAction({ kind: 'admin', name: admin.name }, { type: 'renameTeam', payload: { teamId, teamName, reason } }, {
      refusal: 'Another team already has that name, or nothing changed.',
      extraWrites: () => team.teamName.toLowerCase() === teamName.toLowerCase() ? [] : [
        { Put: { TableName: table(), Item: { PK: l, SK: keys.teamName(teamName), type: 'teamName', teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
        { Delete: { TableName: table(), Key: { PK: l, SK: keys.teamName(team.teamName) } } }
      ]
    });
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, err.message);
    throw err;
  }
  return { ok: true, teamName };
}
