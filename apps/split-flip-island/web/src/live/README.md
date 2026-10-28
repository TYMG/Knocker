# The live league

When the **Sample | Live** switch in the top bar is on Live, the pages run on the real league
from the server instead of the sample league in `../sample/`.

- `client.ts`: every call to the server, plus the team and admin tokens kept on this phone.
- `liveSlice.ts`: whether Live is on, and how the last load went.
- `sync.ts`: loads the league into the same place the sample league lives (every 10 seconds,
  when the tab comes back, and after each change), and sends a page's actions to the server
  instead of changing anything locally. Which actions go where is in
  `shared/league/permissions.ts`.

Pages that talk to the server directly in live mode: log-in, admin log-in, sign-up and posting
a score (photo uploads), Change PIN, Reset PIN, League setup. Everything else works unchanged,
because the rules are the same code on both sides (`shared/league/rules.ts`).
