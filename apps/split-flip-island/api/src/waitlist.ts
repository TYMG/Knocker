// Solo players and the matchmaker.
//   POST /api/waitlist                 a solo player joins: name, pronouns, phone, texts, PIN, answers
//   POST /api/solo/login               a solo player logs back in with phone number and PIN
//   POST /api/solo/pick                a solo player would team up with another (or takes it back);
//                                      when both have picked each other they're a team straight away
//   POST /api/solo/leave               a solo player leaves the waitlist
//   POST /api/admin/waitlist/pair      an admin pairs two of them into an approved team
//   POST /api/admin/waitlist/remove    an admin takes someone off the waitlist
// A waiting player's phone, text choice and PIN are kept in their own private record
// (WAITLIST#<id>#PRIVATE), never in the league record, with a lookup by phone (SOLOPHONE#<scrambled
// phone>). Their answers, who they want to play with and their picks live in the league record but
// are cut out of what anyone else is sent (leagueApi.viewFor). When two of them become a team,
// their private details move to the team's private record, and SOLOTEAM#<id> tells each one's
// phone which team it's on now, so it switches over by itself.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { pinProblem } from '../../shared/pin.js';
import { PRONOUNS_MAX, PLAYER_NAME_MAX } from '../../shared/types.js';
import { readTraits, readWants } from '../../shared/league/match.js';
import { requireAdmin } from './admin.js';
import { clearLoginStrikes, hashPin, issueSoloToken, phoneLookup, readSoloToken, takeLoginStrike, verifyPin } from './auth.js';
import { ddb, keys, leagueId, table } from './db.js';
import { privateKey } from './handlers.js';
import { applyAction, loadLeagueState, RuleRefused, type Actor, type League } from './leagueStore.js';
import { temporaryPin } from './pin.js';
import { HttpError, nowIso, parseBody, text } from './util.js';

const pk = () => keys.league(leagueId());
export const waitKey = (id: string) => ({ PK: pk(), SK: `WAITLIST#${id}#PRIVATE` });
const phoneKey = (phone: string) => ({ PK: pk(), SK: `SOLOPHONE#${phoneLookup(phone)}` });
export const soloTeamKey = (id: string) => ({ PK: pk(), SK: `SOLOTEAM#${id}` });

export interface WaitPrivate { phone: string; texts: boolean; at: string; pinHash?: string }

const getItem = async <T>(key: { PK: string; SK: string }) => (await ddb.send(new GetCommand({ TableName: table(), Key: key }))).Item as T | undefined;

export function requireSolo(event: APIGatewayProxyEventV2): { soloId: string } {
  const token = readSoloToken(event);
  if (!token) throw new HttpError(401, 'Log in with your phone number and PIN.');
  return { soloId: token.soloId };
}

