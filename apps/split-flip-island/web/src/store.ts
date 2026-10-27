import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { sampleReducer, saveSample } from './sample/slice';
import { liveReducer } from './live/liveSlice';
import { liveMiddleware } from './live/sync';
import type { Role } from './sample/types';

const CALM_KEY = 'sfi-calm';
function savedCalm(): boolean {
  try {
    return window.localStorage.getItem(CALM_KEY) === '1';
  } catch {
    return false;
  }
}

const POPUPS_KEY = 'sfi-dr-popups';
function savedPopups(): boolean {
  try {
    return window.localStorage.getItem(POPUPS_KEY) !== '0';
  } catch {
    return true;
  }
}

// Small pieces of screen state shared by every page.
const uiSlice = createSlice({
  name: 'ui',
  initialState: { toast: null as string | null, tourOpen: false, pendingRole: null as Role | null, calm: savedCalm(), drPopups: savedPopups(), ordersOpen: false },
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
    },
    /** Calm mode: effects off. Remembered on this phone or computer. See ui/calm.ts. */
    setCalm: (state, action: PayloadAction<boolean>) => {
      state.calm = action.payload;
    },
    /** Whether the Love Dr. may pop up on its own. Remembered on this phone or computer. */
    setDrPopups: (state, action: PayloadAction<boolean>) => {
      state.drPopups = action.payload;
    },
    /** Opens or closes the Doctor's orders pop-up by hand. See layout/DoctorsOrdersPopup.tsx. */
    setOrdersOpen: (state, action: PayloadAction<boolean>) => {
      state.ordersOpen = action.payload;
    }
  }
});

export const { showToast, hideToast, setTourOpen, setPendingRole, setCalm, setDrPopups, setOrdersOpen } = uiSlice.actions;

// The app runs on a made-up league for now (see sample/README.md). The real API and its login
// state are in live/, ready to be added back here.
export const store = configureStore({
  reducer: { sample: sampleReducer, ui: uiSlice.reducer, live: liveReducer },
  middleware: (getDefault) => getDefault().concat(liveMiddleware)
});

let savedCalmValue = store.getState().ui.calm;
let savedPopupsValue = store.getState().ui.drPopups;
let saved = store.getState().sample;
store.subscribe(() => {
  const popups = store.getState().ui.drPopups;
  if (popups !== savedPopupsValue) {
    savedPopupsValue = popups;
    try {
      window.localStorage.setItem(POPUPS_KEY, popups ? '1' : '0');
    } catch {
      // Storage can be blocked. The choice then lasts until the page is closed.
    }
  }
  const calm = store.getState().ui.calm;
  if (calm !== savedCalmValue) {
    savedCalmValue = calm;
    try {
      window.localStorage.setItem(CALM_KEY, calm ? '1' : '0');
    } catch {
      // Storage can be blocked. Calm mode then lasts until the page is closed.
    }
  }
  const next = store.getState().sample;
  if (next === saved) return;
  saved = next;
  // Only the sample league is kept in the tab; the live one always comes from the server.
  if (!store.getState().live.on) saveSample(next);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
