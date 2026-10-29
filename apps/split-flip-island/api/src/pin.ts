// Changing and resetting a team's PIN.
//   POST /api/me/pin                         a team changes its own PIN (needs the current one)
//   POST /api/me/setup                       a team paired from the waitlist picks its name, photo and PIN
//   POST /api/admin/teams/{teamId}/reset-pin  an admin sets a temporary PIN, shown once
import { randomInt } from 'node:crypto';
import { limit } from './limits.js';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pinProblem, type ChangePinRequest, type ResetPinResponse } from '../../shared/pin.js';
import { requireAdmin } from './admin.js';
import { clearLoginStrikes, hashPin, takeLoginStrike, verifyPin } from './auth.js';
import { requireTeamSession } from './session.js';
import { ddb, keys, leagueId, table } from './db.js';
import type { PrivateItem } from './handlers.js';
import { applyAction, loadLeagueState, RuleRefused } from './leagueStore.js';
import { deletePhoto, keepPhoto } from './admin.js';
import { photoExists } from './handlers.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

const privKey = (teamId: string) => ({ PK: keys.league(leagueId()), SK: keys.teamPrivate(teamId) });

export async function changePin(event: APIGatewayProxyEventV2): Promise<{ ok: true }> {
  const { teamId } = await requireTeamSession(event);
  await limit('actions', `team:${teamId}`);
  const body = parseBody<ChangePinRequest>(event);
  const current = text(body.currentPin);
  const next = text(body.newPin);
  const problem = pinProblem(next);
  if (problem) throw new HttpError(400, problem);

  const key = privKey(teamId);
  const priv = (await ddb.send(new GetCommand({ TableName: table(), Key: key }))).Item as PrivateItem | undefined;
  if (!priv) throw new HttpError(401, 'Your team was not found. Log in again.');
  // A team paired from the waitlist has no PIN until it finishes setting up.
  if (!priv.pinHash) throw new HttpError(409, 'Finish setting up your team first: name, photo and PIN.');
  // Wrong guesses here count toward the same lockout as logging in.
  if (!(await takeLoginStrike(key))) throw new HttpError(429, 'Too many wrong PINs. Wait 15 minutes or ask the league admin.');
  if (!verifyPin(current, priv.pinHash)) throw new HttpError(401, "That isn't your current PIN.");
  await clearLoginStrikes(key);
  if (current === next) throw new HttpError(400, "That's the PIN you have now. Pick a different one.");

  await ddb.send(new UpdateCommand({
    TableName: table(), Key: key,
    UpdateExpression: 'SET pinHash = :h, pinChangedAt = :at',
    ConditionExpression: 'attribute_exists(PK)',
    ExpressionAttributeValues: { ':h': hashPin(next), ':at': nowIso() }
  }));
  return { ok: true };
}

/** A random 4-digit PIN that isn't one of the easy ones. */
export function temporaryPin(): string {
  for (;;) {
    const pin = String(randomInt(0, 10_000)).padStart(4, '0');
    if (!pinProblem(pin)) return pin;
  }
}

export async function resetPin(event: APIGatewayProxyEventV2, teamId: string): Promise<ResetPinResponse> {
  const admin = await requireAdmin(event);
  const state = await loadLeagueState();
  const team = state?.league.teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(404, 'That team was not found.');
  const pin = temporaryPin();
  // The rule writes the reset to the league log; the new PIN (hashed) is saved in the same write,
  // and any wrong-guess lockout is cleared for a fresh start.
  await applyAction({ kind: 'admin', name: admin.name }, { type: 'resetPin', payload: teamId }, {
    extraWrites: () => [{
      Update: {
        TableName: table(), Key: privKey(teamId),
        UpdateExpression: 'SET pinHash = :h, pinChangedAt = :at REMOVE failures, lastFailureAt',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':h': hashPin(pin), ':at': nowIso() }
      }
    }]
  });
  return { pin };
}

// ---------- POST /api/me/setup ----------

/**
 * A team paired from the waitlist finishes setting up: its own team name (or keeps "Bea & Ana"),
 * a photo if it wants one, and the PIN both players share. Only once, while it still needs it.
 */
export async function finishSetup(event: APIGatewayProxyEventV2): Promise<{ ok: true; teamName: string }> {
  const { teamId } = await requireTeamSession(event);
  await limit('actions', `team:${teamId}`);
  const body = parseBody<{ teamName?: string; photoKey?: string; pin?: string }>(event);
  const pin = text(body.pin);
  const problem = pinProblem(pin);
  if (problem) throw new HttpError(400, problem);
  const state = await loadLeagueState();
  const team = state?.league.teams.find((t) => t.teamId === teamId);
  if (!team) throw new HttpError(401, 'Your team was not found. Log in again.');
  if (!team.needsSetup) throw new HttpError(409, 'Your team is already set up. Change the PIN in Settings.');
  const teamName = text(body.teamName).trim().replace(/\s+/g, ' ') || team.teamName;
  if (teamName.length < 2 || teamName.length > 30) throw new HttpError(400, 'Team name must be 2 to 30 characters.');
  const renamed = teamName.toLowerCase() !== team.teamName.toLowerCase();
  const photoKey = text(body.photoKey);
  let photo = '';
  if (photoKey) {
    if (!photoKey.startsWith(`leagues/${leagueId()}/pending/`) || !/^leagues\/[a-z0-9-]+\/pending\/[0-9a-f-]{36}\.jpg$/.test(photoKey) || !(await photoExists(photoKey))) {
      throw new HttpError(400, "That photo didn't upload. Try again.");
    }
    photo = await keepPhoto({ teamId, photo: photoKey });
  }
  const l = keys.league(leagueId());
  try {
    await applyAction({ kind: 'team', teamId }, { type: 'finishTeamSetup', payload: { teamId, teamName, ...(photo ? { photo } : {}) } }, {
      refusal: 'Another team already has that name. Pick a different one.',
      extraWrites: () => [
        {
          Update: {
            TableName: table(), Key: privKey(teamId),
            UpdateExpression: 'SET pinHash = :h, pinChangedAt = :at',
            ConditionExpression: 'pinHash = :none',
            ExpressionAttributeValues: { ':h': hashPin(pin), ':at': nowIso(), ':none': '' }
          }
        },
        ...(renamed ? [
          { Put: { TableName: table(), Item: { PK: l, SK: keys.teamName(teamName), type: 'teamName', teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Delete: { TableName: table(), Key: { PK: l, SK: keys.teamName(team.teamName) } } }
        ] : [])
      ]
    });
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, err.message);
    throw err;
  }
  if (photoKey) await deletePhoto(photoKey);
  return { ok: true, teamName };
}
