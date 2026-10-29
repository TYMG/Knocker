// Phone notifications (Web Push): who gets told what, and the endpoints a phone uses to turn them
// on or off.
//   GET  /api/push/key            the league's public key, which a phone subscribes with
//   POST /api/push/subscribe      {endpoint, keys: {p256dh, auth}}: this phone wants notifications
//   POST /api/push/unsubscribe    {endpoint}: it doesn't any more
// A phone subscribes as whoever it's logged in as: a team or a solo player. Each one's phones are
// one item, PUSH#<league> / team:<id> or solo:<id>, up to 6 phones. A solo player's phones move to
// their team when they pair up.
//
// What's sent comes from comparing the league before and after each saved change (newsFor), so
// every way something can happen (a page, the league clock, an admin) tells people the same way:
//   your turn on a machine, you're next (if you asked), a turn forfeited by the clock, a
//   challenge, checked in, tonight's night opening, a message from the league, and for solo
//   players a match, a request to pair up and "you're a team".
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { limit } from './limits.js';
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { readSoloToken, readToken } from './auth.js';
import { ddb, leagueId, queryAll, table } from './db.js';
import type { League } from './leagueStore.js';
import { HttpError, nowIso, parseBody, text } from './util.js';
import { isPushEndpoint, pushOn, sendPush, vapidPublicKey, type PushSub } from './webpush.js';

const MAX_PHONES = 6;
type Owner = `team:${string}` | `solo:${string}`;
const pk = () => `PUSH#${leagueId()}`;
const key = (owner: Owner) => ({ PK: pk(), SK: owner });
interface PushItem { subs: (PushSub & { at: string })[] }

export interface News { to: Owner[] | 'all-teams'; title: string; body: string; url: string; tag?: string }

function who(event: APIGatewayProxyEventV2): Owner {
  const team = readToken(event);
  if (team) return `team:${team.teamId}`;
  const solo = readSoloToken(event);
  if (solo) return `solo:${solo.soloId}`;
  throw new HttpError(401, 'Log in first, then turn on notifications.');
}

export async function pushKey(): Promise<{ publicKey: string }> {
  if (!pushOn()) throw new HttpError(503, "Phone notifications aren't set up on the server yet.");
  return { publicKey: vapidPublicKey() };
}

const read = async (owner: Owner) => ((await ddb.send(new GetCommand({ TableName: table(), Key: key(owner) }))).Item as PushItem | undefined)?.subs ?? [];
const write = async (owner: Owner, subs: PushItem['subs']) => {
  if (subs.length === 0) await ddb.send(new DeleteCommand({ TableName: table(), Key: key(owner) }));
  else await ddb.send(new PutCommand({ TableName: table(), Item: { ...key(owner), type: 'push', subs } }));
};

export async function subscribe(event: APIGatewayProxyEventV2): Promise<{ ok: true }> {
  const owner = who(event);
  await limit('pushSubscribe', owner);
  const body = parseBody<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(event);
  const endpoint = text(body.endpoint);
  const p256dh = text(body.keys?.p256dh);
  const auth = text(body.keys?.auth);
  if (!isPushEndpoint(endpoint)) throw new HttpError(400, "That phone's notification address isn't one we can send to.");
  if (Buffer.from(p256dh, 'base64url').length !== 65 || Buffer.from(auth, 'base64url').length !== 16) throw new HttpError(400, 'That subscription is missing its keys.');
  // A phone belongs to one owner at a time: take it off anyone else first (a phone that logged out and back in as another team).
  const subs = (await read(owner)).filter((s) => s.endpoint !== endpoint);
  await write(owner, [...subs, { endpoint, p256dh, auth, at: nowIso() }].slice(-MAX_PHONES));
  return { ok: true };
}

export async function unsubscribe(event: APIGatewayProxyEventV2): Promise<{ ok: true }> {
  const owner = who(event);
  const endpoint = text(parseBody<{ endpoint?: string }>(event).endpoint);
  const subs = await read(owner);
  if (subs.some((s) => s.endpoint === endpoint)) await write(owner, subs.filter((s) => s.endpoint !== endpoint));
  return { ok: true };
}

