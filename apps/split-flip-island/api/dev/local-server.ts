// Dev only (see dev/build-local.mjs): the real API handler on an in-memory database, plus the built web app.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
process.env.TOKEN_SECRET = 'harness-token-secret-harness-token-secret';
process.env.ORIGIN_SECRET = 'harness-origin';
process.env.PHOTOS_BUCKET = 'photos';
process.env.TABLE_NAME = 'harness';
process.env.LEAGUE_ID = 'sfi-s1';
const { fakeTable } = await import('./fake-db.ts');
const { handler } = await import('../src/index.ts');
const { createLeagueState } = await import('../src/leagueStore.ts');
const { hashPassword, hashPin } = await import('../src/auth.ts');
const { newLeague } = await import('../../shared/league/new.ts');
const { easternDate } = await import('../../shared/league/time.ts');

const L = 'LEAGUE#sfi-s1';
const now = new Date();
const today = easternDate(now.toISOString());
// Tonight's night "opens" 10 minutes from now, so it can be opened right away.
const et = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(now.getTime() + 10 * 60000));
const league = newLeague({ firstNight: today, opensAt: et, closesAt: '23:59', machines: [{ machineId: 'godzilla', name: 'Godzilla' }, { machineId: 'venom', name: 'Venom' }] }, now.toISOString());
const team = (teamId: string, teamName: string) => ({ teamId, teamName, players: ['Riley', 'Sam'] as [string, string], pronouns: ['she/her', ''] as [string, string], phone1: '', phone2: '', texts: [true, false] as [boolean, boolean], photo: '', status: 'approved' as const, createdAt: now.toISOString(), firstWeek: 1 });
league.teams = [team('left-and-right', 'Left & Right'), team('tilt-me-tender', 'Tilt Me Tender')];
await createLeagueState(league, 'harness');
for (const [id, name, n] of [['left-and-right', 'Left & Right', '01'], ['tilt-me-tender', 'Tilt Me Tender', '02']]) {
  fakeTable.put({ PK: L, SK: 'TEAMNAME#' + name.toLowerCase(), type: 'teamName', teamId: id });
  fakeTable.put({ PK: L, SK: 'TEAM#' + id + '#PRIVATE', type: 'private', pinHash: hashPin('4821'), phone1: '20255501' + n, phone2: '20255502' + n, smsOptIn1: true });
}
fakeTable.put({ PK: 'ADMIN#sfi-s1', SK: 'ADMIN#matt', type: 'admin', name: 'Matt', passHash: hashPassword('correct horse battery'), tokenVersion: 1, createdAt: now.toISOString(), owner: true });

const DIST = process.argv[2]!;
const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const url = new URL(req.url!, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, String(v)]));
    const out = await handler({ rawPath: url.pathname, headers: { ...headers, 'x-origin-verify': 'harness-origin' }, body: chunks.length ? Buffer.concat(chunks).toString() : undefined, isBase64Encoded: false, requestContext: { http: { method: req.method } } } as never) as { statusCode: number; body: string; headers?: Record<string, string> };
    res.writeHead(out.statusCode, { 'content-type': 'application/json' });
    res.end(out.body);
    return;
  }
  let file = join(DIST, url.pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(4190, () => console.log('harness on 4190, opens at', et));
