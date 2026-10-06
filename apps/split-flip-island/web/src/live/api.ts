import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type {
  AdminAuthResponse, AdminLoginRequest, AdminTeamsResponse, AuditResponse, AuthResponse, LoginRequest, MeResponse,
  RegisterRequest, RemoveTeamRequest, Score, StandingsResponse, SubmitScoreRequest, UploadResponse
} from '../../../shared/types';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as { auth: { token: string | null }; admin: { token: string | null } };
    if (state.auth.token) headers.set('x-team-token', state.auth.token);
    if (state.admin.token) headers.set('x-admin-token', state.admin.token);
    return headers;
  }
});

/**
 * The site sits behind a demo password. If the pass has run out, or the password was changed,
 * the front door answers 401 with "gate": true. Reloading shows the password page.
 */
function reloadForGate() {
  try {
    // Guard against a reload loop if something is misconfigured.
    const last = Number(sessionStorage.getItem('sfi-gate-reload') ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem('sfi-gate-reload', String(Date.now()));
  } catch {
    // Storage blocked: reload anyway.
  }
  window.location.reload();
}

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, apiCtx, extra) => {
  const result = await rawBaseQuery(args, apiCtx, extra);
  if (result.error?.status === 401 && (result.error.data as { gate?: boolean } | undefined)?.gate) reloadForGate();
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Standings', 'Audit', 'AdminTeams'],
  endpoints: (build) => ({
    createUpload: build.mutation<UploadResponse, { purpose: 'team' | 'score' }>({
      query: (body) => ({ url: 'uploads', method: 'POST', body })
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: 'teams', method: 'POST', body }),
      invalidatesTags: ['Standings', 'Audit']
    }),
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: 'login', method: 'POST', body }),
      invalidatesTags: ['Me']
    }),
    me: build.query<MeResponse, void>({ query: () => 'me', providesTags: ['Me'] }),
    submitScore: build.mutation<Score, SubmitScoreRequest>({
      query: (body) => ({ url: 'scores', method: 'POST', body }),
      invalidatesTags: ['Me', 'Standings', 'Audit']
    }),
    standings: build.query<StandingsResponse, void>({ query: () => 'standings', providesTags: ['Standings'] }),
    audit: build.query<AuditResponse, void>({ query: () => 'audit', providesTags: ['Audit'] }),

    // ---- Admin ----
    adminLogin: build.mutation<AdminAuthResponse, AdminLoginRequest>({
      query: (body) => ({ url: 'admin/login', method: 'POST', body })
    }),
    adminTeams: build.query<AdminTeamsResponse, void>({ query: () => 'admin/teams', providesTags: ['AdminTeams'] }),
    approveTeam: build.mutation<{ ok: true }, string>({
      query: (teamId) => ({ url: `admin/teams/${teamId}/approve`, method: 'POST' }),
      invalidatesTags: ['AdminTeams', 'Standings', 'Audit', 'Me']
    }),
    removeTeam: build.mutation<{ ok: true }, { teamId: string } & RemoveTeamRequest>({
      query: ({ teamId, reason }) => ({ url: `admin/teams/${teamId}/remove`, method: 'POST', body: { reason } }),
      invalidatesTags: ['AdminTeams', 'Audit']
    })
  })
});

export const {
  useCreateUploadMutation, useRegisterMutation, useLoginMutation, useMeQuery, useSubmitScoreMutation,
  useStandingsQuery, useAuditQuery, useAdminLoginMutation, useAdminTeamsQuery, useApproveTeamMutation,
  useRemoveTeamMutation
} = api;

/** True when the API said the caller is not logged in (or no longer is). */
export function isSignedOut(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { status, data } = err as { status?: unknown; data?: { gate?: boolean } };
  // A 401 from the demo password gate is about the site, not about this team or admin.
  return status === 401 && !data?.gate;
}

/** Pulls the API's error message out of an RTK Query error. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err && typeof err === 'object') {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
    if ((err as { status?: unknown }).status === 'FETCH_ERROR') return "Can't reach the league server. Check your connection.";
    if (err instanceof Error) return err.message;
  }
  return fallback;
}

/** Uploads a photo straight to S3 using the presigned POST from the API. */
export async function uploadPhoto(target: UploadResponse['photo'], blob: Blob): Promise<void> {
  const form = new FormData();
  Object.entries(target.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', blob, 'photo.jpg');
  const res = await fetch(target.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Photo upload failed. Check your connection and try again.');
}
