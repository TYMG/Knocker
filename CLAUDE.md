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
  - League Plan: https://app.notion.com/p/3f02d5b5a256814a888af2a826a2a61b
  - Proposal: https://app.notion.com/p/3f02d5b5a2568113a4b3cd2fd452e42b
  - Web App (features, hosting, build phases): https://app.notion.com/p/3f12d5b5a2568153b156cb6f2c344213
    - Technical Design: https://app.notion.com/p/3f02d5b5a25681cc85daf7c96a2f452b
    - UI/UX (every screen, with mockups): https://app.notion.com/p/3f12d5b5a25681acbd1ce88aced43c09
      - Color Palette: https://app.notion.com/p/3f12d5b5a2568122b736dc5de331a5aa
  - Scoring: https://app.notion.com/p/3f02d5b5a256812791e4d609b32922f5

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
| Theming | MUI dark + light mode, following the system setting |
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

Indexes (login uses the team name claim item, which also guarantees unique names):
- **GSI1 (by team):** all of a team's scores across the season, sorted by night
- **FLAGGED (sparse):** only flagged scores carry this key — the admin review queue

Score record fields: team, machine, night, score, timestamp, `enteredBy` (team | admin),
photo path, thumbnail path, `photoUnavailable` (boolean), reason (required for admin entries
and changes), status (`active` | `voided`).

Phone numbers and the PIN hash live **only** in the `#PRIVATE` item and are never returned by
any public endpoint.

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
  leagues/<leagueId>/teams/<teamId>/photo.jpg
  leagues/<leagueId>/scores/<date>/<scoreId>.jpg
  leagues/<leagueId>/scores/<date>/<scoreId>-thumb.jpg
  ```
- Score photos are public: thumbnail next to every score, tap to enlarge. Missing photo →
  "No photo" badge.

## Build phases

1. **Prototype:** foundation + league stacks; team sign-up (team name, both phone numbers,
   team photo) and PIN login; score + photo submission; team home (to-play / completed);
   auto-refreshing standings.
2. **League-ready:** admin pages (verify, correct, void, enter scores, manage machines and
   outages); nightly results for both scoring options; finals; public audit log; flags.
3. **Long-term:** Season Wrapped recaps, player accounts and history, multiple leagues.

## Open decisions (ask before assuming)

- How teams get their PIN (choose at sign-up, shown on screen, or texted)
- Season scoring option (1 or 2)
- Lyman's machine lineup
