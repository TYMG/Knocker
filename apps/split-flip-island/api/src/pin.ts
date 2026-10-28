// Changing and resetting a team's PIN.
//   POST /api/me/pin                         a team changes its own PIN (needs the current one,
//                                            except a team matched from the waitlist picking its first)
//   POST /api/admin/teams/{teamId}/reset-pin  an admin sets a temporary PIN, shown once
import { randomInt } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pinProblem, type ChangePinRequest, type ResetPinResponse } from '../../shared/pin.js';
import { requireAdmin } from './admin.js';
import { clearLoginStrikes, hashPin, requireTeam, takeLoginStrike, verifyPin } from './auth.js';
import { ddb, keys, leagueId, table } from './db.js';
import type { PrivateItem } from './handlers.js';
import { applyAction, loadLeagueState } from './leagueStore.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

const privKey = (teamId: string) => ({ PK: keys.league(leagueId()), SK: keys.teamPrivate(teamId) });

export async function changePin(event: APIGatewayProxyEventV2): Promise<{ ok: true }> {
  const { teamId } = requireTeam(event);
  const body = parseBody<ChangePinRequest>(event);
  const current = text(body.currentPin);
  const next = text(body.newPin);
  const problem = pinProblem(next);
  if (problem) throw new HttpError(400, problem);

  const key = privKey(teamId);
  const priv = (await ddb.send(new GetCommand({ TableName: table(), Key: key }))).Item as PrivateItem | undefined;
  if (!priv) throw new HttpError(401, 'Your team was not found. Log in again.');
  // A team matched from the waitlist has no PIN yet: it picks one, with no current PIN to give.
  if (!priv.pinHash) {
    await applyAction({ kind: 'team', teamId }, { type: 'teamPinSet', payload: teamId }, {
      refusal: 'Your team already has a PIN. Refresh.',
      extraWrites: () => [{
        Update: {
          TableName: table(), Key: key,
          UpdateExpression: 'SET pinHash = :h, pinChangedAt = :at',
          ConditionExpression: 'pinHash = :none',
          ExpressionAttributeValues: { ':h': hashPin(next), ':at': nowIso(), ':none': '' }
        }
      }]
    });
    return { ok: true };
  }
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
