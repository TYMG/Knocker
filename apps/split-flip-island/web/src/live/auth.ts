// Login state for the real API: one slice for a team, one for an admin. Not in the store while
// the app runs on sample data. To wire a page back, add these two reducers and api.reducer
// (plus api.middleware) to store.ts.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Team } from '../../../shared/types';

interface AuthState {
  token: string | null;
  team: Team | null;
}

export const STORAGE_KEY = 'sfi-auth';
export const ADMIN_STORAGE_KEY = 'sfi-admin';

function load<T>(key: string, empty: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return empty;
  }
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: () => load<AuthState>(STORAGE_KEY, { token: null, team: null }),
  reducers: {
    loggedIn: (_state, action: PayloadAction<{ token: string; team: Team }>) => action.payload,
    loggedOut: () => ({ token: null, team: null })
  }
});

export const { loggedIn, loggedOut } = authSlice.actions;

// Admins log in separately from teams, each with their own name and password.
interface AdminState {
  token: string | null;
  name: string | null;
}

export const adminSlice = createSlice({
  name: 'admin',
  initialState: () => load<AdminState>(ADMIN_STORAGE_KEY, { token: null, name: null }),
  reducers: {
    adminLoggedIn: (_state, action: PayloadAction<{ token: string; name: string }>) => action.payload,
    adminLoggedOut: () => ({ token: null, name: null })
  }
});

export const { adminLoggedIn, adminLoggedOut } = adminSlice.actions;
