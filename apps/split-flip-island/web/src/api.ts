import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  AuditResponse, AuthResponse, LoginRequest, MeResponse, RegisterRequest, Score, StandingsResponse,
  SubmitScoreRequest, UploadResponse
} from '../../shared/types';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as { auth: { token: string | null } }).auth.token;
      if (token) headers.set('x-team-token', token);
      return headers;
    }
  }),
  tagTypes: ['Me', 'Standings', 'Audit'],
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
    audit: build.query<AuditResponse, void>({ query: () => 'audit', providesTags: ['Audit'] })
  })
});

export const {
  useCreateUploadMutation, useRegisterMutation, useLoginMutation, useMeQuery, useSubmitScoreMutation,
  useStandingsQuery, useAuditQuery
} = api;

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
