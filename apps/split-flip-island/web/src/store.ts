import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Team } from '../../shared/types';
import { api } from './api';

interface AuthState {
  token: string | null;
  team: Team | null;
}

const STORAGE_KEY = 'sfi-auth';

function loadAuth(): AuthState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as AuthState;
  } catch {
    return { token: null, team: null };
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuth,
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

const ADMIN_STORAGE_KEY = 'sfi-admin';

function loadAdmin(): AdminState {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) ?? '') as AdminState;
  } catch {
    return { token: null, name: null };
  }
}

const adminSlice = createSlice({
  name: 'admin',
  initialState: loadAdmin,
  reducers: {
    adminLoggedIn: (_state, action: PayloadAction<{ token: string; name: string }>) => action.payload,
    adminLoggedOut: () => ({ token: null, name: null })
  }
});

export const { adminLoggedIn, adminLoggedOut } = adminSlice.actions;

export const store = configureStore({
  reducer: { auth: authSlice.reducer, admin: adminSlice.reducer, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware)
});

store.subscribe(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().auth));
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(store.getState().admin));
  } catch {
    // Private browsing can block storage; the session still works until the tab closes.
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
