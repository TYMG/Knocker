import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { sampleReducer, saveSample } from './sample/slice';
import type { Role } from './sample/types';

// Small pieces of screen state shared by every page.
const uiSlice = createSlice({
  name: 'ui',
  initialState: { toast: null as string | null, tourOpen: false, pendingRole: null as Role | null },
  reducers: {
    /** A short confirmation at the bottom of the screen: "Checked in Slam Tilt". */
    showToast: (state, action: PayloadAction<string>) => {
      state.toast = action.payload;
    },
    hideToast: (state) => {
      state.toast = null;
    },
    setTourOpen: (state, action: PayloadAction<boolean>) => {
      state.tourOpen = action.payload;
    },
    /** Who to become once the app has left the admin pages. See FinishRoleSwitch in App.tsx. */
    setPendingRole: (state, action: PayloadAction<Role | null>) => {
      state.pendingRole = action.payload;
    }
  }
});

export const { showToast, hideToast, setTourOpen, setPendingRole } = uiSlice.actions;

// The app runs on a made-up league for now (see sample/README.md). The real API and its login
// state are in live/, ready to be added back here.
export const store = configureStore({
  reducer: { sample: sampleReducer, ui: uiSlice.reducer }
});

let saved = store.getState().sample;
store.subscribe(() => {
  const next = store.getState().sample;
  if (next === saved) return;
  saved = next;
  saveSample(next);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
