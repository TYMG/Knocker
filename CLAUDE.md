# CLAUDE.md — knckr

Context and rules for Claude Code working in this repo. Read this first every session.

## What this repo is

`knckr` holds the code and infrastructure for **knckr.com**, an umbrella brand for pinball
projects. The first app is **Split Flipper Island**: an 8-week couples split-flipper pinball
league at Lyman's (DC) with a mobile-first web app for sign-up, score submission with photos,
live standings, and a public audit log.

- Public link: `knckr.com/split-flip-island` → redirects (302 while prototyping) to the app at
  `split-flip-island.knckr.com`
- Planning docs (source of truth for rules and requirements): Notion
  - Split Flipper Island (overview): https://app.notion.com/p/3f02d5b5a256814a888af2a826a2a61b
  - Proposal (for the people helping run the league): https://app.notion.com/p/3f02d5b5a2568113a4b3cd2fd452e42b
  - Rules and Scoring: https://app.notion.com/p/3f02d5b5a256812791e4d609b32922f5
  - Web App (what it does, the stack, status): https://app.notion.com/p/3f12d5b5a2568153b156cb6f2c344213
    - Technical Design: https://app.notion.com/p/3f02d5b5a25681cc85daf7c96a2f452b
    - Screens (every page and what it is for): https://app.notion.com/p/3f12d5b5a25681acbd1ce88aced43c09
    - Colors: https://app.notion.com/p/3f12d5b5a2568122b736dc5de331a5aa
    - Fonts: https://app.notion.com/p/3f22d5b5a2568155b5bed1c81af82295
    - UI Toolkit (Material UI parts in use, unused free parts, other free libraries): https://app.notion.com/p/3f22d5b5a256813eb4c9c8f75a8aa448
    - Build Plan (the step list for the current iteration; build one step at a time and wait for "next"): https://app.notion.com/p/3f22d5b5a256819c9983d38104d74527
  - Venue and Launch: https://app.notion.com/p/3f22d5b5a2568133af0ee40aa09851e5
  - Ideas: https://app.notion.com/p/3f22d5b5a256811686c5c9b822d234f9
  - In Notion, links to sub-pages go at the top of a page, never the bottom.

## Hard rules

1. **Terraform only** for infrastructure. Do not use CDK, CloudFormation, SAM, Amplify, or
   console click-ops, even though AWS skills for those are installed.
2. **Never run `terraform apply` or `terraform destroy` without explicit approval.** Always run
   `terraform plan`, summarize what will change, and wait for a yes.
3. **AWS profile:** use `knckr` (`AWS_PROFILE=knckr`). Default region `us-east-1`.
4. **No secrets in the repo.** Never write AWS keys, PINs, phone numbers, or tokens into code,
   `.env` files, commits, or logs. Never print credential values.
5. **Ask before** creating, deleting, or changing anything outside this repo or outside the
   resources defined in Terraform here.
6. Prefer small, reviewable changes. Commit with clear messages; don't push to `main` without
   approval.

## Repo layout

```
infra/foundation/              # Shared knckr.com stack (set up once)
apps/split-flip-island/
  infra/                       # League stack (Terraform)
  web/                         # React frontend
  api/                         # Lambda API
  shared/                      # TypeScript types shared by web and api
docs/ui-review/                # Mockups (SVG) and screenshots of every screen; see its README
```

Each Terraform stack keeps its **own state**. Split modules by concern (site, API, data) so
features can be added without rewriting the base.

## Infrastructure

**Domain:** `knckr.com`, registered in Route 53 in this AWS account. The hosted zone already
exists — reference it with a data source; do not create a new zone.

**Foundation stack (`infra/foundation/`)**
- Data source for the existing Route 53 zone
- ACM wildcard certificate for `knckr.com` + `*.knckr.com`, **in us-east-1** (required by
  CloudFront), DNS-validated
- Root CloudFront distribution for `knckr.com` with a simple landing page
- CloudFront Function for path redirects (`/split-flip-island` → `split-flip-island.knckr.com`)

**League stack (`apps/split-flip-island/infra/`)**
- S3 (private) + CloudFront for the static site, Origin Access Control, SPA fallback
- API Gateway (HTTP API) + Lambda (Node.js, TypeScript)
- DynamoDB table, on-demand billing
- S3 bucket for photos (private, served via CloudFront), lifecycle rule for old score photos
- Route 53 record for `split-flip-island.knckr.com`
- CloudWatch log groups with sensible retention

**Terraform state:** S3 backend, versioned and encrypted, with S3-native locking
(`use_lockfile = true`). The state bucket is created once by a small bootstrap config.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Vite, Redux Toolkit, RTK Query, MUI, React Router |
| Theming | MUI dark + light mode; dark (the Blacklight palette in `web/src/theme.ts`) is the default |
| API | TypeScript on Lambda, types shared via `shared/` |
| Data | DynamoDB, single-table design |
| Photos | S3 via short-lived presigned upload links |
| Tests | Vitest |

