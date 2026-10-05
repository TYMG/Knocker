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

export const store = configureStore({
  reducer: { auth: authSlice.reducer, [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware)
});

store.subscribe(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().auth));
  } catch {
    // Private browsing can block storage; the session still works until the tab closes.
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
