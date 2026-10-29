// The league, served from the one rule book.
//   GET  /api/league          the league as the caller may see it (visitor, team or admin)
//   POST /api/league/action   { type, payload } applies one rule as the logged-in team or admin
//
// Actions that touch private data (sign-up, posting a score with a photo, approval, PINs, text
// settings, removing a sign-up, pairing solo players) are not allowed here: they have their own
// endpoints, which save the private part and then apply the same rule.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { SIGNED_OUT, stillSignedIn } from './session.js';
import { limit, limitAddress } from './limits.js';
import type { LeagueActionName } from '../../shared/league/rules.js';
import { ADMIN_ACTIONS, TEAM_ACTIONS } from '../../shared/league/permissions.js';
import { requireAdmin } from './admin.js';
import { issueToken, readAdminToken, readSoloToken, readToken } from './auth.js';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, leagueId, table } from './db.js';
import { fits } from '../../shared/league/match.js';
import type { SWaitlistEntry } from '../../shared/league/types.js';
import { soloTeamKey } from './waitlist.js';
import { teamPhoto } from '../../shared/league/art.js';
import { loadPrivates } from './handlers.js';
import { applyAction, loadLeagueState, type Actor, type League } from './leagueStore.js';
import { runLeagueClock } from './leagueClock.js';
import { HttpError, nowIso, parseBody, photoUrl } from './util.js';

/** A saved photo path becomes the address the pages load it from (through the site's front door). */
const photoSrc = (key: string | undefined) => (key?.startsWith('leagues/') ? photoUrl(key) ?? undefined : key || undefined);

/** Who is asking: an admin (checked against the database), a team, or a visitor. */
async function viewer(event: APIGatewayProxyEventV2, league?: League | null): Promise<(Actor & { owner?: boolean }) | null> {
  if (readAdminToken(event)) {
    const admin = await requireAdmin(event);
    return { kind: 'admin', name: admin.name, owner: admin.owner === true };
  }
  const team = readToken(event);
  if (team) {
    // Signed out by a Reset PIN since this phone logged in: it has to log in again.
    const l = league === undefined ? (await loadLeagueState())?.league : league;
    if (l && !stillSignedIn(team, l)) throw SIGNED_OUT();
    return { kind: 'team', teamId: team.teamId };
  }
  const solo = readSoloToken(event);
  return solo ? { kind: 'solo', soloId: solo.soloId } : null;
}

/**
 * The waitlist as one viewer may see it. Admins: everyone, with names and answers, and which
 * others each one fits (never who they asked for, or their swipes). A solo player: themselves in
 * full, plus only the players who fit them, nameless, except matches (both swiped right), who come
 * with name and pronouns and whether they've asked to pair. Nobody learns who passed on them.
 * Everyone else: just how many are waiting.
 */
function waitlistFor(waitlist: SWaitlistEntry[], who: (Actor & { owner?: boolean }) | null): SWaitlistEntry[] {
  if (who?.kind === 'admin') {
    return waitlist.map(({ wants, likes: _l, passes: _p, asked: _a, ...w }) => ({ ...w, fitsWith: waitlist.filter((o) => o.id !== w.id && fits({ ...w, wants }, o)).map((o) => o.id) }));
  }
  if (who?.kind === 'solo') {
    const me = waitlist.find((w) => w.id === who.soloId);
    if (me) {
      return waitlist.flatMap((w) => {
        if (w.id === me.id) return [me];
        if (!w.traits || !fits(me, w)) return [];
        const matched = !!me.likes?.includes(w.id) && !!w.likes?.includes(me.id);
        return [matched
          ? { id: w.id, name: w.name, ...(w.pronouns ? { pronouns: w.pronouns } : {}), at: w.at, traits: w.traits, matched: true, askedMe: w.asked === me.id }
          : { id: w.id, name: '', at: w.at, traits: w.traits }];
      });
    }
  }
  return waitlist.map((w) => ({ id: w.id, name: '', at: w.at }));
}