/** A solo player's phones join their new team's (after pairing up). */
export async function movePhones(from: Owner[], to: Owner): Promise<void> {
  const moving = (await Promise.all(from.map(read))).flat();
  if (moving.length === 0) return;
  const kept = (await read(to)).filter((s) => !moving.some((m) => m.endpoint === s.endpoint));
  await write(to, [...kept, ...moving].slice(-MAX_PHONES));
  await Promise.all(from.map((o) => write(o, [])));
}

// ---------- What changed, and who to tell ----------

const teamName = (l: League, id: string) => l.teams.find((t) => t.teamId === id)?.teamName ?? 'A team';
const machineName = (l: League, id: string) => l.machines.find((m) => m.machineId === id)?.name ?? 'a machine';
const isMatch = (l: League, a: string, b: string) => {
  const x = l.waitlist.find((w) => w.id === a), y = l.waitlist.find((w) => w.id === b);
  return !!x?.likes?.includes(b) && !!y?.likes?.includes(a);
};

export function newsFor(before: League, after: League): News[] {
  const news: News[] = [];
  // Lines: your turn, and you're next (for teams who asked to be told).
  for (const line of after.lines) {
    const was = before.lines.find((l) => l.machineId === line.machineId);
    const what = machineName(after, line.machineId);
    if (line.upTeamId && line.turnId && line.turnId !== was?.turnId) {
      news.push({ to: [`team:${line.upTeamId}`], title: `Your turn on ${what}!`, body: 'Start within 5 minutes and tap We started, or you forfeit the turn.', url: '/lines', tag: `turn-${line.machineId}` });
    }
    const next = line.teamIds[1];
    if (next && next !== was?.teamIds[1] && line.notify.includes(next) && was?.teamIds[0] !== next) {
      news.push({ to: [`team:${next}`], title: `You're next on ${what}`, body: 'Head over now: you get 5 minutes to start once it frees up.', url: '/lines', tag: `next-${line.machineId}` });
    }
  }
  // A turn the clock forfeited (an admin's call is made in person).
  const oldForfeits = new Set((before.forfeits ?? []).map((f) => f.id));
  for (const f of after.forfeits ?? []) {
    if (oldForfeits.has(f.id) || f.by !== 'clock') continue;
    news.push({ to: [`team:${f.teamId}`], title: `Turn forfeited on ${machineName(after, f.machineId)}`, body: "You didn't start within 5 minutes. Join the line again to play it.", url: '/' });
  }
  // A challenge, to the team challenged.
  const oldChallenges = new Set(before.challenges.map((c) => c.id));
  for (const c of after.challenges) {
    if (oldChallenges.has(c.id)) continue;
    news.push({ to: [`team:${c.toTeamId}`], title: `${teamName(after, c.fromTeamId)} challenged you`, body: `On ${machineName(after, c.machineId)}, for ${c.stake} ${c.stake === 1 ? 'point' : 'points'}. Answer in the app.`, url: '/challenges' });
  }
  // Checked in by the admin.
  for (const teamId of Object.keys(after.checkIns)) {
    if (!before.checkIns[teamId]) news.push({ to: [`team:${teamId}`], title: "You're checked in", body: 'Join a line and play. Good luck tonight!', url: '/', tag: 'check-in' });
  }
  // Tonight's night opening, and a message from the league: every team.
  const opened = after.weeks.find((w) => w.state === 'open' && before.weeks.find((b) => b.week === w.week)?.state === 'upcoming');
  if (opened) news.push({ to: 'all-teams', title: `League night is on: week ${opened.week}`, body: "Check in on the app when you get to Lyman's.", url: '/', tag: 'night' });
  if (after.message && after.message.postedAt !== before.message?.postedAt) {
    news.push({ to: 'all-teams', title: 'From the league', body: after.message.text, url: '/', tag: 'message' });
  }
  // Solo players: a new match, and a request to pair up.
  for (const w of after.waitlist) {
    for (const otherId of w.likes ?? []) {
      if (w.id < otherId && isMatch(after, w.id, otherId) && !isMatch(before, w.id, otherId)) {
        const other = after.waitlist.find((x) => x.id === otherId)!;
        news.push({ to: [`solo:${w.id}`], title: "It's a match!", body: `You and ${other.name} both want to team up. Ask to pair, or keep swiping.`, url: '/solo' });
        news.push({ to: [`solo:${other.id}`], title: "It's a match!", body: `You and ${w.name} both want to team up. Ask to pair, or keep swiping.`, url: '/solo' });
      }
    }
    const was = before.waitlist.find((x) => x.id === w.id);
    if (w.asked && w.asked !== was?.asked) {
      news.push({ to: [`solo:${w.asked}`], title: `${w.name} wants to pair up with you`, body: "You'll be a team once you say yes.", url: '/solo' });
    }
  }
  return news;
}

