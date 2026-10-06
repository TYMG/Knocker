# The real API, set aside

The app currently runs on a made-up league (`../sample/`) so every page can be looked at and
clicked through before it is wired to the server. Nothing in this folder is loaded by the app.

- `api.ts`: every endpoint the deployed API has today (sign-up, log in, me, submit a score,
  standings, league log, admin log in, approve or remove a sign-up).
- `auth.ts`: the team and admin login slices those endpoints need.

The pages that used them (sign-up, log in, team home, submit, standings, league log, admin
teams) are in git history at commit `05e08b0`.

To wire a page back: add the reducers and `api.middleware` to `../store.ts`, then swap the page's
`useLeague()` reads and `sample.*` actions for the matching hooks from `api.ts`.