export async function joinWaitlist(event: APIGatewayProxyEventV2): Promise<{ ok: true; waiting: number; soloId: string; token: string }> {
  const body = parseBody<{ name?: string; pronouns?: string; phone?: string; texts?: boolean; pin?: string; traits?: unknown; wants?: unknown }>(event);
  const name = text(body.name).trim().replace(/\s+/g, ' ');
  const pronouns = text(body.pronouns).trim().replace(/\s+/g, ' ');
  const phone = text(body.phone).replace(/\D/g, '');
  const pin = text(body.pin);
  const traits = readTraits(body.traits);
  const wants = readWants(body.wants);
  if (name.length < 1 || name.length > PLAYER_NAME_MAX) throw new HttpError(400, `Enter your first name (up to ${PLAYER_NAME_MAX} characters).`);
  if (pronouns.length > PRONOUNS_MAX) throw new HttpError(400, `Pronouns can be up to ${PRONOUNS_MAX} characters.`);
  if (phone.length !== 10) throw new HttpError(400, 'Enter all 10 digits of your phone number.');
  const problem = pinProblem(pin);
  if (problem) throw new HttpError(400, problem);
  if (!traits) throw new HttpError(400, 'Answer the four questions about how you play.');
  if (!wants) throw new HttpError(400, 'Pick who you would like to play with.');
  const state = await loadLeagueState();
  if (!state) throw new HttpError(409, 'The league has not been set up yet.');
  if (state.league.paused) throw new HttpError(409, 'Sign-ups are closed while the league is paused. Try again later.');
  if (state.league.waitlist.length >= 40) throw new HttpError(409, 'The waitlist is full for now. Ask the league admin.');
  let soloId = '';
  try {
    const saved = await applyAction({ kind: 'league' }, { type: 'joinWaitlist', payload: { name, pronouns, traits, wants } }, {
      refusal: 'That phone number is already on the waitlist. Log in instead.',
      extraWrites: (next) => {
        soloId = next.waitlist[next.waitlist.length - 1]!.id;
        const item: WaitPrivate = { phone, texts: body.texts === true, at: nowIso(), pinHash: hashPin(pin) };
        return [
          { Put: { TableName: table(), Item: { ...phoneKey(phone), type: 'soloPhone', soloId }, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: { TableName: table(), Item: { ...waitKey(soloId), type: 'waitPrivate', ...item }, ConditionExpression: 'attribute_not_exists(PK)' } }
        ];
      }
    });
    return { ok: true, waiting: saved.league.waitlist.length, soloId, token: issueSoloToken(soloId, leagueId()) };
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, err.message);
    throw err;
  }
}

export async function soloLogin(event: APIGatewayProxyEventV2): Promise<{ soloId: string; token: string }> {
  const body = parseBody<{ phone?: string; pin?: string }>(event);
  const phone = text(body.phone).replace(/\D/g, '');
  const wrong = new HttpError(401, "That phone number and PIN don't match anyone on the waitlist.");
  if (phone.length !== 10) throw wrong;
  const soloId = (await getItem<{ soloId: string }>(phoneKey(phone)))?.soloId;
  if (!soloId) throw wrong;
  const key = waitKey(soloId);
  const priv = await getItem<WaitPrivate>(key);
  if (!priv?.pinHash) throw wrong;
  if (!(await takeLoginStrike(key))) throw new HttpError(429, 'Too many wrong PINs. Wait 15 minutes or ask the league admin.');
  if (!verifyPin(text(body.pin), priv.pinHash)) throw wrong;
  await clearLoginStrikes(key);
  return { soloId, token: issueSoloToken(soloId, leagueId()) };
}

/** The writes that turn two solo players' private records into their new team's. */
function teamWrites(team: { teamId: string; teamName: string }, ids: [string, string], privs: [WaitPrivate, WaitPrivate], pinHash: string) {
  const at = nowIso();
  const [pa, pb] = privs;
  return [
    { Put: { TableName: table(), Item: { PK: pk(), SK: keys.teamName(team.teamName), type: 'teamName', teamId: team.teamId }, ConditionExpression: 'attribute_not_exists(PK)' } },
    { Put: { TableName: table(), Item: { ...privateKey(team.teamId), type: 'private', pinHash, pinChangedAt: at, phone1: pa.phone, phone2: pb.phone, smsOptIn1: pa.texts, smsOptIn2: pb.texts, smsChangedAt1: pa.at, smsChangedAt2: pb.at }, ConditionExpression: 'attribute_not_exists(PK)' } },
    ...ids.flatMap((id, i) => [
      { Delete: { TableName: table(), Key: waitKey(id) } },
      { Delete: { TableName: table(), Key: phoneKey(privs[i]!.phone) } },
      { Put: { TableName: table(), Item: { ...soloTeamKey(id), type: 'soloTeam', teamId: team.teamId, at } } }
    ])
  ];
}

/** The team just made from this solo player, if the rule made one (it is always added last). */
const newTeam = (soloId: string, next: League) => (next.waitlist.some((w) => w.id === soloId) ? null : next.teams[next.teams.length - 1] ?? null);

