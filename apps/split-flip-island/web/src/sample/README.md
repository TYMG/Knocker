# The sample league

While the pages are being designed, the whole app runs on a made-up league that lives in the
browser. Nothing is sent to the server and nothing is saved there. A refresh keeps your changes
(they are kept for the browser tab); "Start the sample over" puts the story back.

The real API is untouched and still deployed. Its client code waits in `../live/`.

## The story

The clock is frozen at **8:12 PM, Wednesday, November 11, 2026: week 5 of 8 at Lyman's**, with
48 minutes left. Ten teams. You are **Left & Right**.

- Weeks 1 to 4 are finished. Their scores are generated from a fixed random seed.
- Tonight: Godzilla, Pulp Fiction and South Park are in play. **Venom broke at 7:40 PM**, so its
  three scores stopped counting. Jaws was not picked.
- **Slam Tilt and Multiball Mates never showed up.**
- Left & Right have played Godzilla (twice) and Pulp Fiction, still have South Park to play, and
  are 3rd in line for Godzilla behind Drain Gang (playing) and Bumper Crop.
- **Two scores need a look:** Flip City's 147,270,340 on Godzilla (far above the season best) and
  Drain Gang's 124,000,000 on Pulp Fiction (a library photo taken before the night opened).
- Flip City has challenged Left & Right on Godzilla for 10 points. Nudge Nudge and Drain Gang
  have a 5-point challenge running on Pulp Fiction. A challenge moves points from the loser to
  the winner when the night closes (at most 10, one a night between any two teams).
- Two sign-ups (Shoot Again, Ball Hogs) are waiting for approval and two solo players are on the
  waitlist. The league holds 12 teams.
- You can view the app four ways from the strip at the top: Visitor, Team, Admin (an admin with
  no team) and Admin + team (an admin who also plays for Left & Right). An admin is a player
  with extra powers: same bottom bar, plus an Admin tab.
- Phone numbers are the 555-01xx kind that are reserved for fiction. No real ones belong here.

Every number on every page is worked out from the scores with the same scoring code the API
uses (`../../../shared/scoring.ts`), so pages always agree with each other.

## Files

| File | What it is |
|---|---|
| `types.ts` | The shape of the sample data |
| `seed.ts` | Builds the story above |
| `league.ts` | Questions pages ask: `tonightRows`, `season`, `machineBoard`, `linesView`, `teamTonight`, ... |
| `slice.ts` | Things pages do: `sample.submitScore(...)`, `sample.voidScore(...)`, ... |
| `time.ts` | The frozen clock and date/time wording (`clock`, `ago`, `until`, `longDate`, `ordinal`) |
| `art.ts` | Drawn stand-ins for team photos, score photos and machine art |
| `tour.ts` | The guide to every page: who uses it, when, what they do. Feeds "About this page" and `/tour` |

## How a page uses it

```tsx
import { useAppDispatch, useLeague, useMe } from '../hooks';
import { tonightRows } from '../sample/league';
import { sample } from '../sample/slice';
import { showToast } from '../store';

const league = useLeague();          // the whole sample league
const me = useMe();                  // { role, isTeam, isAdmin, team, myTeamId }
const rows = tonightRows(league);    // ask a question
const dispatch = useAppDispatch();
dispatch(sample.checkIn(teamId));    // do something
dispatch(showToast('Checked in Slam Tilt'));  // say it worked
```

Rules that keep the pages consistent:

- **Never type a number or a name that the data can give you.** Counts, ranks, points, times and
  names come from `league.ts`. Write wording, not data.
- **Time comes from `league.now`**, never from the real clock. Use `clock`, `ago`, `until`.
- **Admin changes to a score need a reason**, and the action writes it to the league log.
- **A page reads and dispatches; it does not reach into the state** to change it another way.
- When a page is added or its purpose changes, update `tour.ts` and the route in `../App.tsx`.
- If the shape in `types.ts` changes, bump `SAVED_KEY` in `slice.ts` so old saved copies are ignored.

## Building blocks (`../ui/`)

`Page` (title, subtitle, back link), `Section`, `RowCard` / `Row` / `RowText`, `ActionCard`,
`StandingsTable` (rows slide when the order changes), `MovingList`, `Movement`, `Tag`,
`TeamAvatar` / `TeamLink`, `MachineArt`, `ScoreDisplay` (the amber score), `ScorePhoto`
(thumbnail that opens full size), `PhotoPicker`, `PhotoViewer`, `ReasonDialog`, `SeasonChart`,
`CodeBox`, `EmptyNote`, `Toaster`.

Colors come from the theme (`../theme.ts`): lime is `primary` (titles, links, "good"), coral is
`secondary` (the one main action on a page, and anything that needs attention). Use
`variant="contained" color="secondary"` for the main action and outlined buttons for the rest.

## Going live

To wire a page to the server, replace its `useLeague()` questions with the matching API hook and
its `sample.*` actions with the matching mutation. When the last page is wired, delete this
folder, the sample strip (`../layout/SampleBar.tsx`, `TourDrawer.tsx`) and the `/tour` page.
