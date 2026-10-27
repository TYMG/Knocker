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

## Open decisions (ask before assuming)

- How teams get their PIN (choose at sign-up, shown on screen, or texted)
- Season scoring option (1 or 2)
- Lyman's machine lineup
- The penalty for 3 forfeited turns in a season
- What a team gets for a night it misses (the app gives 0; there are no dropped nights)
- Whether finals scores need a photo (the admin page has none yet)
- A tie at the line for the finals (4th/5th, 8th/9th): the rules say a one-game split-flip
  playoff, but the app does not run it yet
