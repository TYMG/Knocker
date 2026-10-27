// The league, served from the one rule book.
//   GET  /api/league          the league as the caller may see it (visitor, team or admin)
//   POST /api/league/action   { type, payload } applies one rule as the logged-in team or admin
//
// Actions that touch private data (sign-up, posting a score with a photo, approval, PINs, text
// settings, removing a sign-up, pairing solo players) are not allowed here: they have their own
// endpoints, which save the private part and then apply the same rule.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { LeagueActionName } from '../../shared/league/rules.js';
import { ADMIN_ACTIONS, TEAM_ACTIONS } from '../../shared/league/permissions.js';
import { requireAdmin } from './admin.js';
import { readAdminToken, readToken } from './auth.js';
import { teamPhoto } from '../../shared/league/art.js';
import { loadPrivates } from './handlers.js';
import { applyAction, loadLeagueState, type Actor, type League } from './leagueStore.js';
import { HttpError, nowIso, parseBody, photoUrl } from './util.js';

/** A saved photo path becomes the address the pages load it from (through the site's front door). */
const photoSrc = (key: string | undefined) => (key?.startsWith('leagues/') ? photoUrl(key) ?? undefined : key || undefined);

/** Who is asking: an admin (checked against the database), a team, or a visitor. */
async function viewer(event: APIGatewayProxyEventV2): Promise<Actor | null> {
  if (readAdminToken(event)) {
    const admin = await requireAdmin(event);
    return { kind: 'admin', name: admin.name };
  }
  const team = readToken(event);
  return team ? { kind: 'team', teamId: team.teamId } : null;
}

/**
 * The league as one viewer may see it. Phone numbers only for admins; each team's text settings
 * and pending sub names only for that team and admins. The viewer fields say who is looking.
 */
export function viewFor(league: League, who: Actor | null, phones?: Map<string, { phone1: string; phone2: string }>): League {
  const admin = who?.kind === 'admin';
  const mine = who?.kind === 'team' ? who.teamId : '';
  return {
    ...league,
    now: nowIso(),
    role: admin ? 'admin' : mine ? 'team' : 'visitor',
    myTeamId: mine,
    adminName: admin ? who.name : '',
    adminOnTeam: false,
    teams: league.teams.map((t) => {
      const p = admin ? phones?.get(t.teamId) : undefined;
      const seesPrivate = admin || t.teamId === mine;
      return { ...t, photo: photoSrc(t.photo) || teamPhoto(t.teamName), phone1: p?.phone1 ?? '', phone2: p?.phone2 ?? '', texts: seesPrivate ? t.texts : undefined };
    }),
    scores: league.scores.map((x) => ({ ...x, photo: photoSrc(x.photo), thumb: photoSrc(x.thumb) })),
    pendingSubs: Object.fromEntries(Object.entries(league.pendingSubs ?? {}).filter(([teamId]) => admin || teamId === mine))
  };
}

async function adminPhones() {
  const privates = await loadPrivates();
  return new Map([...privates].map(([teamId, p]) => [teamId, { phone1: p.phone1, phone2: p.phone2 }]));
}

export async function getLeague(event: APIGatewayProxyEventV2): Promise<{ version: number; league: League }> {
  const who = await viewer(event);
  const state = await loadLeagueState();
  if (!state) throw new HttpError(404, 'The league has not been set up yet.');
  return { version: state.version, league: viewFor(state.league, who, who?.kind === 'admin' ? await adminPhones() : undefined) };
}

/** Makes a team's action act for that team only, whatever the request says. */
function forTeam(league: League, teamId: string, type: LeagueActionName, payload: unknown): unknown {
  const p = (payload && typeof payload === 'object' ? { ...(payload as Record<string, unknown>) } : payload) as Record<string, unknown> | string | undefined;
  const mustOwn = (ok: boolean) => { if (!ok) throw new HttpError(403, "That isn't your team's."); };
  switch (type) {
    case 'joinLine': if (typeof p === 'object') delete p.teamId; return p;
    case 'requestCheckIn': return typeof p === 'object' ? { subs: p.subs } : undefined;
    case 'leaveLine': case 'startTurn': case 'cancelCheckInRequest': return typeof p === 'string' ? p : undefined;
    case 'answerChallenge': mustOwn(league.challenges.some((c) => c.id === (p as Record<string, unknown>)?.id && c.toTeamId === teamId)); return p;
    case 'forfeitSeen': case 'forgivenSeen': mustOwn((league.forfeits ?? []).some((f) => f.id === p && f.teamId === teamId)); return p;
    case 'noShowSeen': mustOwn((league.noShows ?? []).some((n) => n.id === p && n.teamId === teamId)); return p;
    case 'eliminatedSeen': return teamId;
    case 'answerSeasonTexts': return { ...(p as object), teamId };
    default: return p;
  }
}

export async function postAction(event: APIGatewayProxyEventV2): Promise<{ version: number; league: League }> {
  const body = parseBody<{ type?: string; payload?: unknown }>(event);
  const type = body.type as LeagueActionName;
  const who = await viewer(event);
  if (!who) throw new HttpError(401, 'Log in first.');
  let payload = body.payload;
  if (who.kind === 'team' && TEAM_ACTIONS.has(type)) {
    // forTeam needs the league to check ownership; the store re-reads it when applying.
    const state = await loadLeagueState();
    if (!state) throw new HttpError(404, 'The league has not been set up yet.');
    if (!state.league.teams.some((t) => t.teamId === who.teamId && t.status === 'approved')) throw new HttpError(403, 'Your team is waiting for the league admin to approve it.');
    payload = forTeam(state.league, who.teamId, type, payload);
  } else if (who.kind === 'admin' && (ADMIN_ACTIONS.has(type) || TEAM_ACTIONS.has(type))) {
    if (type === 'forfeitTurn' && payload && typeof payload === 'object') payload = { ...(payload as object), by: 'admin' };
  } else {
    throw new HttpError(403, "You can't do that.");
  }
  const result = await applyAction(who, { type, payload });
  return { version: result.version, league: viewFor(result.league, who, who.kind === 'admin' ? await adminPhones() : undefined) };
}