- TypeScript `strict` everywhere.
- Mobile-first and responsive: phones (players), tablets/laptops (admins), desktop and big
  screens (standings).
- Standings refresh by **polling every 10–15 seconds** (RTK Query `pollingInterval`). No
  WebSockets.

## Data model (DynamoDB single table)

Every record carries the league ID (`sfi-s1` for the first season) so future leagues reuse
the app.

| Item | PK | SK |
|---|---|---|
| League settings | `LEAGUE#<leagueId>` | `META` |
| Team | `LEAGUE#<leagueId>` | `TEAM#<teamId>` |
| Team private info | `LEAGUE#<leagueId>` | `TEAM#<teamId>#PRIVATE` |
| Team name claim | `LEAGUE#<leagueId>` | `TEAMNAME#<lowercased name>` |
| Machine | `LEAGUE#<leagueId>` | `MACHINE#<machineId>` |
| League night | `LEAGUE#<leagueId>` | `NIGHT#<date>` |
| Score | `NIGHT#<leagueId>#<date>` | `SCORE#<teamId>#<machineId>#<timestamp>` |
| Night results | `LEAGUE#<leagueId>` | `RESULT#<date>` |
| Audit entry | `AUDIT#<leagueId>` | `<timestamp>#<id>` |
| Admin account | `ADMIN#<leagueId>` | `ADMIN#<lowercased name>` |
| Check-in request | `NIGHT#<leagueId>#<date>` | `CHECKIN#<teamId>` |
| Machine line | `NIGHT#<leagueId>#<date>` | `LINE#<machineId>` |
| Forfeited turn | `LEAGUE#<leagueId>` | `FORFEIT#<teamId>#<timestamp>` |
| No-show | `LEAGUE#<leagueId>` | `NOSHOW#<teamId>#<week>` |
| Final (championship / second chance) | `LEAGUE#<leagueId>` | `FINAL#<bracket>` |

Indexes (login uses the team name claim item, which also guarantees unique names):
- **GSI1 (by team):** all of a team's scores across the season, sorted by night
- **FLAGGED (sparse):** only flagged scores carry this key — the admin review queue

Score record fields: team, machine, night, score, timestamp, `enteredBy` (team | admin),
photo path, thumbnail path, `photoUnavailable` (boolean), reason (required for admin entries
and changes), status (`active` | `voided`).

Phone numbers and the PIN hash live **only** in the `#PRIVATE` item and are never returned by
any public endpoint. Admin endpoints return phone numbers so organizers can reach a team.

Team record fields include `status` (`pending` | `approved`) and, while pending, `expiresAt`.

Line record fields: ordered team IDs, who asked to be messaged, and for the team at the front:
`upTeamId`, `upAt` (when its 5 minutes began), `started` (tapped "We started"), `turnId`.
Forfeit fields: team, machine, week, time, `by` (`clock` | `admin`), `forgiven`.
Sub fields: team, week, which partner is out (0 or 1), sub's name, time. Team `status` adds
`withdrawn` (with time, week and reason); a team can also carry `eliminated` (week, time).
No-show fields: team, week, time, `excused`.
Final fields: seeded team IDs, `locked`, `winnerId`, and per game: machine, picks (in seed
order: `machine` or a play spot 1–4), play order, scores, places.

The sample app (`apps/split-flip-island/web/src/sample/`) already implements every rule below
in the browser: `slice.ts` (actions), `league.ts` (derived views), `types.ts` (the shapes). Use
them as the reference when building the API.

## Access control (private demo)

The app is not open to the public. Keep all three layers working when changing anything:

1. **Demo password gate, at CloudFront.** `infra/gate.js` runs as a viewer-request function on
   every behavior (site, `/api/*`, `/leagues/*`). Without a valid signed `sfi_gate` cookie a
   visitor gets only `gate.html`; the API answers 401 `{ "gate": true }` and photos 403. The
   password record lives in a CloudFront KeyValueStore (key `gate`: salt, hash, cookie signing
   key), written by `scripts/demo-password.sh`. An empty store means locked. Terraform never
   holds the password. Any new CloudFront behavior must get the same function association.
   `gate.js` runs on CloudFront's own, older JavaScript engine (njs), not Node: an `await`
   inside a call's arguments took the site down with a 503 on the first deploy. Keep it to
   plain `var`/`function` code, and after any edit run `./scripts/deploy-step.sh diagnose-gate`
   and `check-gate` once it is applied.
2. **Origin secret.** CloudFront adds `x-origin-verify` to API requests and the Lambda refuses
   requests without it, so the API Gateway URL can't be used to go around the gate.
3. **Sign-up approval.** New teams are `pending` until an admin approves them. Pending teams
   can log in but can't upload score photos or submit scores, and never appear in standings.
   A schedule invokes the Lambda with `{ "task": "purge" }` every 15 minutes to delete sign-ups
   past `expiresAt` (team, private info, name claim and photo), with an audit entry.

