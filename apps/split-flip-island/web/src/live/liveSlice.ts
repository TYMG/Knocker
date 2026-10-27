// Whether the app shows the live league (from the server) or the sample league, and how the
// last refresh went. The switch is remembered on this phone or computer.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

const ON_KEY = 'sfi-live-on';
const savedOn = () => { try { return localStorage.getItem(ON_KEY) === '1'; } catch { return false; } };
export const saveOn = (on: boolean) => { try { localStorage.setItem(ON_KEY, on ? '1' : '0'); } catch { /* fine */ } };

export interface LiveState {
  on: boolean;
  /** Version of the league last loaded from the server; 0 before the first load. */
  version: number;
  /** Set when the last refresh failed (no signal, or no league set up yet). */
  error: string;
  /** A change is on its way to the server. */
  sending: boolean;
}

const liveSlice = createSlice({
  name: 'live',
  initialState: (): LiveState => ({ on: savedOn(), version: 0, error: '', sending: false }),
  reducers: {
    setLiveOn: (s, a: PayloadAction<boolean>) => { s.on = a.payload; s.version = 0; s.error = ''; },
    loaded: (s, a: PayloadAction<number>) => { s.version = a.payload; s.error = ''; },
    failed: (s, a: PayloadAction<string>) => { s.error = a.payload; },
    sending: (s, a: PayloadAction<boolean>) => { s.sending = a.payload; }
  }
});

export const liveActions = liveSlice.actions;
export const liveReducer = liveSlice.reducer;