/** Two solo players who just became a team: tell them, then move their phones to the team. */
export function soloTeamsMade(before: League, after: League): { team: { teamId: string; teamName: string; players: [string, string] }; solos: [string, string] }[] {
  const gone = before.waitlist.filter((w) => !after.waitlist.some((x) => x.id === w.id));
  const made = after.teams.filter((t) => !before.teams.some((b) => b.teamId === t.teamId));
  return made.flatMap((team) => {
    const solos = gone.filter((w) => team.players.includes(w.name));
    return solos.length === 2 ? [{ team, solos: [solos[0]!.id, solos[1]!.id] as [string, string] }] : [];
  });
}

/** Sends it all. Never throws: a notification that fails must never undo or block a change. */
export async function deliver(before: League, after: League): Promise<void> {
  if (!pushOn()) return;
  try {
    const news = newsFor(before, after);
    const teamsMade = soloTeamsMade(before, after);
    for (const { team, solos } of teamsMade) {
      news.push({ to: solos.map((id) => `solo:${id}` as Owner), title: "You're a team!", body: `${team.teamName}: open the app to pick your team name, photo and PIN together.`, url: '/team/setup' });
    }
    if (news.length === 0 && teamsMade.length === 0) return;
    let everyone: { owner: Owner; subs: PushItem['subs'] }[] | null = null;
    const approved = new Set(after.teams.filter((t) => t.status === 'approved').map((t) => `team:${t.teamId}`));
    const gone = new Map<Owner, Set<string>>();
    const sends: Promise<void>[] = [];
    for (const n of news) {
      let targets: { owner: Owner; subs: PushItem['subs'] }[];
      if (n.to === 'all-teams') {
        everyone ??= (await queryAll<{ SK: string; subs: PushItem['subs'] }>({ KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': pk() } }))
          .map((i) => ({ owner: i.SK as Owner, subs: i.subs }));
        targets = everyone.filter((t) => approved.has(t.owner));
      } else {
        targets = await Promise.all(n.to.map(async (owner) => ({ owner, subs: await read(owner) })));
      }
      for (const t of targets) {
        for (const sub of t.subs) {
          sends.push(sendPush(sub, { title: n.title, body: n.body, url: n.url, tag: n.tag }).then((r) => {
            if (r === 'gone') (gone.get(t.owner) ?? gone.set(t.owner, new Set()).get(t.owner)!).add(sub.endpoint);
          }, (err: Error) => console.error('Push failed', err.name)));
        }
      }
    }
    await Promise.all(sends);
    for (const [owner, endpoints] of gone) await write(owner, (await read(owner)).filter((s) => !endpoints.has(s.endpoint)));
    for (const { team, solos } of teamsMade) await movePhones(solos.map((id) => `solo:${id}` as Owner), `team:${team.teamId}`);
    if (sends.length) console.log('Push sent', JSON.stringify({ messages: news.length, phones: sends.length, removed: [...gone.values()].reduce((n, s) => n + s.size, 0) }));
  } catch (err) {
    console.error('Push delivery failed', (err as Error).name);
  }
}
