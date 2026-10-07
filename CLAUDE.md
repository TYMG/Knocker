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

Indexes (login uses the team name claim item, which also guarantees unique names):
- **GSI1 (by team):** all of a team's scores across the season, sorted by night
- **FLAGGED (sparse):** only flagged scores carry this key — the admin review queue

Score record fields: team, machine, night, score, timestamp, `enteredBy` (team | admin),
photo path, thumbnail path, `photoUnavailable` (boolean), reason (required for admin entries
and changes), status (`active` | `voided`).

Phone numbers and the PIN hash live **only** in the `#PRIVATE` item and are never returned by
any public endpoint. Admin endpoints return phone numbers so organizers can reach a team.

Team record fields include `status` (`pending` | `approved`) and, while pending, `expiresAt`.

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

## Open decisions (ask before assuming)

- How teams get their PIN (choose at sign-up, shown on screen, or texted)
- Season scoring option (1 or 2)
- Lyman's machine lineup