**Admins** have per-person accounts (name + scrypt password hash, `tokenVersion`). They are
created only with `scripts/admin.sh` from the organizer's computer, never through the API.
Admin tokens (`x-admin-token`, 12 hours) are signed with a different prefix than team tokens,
and every admin request re-reads the account, so removal or a password reset is immediate.

## One rule book (decided Oct 27)

The server runs the **same rules code** as the sample league, so the two can never disagree.

- `shared/league/` holds the league: `types.ts` (the league's shape), `rules.ts` (every action,
  one function each, via Immer), `league.ts` (standings, seasons, finals and other views),
  `time.ts`, `loveDr.ts`, `wrapped.ts`, `art.ts`. `web/src/sample/*.ts` re-export them.
- `web/src/sample/slice.ts` = `makeLeagueRules(...)` plus sample-only controls (switching who
  you are, the guided story, the sample clock).
- Who is acting comes from the league itself (`myTeamId`, `adminName`, `role`, `now`); the
  server sets them per request, applies the action, and saves it.
- **On the server (built Oct 27, `api/src/leagueStore.ts`):** the whole league is one record,
  `LEAGUE#<id>` / `STATE` (gzipped JSON, ~25 KB for a full season, with a `version`). Every change
  writes the new record only if the version hasn't moved (else it reloads and retries), plus a
  numbered history entry `HISTORY#<id>` / `<version, 10 digits>` {actor, action, at}. A rule that
  changes nothing broke a rule and is refused (409). Viewer fields are never saved.
- **Endpoints:** `GET /api/league` (the league as the caller may see it: phones only for admins,
  text settings and pending sub names only for that team), `POST /api/league/action` {type,
  payload} for team and admin rules (`leagueApi.ts` lists which). Rules that touch private data
  have their own endpoints that save the private part in the same write: sign-up, log-in, posting
  a score with a photo, approve, remove, purge, PIN change/reset, text settings.
- **Still separate items:** the name claim `TEAMNAME#…` (unique names, log-in), the team's
  `#PRIVATE` item (PIN hash, phones, text consent), admin accounts, `REMINDERS#<date>`.
  Teams, scores, nights, check-ins and the league log now live only in the league record; the
  old TEAM/NIGHT/SCORE/CHECKIN/AUDIT items and `/api/me`, `/api/standings`, `/api/audit`,
  `/api/admin/teams` are gone. Team ids are slugs from the name ("left-and-right").
- **The league clock** (`api/src/leagueClock.ts`, Oct 29): opens tonight's night from 30 minutes
  before its start (rule `openNight`), closes it at closing time plus any added minutes (rule
  `closeNight` {by: 'league'}), and forfeits run-out turns. Checked on every `GET /api/league`,
  every league action and score post, and by the 5-minute schedule (which also sends the
  check-in reminder). Nothing automatic while paused. An admin can open tonight's night early
  (`openNight` {by: 'admin'}, same date only) or close it any time from Night settings.
- **Phone notifications (Web Push, Oct 29):** `api/src/webpush.ts` (aes128gcm + VAPID with Node
  crypto, no library), `api/src/push.ts` (`GET /api/push/key`, `POST /api/push/subscribe|unsubscribe`;
  phones stored per owner at `PUSH#<league>` / `team:<id>` or `solo:<id>`, max 6; only known push
  hosts accepted). `newsFor(before, after)` runs after every saved change (leagueStore) and sends:
  your turn, you're next (if asked), clock forfeit, challenge, checked in, night open (all teams),
  league message (all teams), solo match / pair request / you're a team (phones then move to the
  team). The VAPID key is `tls_private_key.vapid` (infra/api.tf) passed as `VAPID_PRIVATE_KEY`.
  Web: `public/sw.js`, `public/manifest.webmanifest` (fetched with credentials for the gate),
  `src/live/push.ts`, `ui/PushToggle.tsx` (Settings, solo page). iPhones need Add to Home Screen.
  `deploy-web.sh` uploads sw.js and the manifest with no-cache. Bar TV: `/tv?live` switches itself to live.
