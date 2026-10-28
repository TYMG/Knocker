// Talking to the league server. Used only when the "Live league" switch is on; the sample
// league never sends anything. Tokens are kept on this phone: a team's for 60 days (the server's
// own limit), an admin's until the browser is closed.
import type { AuthResponse, AdminAuthResponse, UploadResponse, PresignedUpload, RegisterRequest } from '../../../shared/types';
import type { SampleState } from '../sample/types';
import { resizeImage } from '../lib/photos';

const TEAM_KEY = 'sfi-live-team';
const ADMIN_KEY = 'sfi-live-admin';

const read = (store: Storage, key: string) => { try { return store.getItem(key) ?? ''; } catch { return ''; } };
const write = (store: Storage, key: string, value: string) => { try { if (value) store.setItem(key, value); else store.removeItem(key); } catch { /* private window */ } };

export const tokens = {
  team: () => read(localStorage, TEAM_KEY),
  admin: () => read(sessionStorage, ADMIN_KEY),
  setTeam: (t: string) => write(localStorage, TEAM_KEY, t),
  setAdmin: (t: string) => write(sessionStorage, ADMIN_KEY, t),
  clear: () => { write(localStorage, TEAM_KEY, ''); write(sessionStorage, ADMIN_KEY, ''); }
};

export class LiveError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  // An admin who is also signed in as a team acts as the admin.
  if (tokens.admin()) headers['x-admin-token'] = tokens.admin();
  else if (tokens.team()) headers['x-team-token'] = tokens.team();
  const res = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A token the server no longer accepts: forget it, so the next call goes as a visitor.
    if (res.status === 401 && (tokens.admin() || tokens.team()) && !path.includes('login')) tokens.clear();
    throw new LiveError((data as { error?: string }).error ?? `The league server said ${res.status}.`, res.status);
  }
  return data as T;
}

export interface LeagueResponse { version: number; league: SampleState }
/** What GET /api/league says when there is no league yet. */
export interface NoLeagueResponse { version: 0; league: null; viewer: { role: 'visitor' | 'team' | 'admin'; adminName: string; adminIsOwner: boolean } }

export const live = {
  league: () => call<LeagueResponse | NoLeagueResponse>('league'),
  action: (type: string, payload: unknown) => call<LeagueResponse>('league/action', { type, payload }),

  async logIn(teamName: string, pin: string) {
    const r = await call<AuthResponse>('login', { teamName, pin });
    tokens.setTeam(r.token);
    return r;
  },
  async adminLogIn(name: string, password: string) {
    const r = await call<AdminAuthResponse>('admin/login', { name, password });
    tokens.setAdmin(r.token);
    return r;
  },
  logOut: () => tokens.clear(),

  /** Sign-up: the photo goes straight to storage first, then the team is created with it. */
  async signUp(request: Omit<RegisterRequest, 'photoKey'>, photoDataUrl: string) {
    const up = await call<UploadResponse>('uploads', { purpose: 'team' });
    await upload(up.photo, await dataUrlToBlob(photoDataUrl));
    const r = await call<AuthResponse>('teams', { ...request, photoKey: up.photo.key });
    tokens.setTeam(r.token);
    return r;
  },

  /** A score: the photo and a small copy go to storage, then the score is posted with them. */
  async submitScore(machineId: string, score: number, photoDataUrl: string) {
    const up = await call<UploadResponse>('uploads', { purpose: 'score' });
    const photo = await dataUrlToBlob(photoDataUrl);
    await upload(up.photo, photo);
    await upload(up.thumb!, await resizeImage(photo, 320, 0.75));
    return call<{ version: number }>('scores', { machineId, score, photoKey: up.photo.key, thumbKey: up.thumb!.key });
  },

  /** An admin enters a score for a team: the photo (if any) uploads first. */
  async adminEnterScore(p: { teamId: string; machineId: string; score: number; reason: string; noPhoto: boolean }, photoDataUrl?: string) {
    let keys: { photoKey?: string; thumbKey?: string } = {};
    if (!p.noPhoto && photoDataUrl) {
      const up = await call<UploadResponse>('uploads', { purpose: 'score', teamId: p.teamId });
      const photo = await dataUrlToBlob(photoDataUrl);
      await upload(up.photo, photo);
      await upload(up.thumb!, await resizeImage(photo, 320, 0.75));
      keys = { photoKey: up.photo.key, thumbKey: up.thumb!.key };
    }
    return call<{ version: number }>('admin/scores', { ...p, ...keys });
  },

  joinWaitlist: (body: { name: string; pronouns: string; phone: string; texts: boolean }) => call<{ ok: true; waiting: number }>('waitlist', body),
  pairWaitlist: (ids: [string, string]) => call<{ teamId: string; teamName: string; pin: string }>('admin/waitlist/pair', { ids }),

  changePin: (currentPin: string, newPin: string) => call<{ ok: true }>('me/pin', { currentPin, newPin }),
  setTexts: (player: 0 | 1, optIn: boolean) => call<{ texts: [boolean, boolean] }>('me/texts', { player, optIn }),
  approve: (teamId: string) => call<{ ok: true }>(`admin/teams/${teamId}/approve`, {}),
  remove: (teamId: string, reason: string) => call<{ ok: true }>(`admin/teams/${teamId}/remove`, { reason }),
  resetPin: (teamId: string) => call<{ pin: string }>(`admin/teams/${teamId}/reset-pin`, {}),
  setupLeague: (body: { firstNight: string; opensAt: string; closesAt: string; machines: string[]; teamCap: number }) => call<{ ok: true }>('admin/league/setup', body),
  startOver: (confirm: string) => call<{ deleted: number }>('admin/league/start-over', { confirm })
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

async function upload(target: PresignedUpload, file: Blob) {
  const form = new FormData();
  for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
  form.append('file', file);
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (!res.ok) throw new LiveError("Couldn't upload the photo. Check your signal and try again.", res.status);
}
