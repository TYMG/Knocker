// Solo players.
//   POST /api/waitlist                 a solo player joins: name, pronouns, phone, texts opt-in
//   POST /api/admin/waitlist/pair      an admin pairs two of them into an approved team
// A waiting player's phone and text choice are kept in their own private record
// (LEAGUE#<id> / WAITLIST#<entryId>#PRIVATE), never in the league record. Pairing moves them to
// the new team's private record and gives the team a temporary PIN, shown to the admin once.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { PRONOUNS_MAX, PLAYER_NAME_MAX } from '../../shared/types.js';
import { requireAdmin } from './admin.js';
import { hashPin } from './auth.js';
import { ddb, keys, leagueId, table } from './db.js';
import { privateKey } from './handlers.js';
import { applyAction, loadLeagueState, RuleRefused } from './leagueStore.js';
import { temporaryPin } from './pin.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

const waitKey = (id: string) => ({ PK: keys.league(leagueId()), SK: `WAITLIST#${id}#PRIVATE` });

interface WaitPrivate { phone: string; texts: boolean; at: string }

export async function joinWaitlist(event: APIGatewayProxyEventV2): Promise<{ ok: true; waiting: number }> {
  const body = parseBody<{ name?: string; pronouns?: string; phone?: string; texts?: boolean }>(event);
  const name = text(body.name).trim().replace(/\s+/g, ' ');
  const pronouns = text(body.pronouns).trim().replace(/\s+/g, ' ');
  const phone = text(body.phone).replace(/\D/g, '');
  if (name.length < 1 || name.length > PLAYER_NAME_MAX) throw new HttpError(400, `Enter your first name (up to ${PLAYER_NAME_MAX} characters).`);
  if (pronouns.length > PRONOUNS_MAX) throw new HttpError(400, `Pronouns can be up to ${PRONOUNS_MAX} characters.`);
  if (phone.length !== 10) throw new HttpError(400, 'Enter all 10 digits of your phone number.');
  const state = await loadLeagueState();
  if (!state) throw new HttpError(409, 'The league has not been set up yet.');
  if (state.league.paused) throw new HttpError(409, 'Sign-ups are closed while the league is paused. Try again later.');
  if (state.league.waitlist.length >= 30) throw new HttpError(409, 'The waitlist is full for now. Ask the league admin.');
  const saved = await applyAction({ kind: 'league' }, { type: 'joinWaitlist', payload: { name, pronouns } }, {
    extraWrites: (next) => {
      const entry = next.waitlist[next.waitlist.length - 1]!;
      const item: WaitPrivate = { phone, texts: body.texts === true, at: nowIso() };
      return [{ Put: { TableName: table(), Item: { ...waitKey(entry.id), type: 'waitPrivate', ...item }, ConditionExpression: 'attribute_not_exists(PK)' } }];
    }
  });
  return { ok: true, waiting: saved.league.waitlist.length };
}

export async function pairWaitlist(event: APIGatewayProxyEventV2): Promise<{ teamId: string; teamName: string; pin: string }> {
  const admin = await requireAdmin(event);
  const ids = parseBody<{ ids?: unknown }>(event).ids;
  if (!Array.isArray(ids) || ids.length !== 2 || typeof ids[0] !== 'string' || typeof ids[1] !== 'string' || ids[0] === ids[1]) {
    throw new HttpError(400, 'Pick two different solo players.');
  }
  const [a, b] = ids as [string, string];
  const [pa, pb] = await Promise.all([a, b].map(async (id) => (await ddb.send(new GetCommand({ TableName: table(), Key: waitKey(id) }))).Item as WaitPrivate | undefined));
  if (!pa || !pb) throw new HttpError(404, 'One of them is no longer on the waitlist. Refresh.');
  const pin = temporaryPin();
  const at = nowIso();
  let teamId = '';
  let teamName = '';
  try {
    await applyAction({ kind: 'admin', name: admin.name }, { type: 'pairWaitlist', payload: { ids: [a, b], texts: [pa.texts, pb.texts] } }, {
      refusal: 'A team already has that name, or they are no longer waiting. Refresh.',
      extraWrites: (next) => {
        const team = next.teams[next.teams.length - 1]!;
        teamId = team.teamId;
        teamName = team.teamName;
        return [
          { Put: { TableName: table(), Item: { PK: keys.league(leagueId()), SK: keys.teamName(team.teamName), type: 'teamName', teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: { TableName: table(), Item: { ...privateKey(teamId), type: 'private', pinHash: hashPin(pin), pinChangedAt: at, phone1: pa.phone, phone2: pb.phone, smsOptIn1: pa.texts, smsOptIn2: pb.texts, smsChangedAt1: pa.at, smsChangedAt2: pb.at }, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Delete: { TableName: table(), Key: waitKey(a) } },
          { Delete: { TableName: table(), Key: waitKey(b) } }
        ];
      }
    });
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, err.message);
    throw err;
  }
  return { teamId, teamName, pin };
}