- **Security phase 1 (Oct 29; plan in Notion: Web App → Security Plan):** per-person limits
  (`api/src/limits.ts`, counters `RATE#<league>` with scrambled names that expire via the table's
  `expireAt` TTL) on log-ins, admin log-in, sign-ups/waitlist, photo uploads, actions, solo moves,
  push subscribe; the visitor's address comes from `x-viewer-ip`, set by gate.js (never trust
  another source). Texts: 3 per phone a day and `SMS_DAILY_CAP` (200) a day, in `sendText`. The
  league record refuses changes over 300 KB compressed (logs `LEAGUE_RECORD_LARGE` from 150 KB) and
  keeps the newest 4000 log / 1000 feed entries. Start over makes a DynamoDB backup first.
  Lambda `reserved_concurrent_executions` = `api_max_concurrency` (20, Matt's call). Bill alerts at $25/$50/$100
  (+ forecast) in `infra/foundation/billing.tf`; the email is in the ignored
  `infra/foundation/alerts.auto.tfvars`. Tests give each call its own `x-viewer-ip`.
- **Security phase 2, app side (Oct 29):** security headers on every response (CloudFront
  response headers policy in infra/site.tf: CSP `script-src 'self'` and no inline scripts, so
  the password page's script is `public/gate-page.js`, let through by gate.js; HSTS, DENY
  framing, nosniff, Permissions-Policy camera=self). Team tokens carry `iat`; an admin Reset PIN
  sets `STeam.signedOutAt`, and `session.ts` (`stillSignedIn`, `requireTeamSession`) refuses older
  tokens everywhere a team acts. Score photo keys must be exactly `<team>-<uuid>.jpg` and its
  `-thumb.jpg`. Request bodies over 32 KB get 413. The admin test text goes through the text caps.
- **Moderation and alarms (Oct 29):** `shared/moderation.ts` `nameProblem(name, 'team'|'person')`
  (team names: swearing and slurs; first names: slurs only) on sign-up, waitlist and team setup.
  Rules `reportScorePhoto` (team; `reportedBy` admin-only), `hideScorePhoto`, `hideTeamPhoto`
  (admin), `renameTeam` (`POST /api/admin/teams/{id}/rename`, moves the name claim). Hidden score
  photos are stripped for non-admins in viewFor. `infra/alarms.tf`: SNS email (alert_email in the
  ignored `alerts.auto.tfvars`), alarms on server errors, throttles, an hourly traffic flood, and
  log lines LEAGUE_RECORD_LARGE / LEAGUE_RECORD_TOO_BIG / "Push delivery failed" / TextLimitReached.
- **Outsiders see only the schedule (Oct 30, Matt: "visitors shouldn't see any live data… they
  can go through the demo"):** in the live league, `viewFor` sends anyone who isn't an admin or an
  approved team (visitors, solo players, teams waiting for approval) `outsiderView`: weeks (dates
  and states only), night times, teamCap, paused, `league.outsider` counts, their own sign-up and
  their waitlist view. Nothing else. Web: `useOutsider()`; `MembersOnly` guard on standings,
  teams and machines offers "Try the demo" (`TryDemoButton`, `setLive(false)`); FrontDoor swaps
  the standings for the demo button; SignUp reads the counts. The demo (sample league) is unchanged.
- **Log-ins last a week (Oct 30):** team and solo tokens expire after 7 days (`TOKEN_DAYS`). A
  token header that doesn't verify (expired or tampered) gets 401 on GET /api/league, so the
  phone forgets it and asks for the PIN instead of quietly showing the visitor view.
- **Admin two-step log-in (Oct 30):** password, then a 6-digit code from an authenticator app
  (`api/src/totp.ts`, RFC 6238 SHA-1/30s/6; ±1 step; each code once via `totpStep`; the secret
  sealed with AES-GCM keyed from TOKEN_SECRET). Admin tokens carry `mfa: true`; `requireAdmin`
  needs it. An admin with no authenticator gets a 15-minute `setupToken` good only for
  `POST /api/admin/2fa/start` (key + otpauth link, no QR) and `/confirm`. Lost phone:
  `./scripts/admin.sh reset-2fa "Name"`. Start over also needs the password typed again. The
  Texts page uses the main admin log-in. Tests issue mfa tokens directly; approval.test covers
  the log-in (`testing/twoStep.ts`).
- **Phones are confirmed with a code before any text (Oct 30):** `api/src/phoneCheck.ts`.
  Saying yes to texts is the consent; a 6-digit code texted to the phone (keyed hash only, 10
  minutes, 5 tries, goes through the text caps, `phoneCodes` 6/h per address) sets
  `smsVerified1/2` on the team private item or `verified` on the waitlist private item.
  reminders.ts and the team-made text skip unconfirmed phones; pairing solos carries it over.
  Routes `GET|POST /api/me/texts…/confirm-start|confirm`, `GET /api/solo/texts`,
  `POST /api/solo/texts/confirm-start|confirm`. Web: `ui/ConfirmPhone.tsx` (Settings, a nudge on
  team home, the solo page), live league only. Teams from before this get no texts until they
  confirm. The code text (`phoneCodeText` in shared/sms.ts) is a new message type for the
  toll-free verification and knckr.com/sms.html.
- **Personal details go 30 days after the finals (Oct 30):** `api/src/retention.ts`
  `forgetAfterSeason()`, run by the 15-minute purge task. At noon UTC on the finals night (week 9)
  + 30 days, once (marker `RETENTION#DONE`): team private items lose phones and text settings
  (PIN kept), waitlist private items / SOLOPHONE# / SOLOTEAM# are deleted, and the PUSH# and
  RATE# partitions are emptied. Team names, scores, photos and the log stay.
- **Firewall and texting spend (Oct 30):** `infra/waf.tf` (AWS WAF on CloudFront: per-address
  rate limit `waf_rate_limit` 5000 per 5 minutes for a bar on one wifi address, AWS IP
  reputation, common rules with the 8 KB body rule set to count, known bad inputs). Off until the
  demo password comes off: `waf_enabled = true` then. `./scripts/sms-verify.sh spend-limit 30`
  sets the $30/month texting ceiling (no Terraform resource for it; the sandbox maximum is $1,
  so ask for $30 in the production access request first).
- **Admin input checks in the rules** (Oct 29): message 1–280 characters; machine and location
  names up to 40 and no duplicates; night times HH:MM with opening before closing; add minutes
  1–60 at a time, 2 hours max, only while open; corrections and voids need a reason (up to 200).
- **The turn clock** (Oct 28, `api/src/turnClock.ts`): a team that's up has 5 minutes to start.
  The server forfeits run-out turns (rule `forfeitTurn` by `clock`) whenever anyone loads the
  league or posts an action, and the league clock checks too. Stops while paused; resume gives a
  waiting team a fresh 5 minutes. The web never sends clock forfeits in live mode.
- **Admin enters a score** (Oct 28): `POST /api/admin/scores` {teamId, machineId, score, photo?}
  (rule `adminEnterScore`; photo upload via `/api/uploads` with purpose score and teamId).
- **Solo waitlist and matchmaker** (Oct 28, `api/src/waitlist.ts`, `shared/league/match.ts`):
  joining (`POST /api/waitlist`) takes name, pronouns, phone, texts, a 4-digit PIN, four answers
  (why here, energy, experience, partner style) and who they want to play with (Anyone / Women /
  Men / Nonbinary players; gender read from pronouns, typed-in or none = shown only to "Anyone").
  Phone, PIN hash and texts live in `WAITLIST#<id>#PRIVATE` with a lookup `SOLOPHONE#<HMAC of
  phone>`; solo tokens use header `x-solo-token` (signed with a `solo:` prefix). `/solo` works like
  a dating app: a deck of nameless cards (players who fit both ways, best match first; score out
  of 10: why 4, energy 2, style 2, experience 2; only shared traits shown), swipe right/left
  (`POST /api/solo/swipe` {toId, like}). Right both ways = a match: names show, a pop-up offers Ask
  to pair / Keep swiping, and the Matches tab lists them. `POST /api/solo/ask` {toId} (one request
  at a time), `/api/solo/cancel-ask`, `/api/solo/answer` {fromId, accept}: the team is made only
  when both have said yes (both asking counts). The team starts with `needsSetup` and an empty
  pinHash; `/team/setup` (`POST /api/me/setup` {teamName, photoKey?, pin}) picks name, photo, PIN.
  `SOLOTEAM#<id>` hands each phone a team token on its next `GET /api/league`. When a pairing
  completes, each player who ticked texts gets the `teamMade` text (shared/sms.ts).
  `POST /api/solo/login` {phone, pin}, `/api/solo/leave`. Admin page `/admin/waitlist`: suggested
  pairs, everyone's answers, Pair with… (`/api/admin/waitlist/pair`, temporary PIN shown once),
  Remove (`/api/admin/waitlist/remove`). Visitors and teams only get a count; admins never get
  wants or swipes (the server sends `fitsWith` instead); nobody learns who passed on them.
- **Season setup:** `./scripts/league.sh setup --first-night YYYY-MM-DD --opens 19:00 --closes
  21:00 --machines "A,B"`; `show`; `clear` (typed confirmation; for clearing the demo).
- **Admin League setup page** (`/admin/league`, Oct 27): the season's dates and times; **Pause**
  (rule `setPaused`; while paused the night doesn't open by itself, no reminder texts, sign-ups
  closed; banner `layout/PausedNote.tsx`); **Start over** for the owner only
  (`POST /api/admin/league/start-over {confirm: "START OVER"}`, same delete as `league.sh clear`,
  admin accounts kept); then **Set up the season** form (`POST /api/admin/league/setup`, any
  admin, only when there is no league). With no league, `GET /api/league` returns
  `{league: null, viewer}`. Owner = admin item `owner: true`, set with
  `./scripts/admin.sh owner "Name"` (`not-owner` removes it).
- **The web app** stays on the sample league by default. The **Sample | Live** switch in the top
  bar (`web/src/live/`) loads the real league from `GET /api/league` into the same place, every
  10 seconds and after each change, so pages work unchanged. In live mode a page's action goes to
  the server (`live/sync.ts` middleware; `shared/league/permissions.ts` says which), and log-in,
  admin log-in, sign-up and posting a score (with photo uploads), Change PIN and Reset PIN call
  the server from their pages. Sample-only controls are turned away. Flip the default to live
  before the Dec 14 demo.
- **Try it on one computer:** `cd apps/split-flip-island/api && node dev/build-local.mjs && node
  dev/local-server.mjs ../web/dist` serves the real API on an in-memory database plus the built
  pages at http://127.0.0.1:4190 (teams Left & Right / Tilt Me Tender, PIN 4821; admin Matt).

## League rules the code must enforce

- Every score from a team **requires a photo**. Admin-entered scores may set
  `photoUnavailable = true` with a reason.
- Teams **cannot edit or delete** scores. Only admins can correct, verify, or void, always
  with a reason.
- Scores are **voided, never deleted**.
- **Audit log is append-only and public.** Every action is logged as a short action
  statement (who, what, which team/machine, when, why). Never include personal data
  (phone numbers, PINs, contact info).
- Each team's **best score per machine per night** earns points. All scores are stored.
- Machine points **scale with team count**: 1st = number of teams, down to 1 for last.
  No score on a machine = 0. A broken machine is dropped for everyone that night.
- Season scoring is **undecided**. When a night closes, compute and store **both**:
  - Option 1: machine points summed into the season total
  - Option 2: nightly rank of summed machine points → league points (number of teams down
    to 1; tied teams share the higher points)
- Grind and team stats (attempts, average, consistency, grind gain) **never affect standings**.

### At the machine (shown in the app's ? help)
- Two players, one machine: one takes the left flipper, the other the right. **One hand each**;
  the other hand never touches the machine. Nudge only with your playing hand.
- Anyone can press start. Only the player on the plunger side plunges.
- Players may **switch sides between balls**, never in the middle of a ball.
- A game is 3 balls plus **at most 1 extra ball**. Any further extra ball: set up the shot,
  plunge it, and step away.
- After the game: photo of the score, partner double-checks, then submit.

### Check-in and subs
- Check-in opens **30 minutes before** the night. A team taps **I'm here**; an admin
  **confirms** (or declines) it. Admins can also check a team in directly. Requests are cleared
  when the night closes.
- **No lines and no score submissions until an admin has confirmed the team's check-in.**
- Every check-in request pops up for admins (Confirm / Not here / Later), wherever they are in
  the app.
- Reminders: a countdown in the last 5 minutes before the night opens, with a sub reminder at
  1 minute, and a standing note once the night is open.
- **Everyone plays every week** (no dropped nights). **Each player can be subbed out once a
  season** (two subs per team). At check-in the team marks which partner is out and names the
  sub; at most one partner is out (**both partners can never be subbed out the same night**).
  **A sub must be someone not in the league.** The sub is used when the admin confirms the
  check-in.

### No-shows and elimination
- A **no-show** is a team not checked in when the night closes. Only one partner present when
  the other's sub is already used counts the same (they can't check in).
- **2 no-shows a season are allowed.** With one sub per player, a team can miss or be short
  4 weeks and stay eligible.
- The **3rd no-show puts the team out of the running** (not a disqualification): it keeps the
  points it earned up to that week, can still come and play for fun, but nothing after that
  week counts, it can't challenge or be challenged, and it can't make the finals or win season
  prizes (season-high and Challenge Champion bonuses). Finals seeding skips it.
- The team gets a pop-up after each no-show ("1 of 2") and when it is out of the running.
- An admin can **excuse** a no-show for a good reason; dropping back to 2 or fewer puts the team
  back in the running. For a big team, the admin can instead **remove it from the standings
  entirely** (withdraw), which works every night out again without it.
- **Recalculate the season** (admin, Weeks page) scores every closed night again after teams
  are withdrawn, brought back or added. Teams can be added mid-season; they count from the
  week they start, and points scale with the teams in each week.

### Withdrawn teams
- An admin can **withdraw** a team mid-season, with a reason. Its scores stop counting and
  **every night is worked out again as if the team was never in the league**; live challenges
  with it are called off. It can be brought back.

### Lines and turns
- A team is in **one line at a time**. Signing up for another machine leaves the old line.
- Submitting a score on a machine takes the team out of that line.
- When a team reaches the front, it has **5 minutes to start** and taps **We started**
  (honor system). No tap in 5 minutes: the turn is **forfeited** automatically, the team is
  removed from the line, and the next team's clock starts. An admin can also forfeit a team.
- Forfeits are logged and counted **per night and per season**. **3 in a season brings a
  penalty** (not decided yet; the app flags the team to admins).
- **Forfeit forgiveness:** an admin can forgive **one forfeit per team per night** (a "foul
  ball") from the forfeit pop-up. A forgiven forfeit does not count toward the season's 3; the
  team still stays off the line. The team gets a pop-up saying it was forgiven and that
  tonight's forgiveness is used. Once used, the pop-up offers only "Got it".
- Admins get a quiet, mutable note when a team starts a turn, and a pop-up for every forfeit.

### Challenges and bonuses
- A challenge wagers season points a team already has, **10 at most**; the better score on that
  machine when the night closes wins the loser's points. One challenge per pair per night.
- **Season high:** +10 to the team holding the season's highest score on each machine.
- **Challenge Champion:** +10 to the team with the most challenge wins. Level on wins → most
  points won; still level → each gets the 10.

### Finals (week 9), run by one admin
- **Championship:** top 4 of the season standings. **Second-chance final:** 5th to 8th.
- 3 games. Each team plays its **own game** on the machine (3 balls, 1 extra ball at most);
  the **admin enters every score**.
- **Game 1:** the 1st seed picks the machine; play goes in seed order.
- **Games 2 and 3:** in seed order, each team picks **either the machine or a spot in the play
  order**. One machine pick per game; the last team gets what is left (if nobody has picked the
  machine, the last team must).
- **No machine is played twice in a final.** The pool is every machine played this season,
  minus any out of order on finals night.
- Each game: 1st = 4 points, 2nd = 3, 3rd = 2, 4th = 1 (equal scores share the better place).
  Most points after 3 games wins; a tie at the top is settled by a **one-ball playoff**.

## Photos

- Phone resizes the image before upload (~200–300 KB) and makes a thumbnail; strip EXIF/GPS.
- API returns a short-lived presigned upload (~5 min, one object, image types only, size
  limit). Phone uploads directly to S3.
- Bucket layout:
  ```
  leagues/<leagueId>/pending/<uuid>.jpg          # sign-up photos; the bucket deletes these after a few days
  leagues/<leagueId>/teams/<teamId>.jpg          # copied here when the team is approved
  leagues/<leagueId>/scores/<date>/<scoreId>.jpg
  leagues/<leagueId>/scores/<date>/<scoreId>-thumb.jpg
  ```
- Score photos are visible to everyone inside the app (anyone past the demo password):
  thumbnail next to every score, tap to enlarge. Missing photo → "No photo" badge.

## Build phases

1. **Prototype:** foundation + league stacks; team sign-up (team name, both phone numbers,
   team photo) and PIN login; score + photo submission; team home (to-play / completed);
   auto-refreshing standings.
2. **League-ready:** admin pages (verify, correct, void, enter scores, manage machines and
   outages); nightly results for both scoring options; finals; public audit log; flags.
3. **Long-term:** Season Wrapped recaps, player accounts and history, multiple leagues.

## Deploying

`scripts/release.sh` (Oct 27) runs the usual release in one go: build and test the server, plan
each stack with a short summary and apply only after a typed yes (anything that deletes or
replaces needs "replace"; a stack with no changes is skipped), then run the Playwright browser
tests (web `npm test`; a failure stops before publishing), then publish the web app.
**Testing (Matt, Oct 28):** don't run the Playwright suite from Claude (it costs his tokens); write
and update the tests so they pass, and they run free on his Mac in every release. Keep server
(Vitest) tests current. Bugs and feedback live in Notion: Split Flipper Island → Feedback.
`release.sh server` or `release.sh web` for part of it.
`scripts/deploy-step.sh <step>` runs the deploy one step at a time and saves the output to
`.deploy-logs/`. `plan-*` steps change nothing; `apply-*` applies exactly the saved plan.
Summarize every plan and wait for a yes before the matching apply.

## Texting (decided Oct 19)

- **AWS End User Messaging**, toll-free number, set up in Terraform. Not Twilio.
- Texts only for the **check-in reminder** (decided again Oct 27), **each player opts in for their
  own phone** at sign-up or in Settings (so up to 2 phones a team, about $15 a season), every
  text ends "Reply STOP to stop". Turn alerts use free web push from the app, not texts.
  Budget: under $10–20 a season (about $8 expected).
- Until the January launch: a proof of concept that texts only Matt's own verified number,
  inside AWS's SMS sandbox. Before launch: request production access and a higher spend
  limit, and register the toll-free number (2–3 weeks). The phone number is never in the repo.
- Comparison and costs: Notion page "Texting: Twilio vs AWS" under Web App.

**Built (Oct 22, branch `night-rules`):**
- Terraform: `apps/split-flip-island/infra/sms.tf` (toll-free number, opt-out list, config
  set, HELP keyword, Lambda send permission; `sms_enabled`, `sms_registration_id`). The number
  is created with `wait_for_active = false`: it can't send anything until the carriers approve
  the toll-free registration. The registration itself is NOT in Terraform (no resource exists);
  it is filed once in the AWS console, then its id goes in `sms_registration_id`.
- Public terms and privacy page for the carriers: `infra/foundation/site/sms.html` (knckr.com/sms.html).
- Wording: `shared/sms.ts` (one 160-character segment each, plain characters, ends "Reply STOP to stop").
- API: `GET /api/admin/sms` (number status, account tier, verified test phones as last 4 only),
  `POST /api/admin/sms/test` (sends one template to verified test phones only). Sign-up stores
  `smsOptIn` and `smsOptInAt` in the team's private item.
- Web: sign-up checkbox (off by default), admin **Texts** page (`/admin/texts`), and the
  sample check-in banner shows the text an opted-in team would get.
- Verify a test phone: `scripts/sms-verify.sh add` (asks for the number, never stores it).
- Contact card: the league stack saves the number to the parameter store
  (`/knckr/split-flip-island/sms-number`); the foundation stack reads it and publishes
  knckr.com/split-flip-island.vcf ("Split Flipper Island", placeholder photo
  `infra/foundation/site/split-flip-island-contact.jpg`). "Save our number" buttons: sign-up
  (once the box is ticked), Settings, and sms.html.
- Teams switch texts on/off any time in **Settings** (API `GET/POST /api/me/texts`, stores
  `smsOptInAt` / `smsOptOutAt`). After the finals, teams with texts on get a pop-up saying texts
  are still on, with "Open Settings" / "Keep them on". STOP at AWS always wins; START undoes it.
- **Sign-up** asks each player for a first name (up to 20), pronouns (she/her, he/him, they/them,
  she/they, he/they, any pronouns, Prefer not to say, or Type my own, up to 20), phone and their own
  texts checkbox. Pronouns show next to names everywhere names show (team pages, admin, check-in).
  API: `RegisterRequest.players` + `texts: [boolean, boolean]`; public `Team.players`; private item
  `smsOptIn1/2`, `smsChangedAt1/2`; `POST /api/me/texts {player, optIn}`.
- **Settings page** (`/settings`, the gear in the top bar; open to everyone): Look (Dark / Light /
  Auto), Motion (Effects = calm mode), Alerts (reminder texts + Save our number, Doc's pop-ups,
  admin started-a-turn notes), Account (log out). The old sparkle and moon header buttons are gone.
- **Delivery log (Oct 27):** the configuration set sends every text event (`TEXT_ALL`) to the
  CloudWatch log group `/knckr/split-flip-island/texts` (30-day retention, since records hold
  phone numbers), through the role `split-flip-island-text-delivery-log`. Read it with
  `scripts/sms-verify.sh log [hours]` (last 4 digits only).
- **Toll-free registration** submitted Oct 27, 2026: `registration-ccd58d645c9e4b92816f169520505cb2`
  (us-east-1; set as the default of `sms_registration_id`). Review takes about 2–3 weeks; the
  number stays PENDING until approved.
- **Reminder sender (built Oct 27):** `api/src/reminders.ts`, run every 5 minutes by
  `aws_cloudwatch_event_rule.reminders` (infra/sms.tf) with `{"task": "reminders"}`. It acts only
  when today's league night (league time, Eastern) has a `startsAt` 0–6 minutes away. It claims
  the night first (`REMINDERS#<date>`, conditional put) so it sends once, then texts every opted-in
  phone on approved teams with no check-in ("requested" or "confirmed" both count), keeps going if
  one phone fails (never logs numbers), and adds a counts-only line to the league log.
- **Server check-in and start times (built Oct 27):** `api/src/checkin.ts`. Night item `startsAt`
  (set with `seed.ts --starts 19:00` or `POST /api/admin/nights/{date}/start {startTime}`).
  `GET/POST /api/me/check-in` (opens 30 min before start), `GET /api/admin/check-ins`,
  `POST /api/admin/check-ins/{teamId}/confirm|decline`. Item `CHECKIN#<date>#<teamId>`
  {state, at, by}. Subs are not on the server yet. The web app still runs on the sample league,
  so these endpoints are not wired to the pages yet (part of the real-server wiring).

## Decided: team PINs (Oct 27)

- The team picks a 4-digit PIN at sign-up (number pad), types it twice; both partners share it.
- Phones stay logged in 60 days; 15-minute lockout after too many wrong tries (built).
- Obvious PINs are refused (1234, 0000, 1111, runs, 2580…): `shared/pin.ts`, at sign-up and on change.
- "Change PIN" in Settings: current PIN, then the new one twice (`POST /api/me/pin`; wrong current
  PINs count toward the lockout).
- Forgot it: the admin taps Reset PIN, the app shows a temporary PIN once, the admin tells the
  team in person, the team changes it in Settings. No texting for PINs.
  (`POST /api/admin/teams/{teamId}/reset-pin`, returns `{pin}` once, clears the lockout, logged.)

## Open decisions (ask before assuming)

- Season scoring option (1 or 2)
- Lyman's machine lineup
- The penalty for 3 forfeited turns in a season
- What a team gets for a night it misses (the app gives 0; there are no dropped nights)
- Whether finals scores need a photo (the admin page has none yet)
- A tie at the line for the finals (4th/5th, 8th/9th): the rules say a one-game split-flip
  playoff, but the app does not run it yet