export async function pickPartner(event: APIGatewayProxyEventV2): Promise<{ teamId?: string; teamName?: string }> {
  const { soloId } = requireSolo(event);
  const body = parseBody<{ toId?: string; picked?: boolean }>(event);
  const toId = text(body.toId);
  const state = await loadLeagueState();
  if (!state?.league.waitlist.some((w) => w.id === soloId)) throw new HttpError(409, "You're not on the waitlist anymore. Refresh.");
  const [mine, theirs] = await Promise.all([getItem<WaitPrivate>(waitKey(soloId)), getItem<WaitPrivate>(waitKey(toId))]);
  if (!mine || !theirs) throw new HttpError(409, "That player isn't waiting anymore. Refresh.");
  let made: { teamId: string; teamName: string } | null = null;
  try {
    await applyAction({ kind: 'solo', soloId }, { type: 'pickPartner', payload: { toId, picked: body.picked !== false } }, {
      refusal: "That player isn't waiting anymore. Refresh.",
      // The new team's text choices come from the two private records (picker first, as the rule names them).
      after: (draft) => { const t = newTeam(soloId, draft); if (t) t.texts = [mine.texts, theirs.texts]; },
      extraWrites: (next) => {
        made = newTeam(soloId, next);
        // The team picks its own PIN together; until then nobody can log in to it with a PIN.
        return made ? teamWrites(made, [soloId, toId], [mine, theirs], '') : [];
      }
    });
  } catch (err) {
    // Picking someone twice, or taking back a pick that isn't there: nothing to do.
    if (err instanceof RuleRefused) return {};
    throw err;
  }
  const team = made as { teamId: string; teamName: string } | null;
  return team ? { teamId: team.teamId, teamName: team.teamName } : {};
}

async function leave(actor: Actor, id: string) {
  const priv = await getItem<WaitPrivate>(waitKey(id));
  await applyAction(actor, { type: 'leaveWaitlist', payload: id }, {
    refusal: "They're not on the waitlist anymore.",
    extraWrites: () => [
      { Delete: { TableName: table(), Key: waitKey(id) } },
      ...(priv ? [{ Delete: { TableName: table(), Key: phoneKey(priv.phone) } }] : [])
    ]
  });
  return { ok: true as const };
}

export async function soloLeave(event: APIGatewayProxyEventV2) {
  const { soloId } = requireSolo(event);
  return leave({ kind: 'solo', soloId }, soloId);
}

export async function adminRemoveSolo(event: APIGatewayProxyEventV2) {
  const admin = await requireAdmin(event);
  return leave({ kind: 'admin', name: admin.name }, text(parseBody<{ id?: string }>(event).id));
}

export async function pairWaitlist(event: APIGatewayProxyEventV2): Promise<{ teamId: string; teamName: string; pin: string }> {
  const admin = await requireAdmin(event);
  const ids = parseBody<{ ids?: unknown }>(event).ids;
  if (!Array.isArray(ids) || ids.length !== 2 || typeof ids[0] !== 'string' || typeof ids[1] !== 'string' || ids[0] === ids[1]) {
    throw new HttpError(400, 'Pick two different solo players.');
  }
  const [a, b] = ids as [string, string];
  const [pa, pb] = await Promise.all([a, b].map((id) => getItem<WaitPrivate>(waitKey(id))));
  if (!pa || !pb) throw new HttpError(404, 'One of them is no longer on the waitlist. Refresh.');
  const pin = temporaryPin();
  let made: { teamId: string; teamName: string } | null = null;
  try {
    await applyAction({ kind: 'admin', name: admin.name }, { type: 'pairWaitlist', payload: { ids: [a, b], texts: [pa.texts, pb.texts] } }, {
      refusal: 'They are no longer waiting. Refresh.',
      extraWrites: (next) => {
        made = newTeam(a, next);
        return made ? teamWrites(made, [a, b], [pa, pb], hashPin(pin)) : [];
      }
    });
  } catch (err) {
    if (err instanceof RuleRefused) throw new HttpError(409, err.message);
    throw err;
  }
  const team = made as { teamId: string; teamName: string } | null;
  if (!team) throw new HttpError(409, 'They are no longer waiting. Refresh.');
  return { teamId: team.teamId, teamName: team.teamName, pin };
}
