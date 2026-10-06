// Tests the CloudFront gate function (infra/gate.js) by loading it with stand-ins for the
// two modules CloudFront provides.
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { gateRecord, normalizePassword } from '../scripts/gate-record.js';

type Headers = Record<string, { value: string }>;
interface Request { uri: string; method: string; headers: Headers; cookies: Record<string, { value: string }> }
interface Reply { statusCode: number; headers: Headers; body: { data: string }; cookies?: Record<string, { value: string; attributes: string }> }
type Handler = (event: { request: Request }) => Promise<Request | Reply>;

const source = readFileSync(fileURLToPath(new URL('../../infra/gate.js', import.meta.url)), 'utf8')
  .replace(/^import .*$/gm, '');

function load(stored: string | undefined): Handler {
  const cf = { kvs: () => ({ get: async () => { if (stored === undefined) throw new Error('KeyNotFound'); return stored; } }) };
  return new Function('cf', 'crypto', `${source}\nreturn handler;`)(cf, crypto) as Handler;
}

const req = (uri: string, extra: Partial<Request> = {}): { request: Request } => ({
  request: { uri, method: 'GET', headers: {}, cookies: {}, ...extra }
});
const clientHash = (password: string) => crypto.createHash('sha256').update(normalizePassword(password)).digest('hex');
const isReply = (r: Request | Reply): r is Reply => 'statusCode' in r;

const PASSWORD = 'tavo-miku-seda-4821';
const record = JSON.stringify(gateRecord(PASSWORD));

async function enter(handler: Handler, password: string) {
  const out = await handler(req('/gate/enter', { headers: { 'x-demo-pass': { value: clientHash(password) } } }));
  if (!isReply(out)) throw new Error('expected a reply');
  return out;
}

describe('demo password gate', () => {
  it('shows only the password page to a visitor without a pass', async () => {
    const handler = load(record);
    for (const uri of ['/', '/standings', '/admin/teams', '/gate.html']) {
      const out = await handler(req(uri));
      expect(isReply(out)).toBe(false);
      expect((out as Request).uri).toBe('/gate.html');
    }
  });

  it('refuses the app files, the API and photos without a pass', async () => {
    const handler = load(record);
    const asset = await handler(req('/assets/index-abc.js'));
    const api = await handler(req('/api/teams', { method: 'POST' }));
    const photo = await handler(req('/leagues/sfi-s1/teams/x.jpg'));
    expect((asset as Reply).statusCode).toBe(403);
    expect((photo as Reply).statusCode).toBe(403);
    expect((api as Reply).statusCode).toBe(401);
    expect(JSON.parse((api as Reply).body.data).gate).toBe(true);
    // index.html itself is a file with an extension, so it is refused too.
    expect(((await handler(req('/index.html'))) as Reply).statusCode).toBe(403);
  });

  it('rejects a wrong password and sets no cookie', async () => {
    const out = await enter(load(record), 'tavo-miku-seda-4822');
    expect(out.statusCode).toBe(401);
    expect(out.cookies).toBeUndefined();
  });

  it('rejects a missing or malformed password header', async () => {
    const handler = load(record);
    expect(((await handler(req('/gate/enter'))) as Reply).statusCode).toBe(401);
    const junk = await handler(req('/gate/enter', { headers: { 'x-demo-pass': { value: PASSWORD } } }));
    expect((junk as Reply).statusCode).toBe(401);
  });

  it('accepts the right password, ignoring case and extra spaces, and lets the visitor in', async () => {
    const handler = load(record);
    const out = await enter(handler, '  TAVO-miku-seda-4821 ');
    expect(out.statusCode).toBe(200);
    const cookie = out.cookies!.sfi_gate;
    expect(cookie.attributes).toContain('HttpOnly');
    expect(cookie.attributes).toContain('Secure');

    const cookies = { sfi_gate: { value: cookie.value } };
    const page = await handler(req('/standings', { cookies }));
    expect((page as Request).uri).toBe('/index.html');
    const asset = await handler(req('/assets/index-abc.js', { cookies }));
    expect((asset as Request).uri).toBe('/assets/index-abc.js');
    const api = await handler(req('/api/standings', { cookies }));
    expect((api as Request).uri).toBe('/api/standings');
    const photo = await handler(req('/leagues/sfi-s1/teams/x.jpg', { cookies }));
    expect((photo as Request).uri).toBe('/leagues/sfi-s1/teams/x.jpg');
  });

  it('refuses a forged, altered or expired cookie', async () => {
    const handler = load(record);
    const good = (await enter(handler, PASSWORD)).cookies!.sfi_gate.value;
    const [expires, signature] = good.split('.');
    const key = (JSON.parse(record) as { key: string }).key;
    const past = String(Math.floor(Date.now() / 1000) - 60);
    const expired = `${past}.${crypto.createHmac('sha256', key).update(past).digest('hex')}`;
    const bad = [
      `${Number(expires) + 1}.${signature}`, // later expiry, old signature
      `${expires}.${signature.replace(/.$/, signature.endsWith('0') ? '1' : '0')}`,
      `${expires}.`,
      `${expires}`,
      `9999999999.${crypto.createHmac('sha256', 'guess').update('9999999999').digest('hex')}`,
      expired
    ];
    for (const value of bad) {
      const out = await handler(req('/api/standings', { cookies: { sfi_gate: { value } } }));
      expect((out as Reply).statusCode, value).toBe(401);
    }
  });

  it('signs everyone out when the password is changed', async () => {
    const before = load(record);
    const cookie = (await enter(before, PASSWORD)).cookies!.sfi_gate.value;
    const after = load(JSON.stringify(gateRecord('a-brand-new-password')));
    const out = await after(req('/api/standings', { cookies: { sfi_gate: { value: cookie } } }));
    expect((out as Reply).statusCode).toBe(401);
    expect((await enter(after, PASSWORD)).statusCode).toBe(401);
    expect((await enter(after, 'a-brand-new-password')).statusCode).toBe(200);
  });

  it('stays locked when no password has been set or the record is unreadable', async () => {
    for (const stored of [undefined, 'not json', '{}', JSON.stringify({ salt: 'a', hash: 'b', key: 'short' })]) {
      const handler = load(stored);
      expect((await enter(handler, PASSWORD)).statusCode).toBe(503);
      expect(((await handler(req('/api/standings'))) as Reply).statusCode).toBe(401);
      expect(((await handler(req('/'))) as Request).uri).toBe('/gate.html');
    }
  });
});