/**
 * The league as one viewer may see it. Phone numbers only for admins; each team's text settings
 * and pending sub names only for that team and admins. The viewer fields say who is looking.
 */
export function viewFor(league: League, who: (Actor & { owner?: boolean }) | null, phones?: Map<string, { phone1: string; phone2: string }>): League {
  const admin = who?.kind === 'admin';
  const mine = who?.kind === 'team' ? who.teamId : '';
  return {
    ...league,
    now: nowIso(),
    role: admin ? 'admin' : mine ? 'team' : 'visitor',
    myTeamId: mine,
    mySoloId: who?.kind === 'solo' && league.waitlist.some((w) => w.id === who.soloId) ? who.soloId : undefined,
    waitlist: waitlistFor(league.waitlist, who),
    adminName: admin ? who.name : '',
    adminOnTeam: false,
    adminIsOwner: admin && who.owner === true,
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

/**
 * No league yet (or just started over): says so, with who is looking, so an admin's pages can
 * offer the setup form.
 */
export interface NoLeague { version: 0; league: null; viewer: { role: 'visitor' | 'team' | 'admin'; adminName: string; adminIsOwner: boolean } }

export async function getLeague(event: APIGatewayProxyEventV2): Promise<{ version: number; league: League; teamToken?: string; soloGone?: boolean } | NoLeague> {
  let state = await loadLeagueState();
  // Whatever the league clock has due (open or close the night, run-out turns) happens first.
  if (state && (await runLeagueClock(state.league))) state = await loadLeagueState();
  let who = await viewer(event, state?.league ?? null);
  if (!state) {
    return {
      version: 0, league: null,
      viewer: { role: who?.kind === 'admin' ? 'admin' : who?.kind === 'team' ? 'team' : 'visitor', adminName: who?.kind === 'admin' ? who.name : '', adminIsOwner: who?.kind === 'admin' && who.owner === true }
    };
  }
  // A solo player who is now on a team (picked each other, or the admin paired them): their phone
  // switches to the team. One who left the waitlist goes back to being a visitor.
  let handoff: { teamToken?: string; soloGone?: boolean } = {};
  const soloId = who?.kind === 'solo' ? who.soloId : '';
  if (soloId && !state.league.waitlist.some((w) => w.id === soloId)) {
    const teamId = ((await ddb.send(new GetCommand({ TableName: table(), Key: soloTeamKey(soloId) }))).Item?.teamId as string | undefined);
    if (teamId && state.league.teams.some((t) => t.teamId === teamId)) {
      handoff = { teamToken: issueToken(teamId, leagueId()) };
      who = { kind: 'team', teamId };
    } else {
      handoff = { soloGone: true };
      who = null;
    }
  }
  return { version: state.version, league: viewFor(state.league, who, who?.kind === 'admin' ? await adminPhones() : undefined), ...handoff };
}

/** Makes a team's action act for that team only, whatever the request says. */
function forTeam(league: League, teamId: string, type: LeagueActionName, payload: unknown): unknown {
  const p = (payload && typeof payload === 'object' ? { ...(payload as Record<string, unknown>) } : payload ?? undefined) as Record<string, unknown> | string | undefined;
  const mustOwn = (ok: boolean) => { if (!ok) throw new HttpError(403, "That isn't your team's."); };
  switch (type) {
    case 'joinLine': if (typeof p === 'object') delete p.teamId; return p;
    case 'requestCheckIn': return typeof p === 'object' ? { subs: p.subs } : undefined;
    // These take a team id; a team can only ever act for itself (the rule uses the caller's own).
    case 'leaveLine': case 'startTurn': case 'cancelCheckInRequest': return undefined;
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
  await limit('actions', who.kind === 'team' ? `team:${who.teamId}` : who.kind === 'admin' ? `admin:${who.name}` : 'other');
  await limitAddress(event, 'addressActions');
  let payload = body.payload;
  // The clock first: a team can't start a turn that already ran out, or act on a night that has closed.
  await runLeagueClock();
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
