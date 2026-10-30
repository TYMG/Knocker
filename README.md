# knckr

Code and infrastructure for knckr.com. First app: **Split Flipper Island**, a couples
split-flipper pinball league (`apps/split-flip-island`). Architecture, league rules and the
working rules for changes are in `CLAUDE.md`.

Run every command from the repo root: `cd /Volumes/Stack/Projects/Knckr`. AWS profile `knckr`,
region us-east-1 (Northern Virginia). Prereqs on the Mac: AWS CLI, Terraform 1.10+, Node 22+.

## Releasing a change (the usual way)

```bash
./scripts/release.sh          # server, league stack, knckr.com stack, web app
./scripts/release.sh server   # just the server and the league stack
./scripts/release.sh web      # just the web app
./scripts/release.sh web --skip-tests   # publish without the browser tests (only when you must)
```

It builds and tests the server (and stops if a test fails), then for each Terraform stack it
plans, shows a short list of what would change and asks **Apply? [y/N]**. A stack with nothing
to change is skipped. A plan that would **delete or replace** anything stops unless you type
`replace`: paste `.deploy-logs/plan-<stack>.log` to Claude first. Then it runs the web app's
**browser tests** (Playwright, free, on this Mac, a few minutes) and publishes the web app only if
they all pass; if one fails, `cd apps/split-flip-island/web && npm run test:report` shows what
happened, with screenshots. While they run, each test prints a line as it finishes (a check
mark or an X). Full output of every step is saved in `.deploy-logs/`.

First time on a Mac, install the test browser once: `cd apps/split-flip-island/web && npx playwright install chromium`.

**Testing (decided Oct 28):** Claude writes tests but doesn't run the browser suite; it runs here
on every release, for free. Real checking is people clicking through the app; bugs and feedback
go in the **Feedback** page in Notion (Split Flipper Island → Feedback).

Nothing in AWS changes without your yes, and everything in AWS is Terraform.

## Phone notifications and the bar TV

- **Phone notifications** are free (Web Push, no texts). Each person turns them on in **Settings →
  Alerts** (solo players also on their partner page). On an iPhone, add the app to the Home Screen
  first (Share → Add to Home Screen) and open it from there. The server's signing key is made by
  Terraform (`tls_private_key.vapid`); the first league plan after Oct 29 adds the `tls` provider.
- **Bar TV:** open `https://split-flip-island.knckr.com/tv?live` on the bar's screen (after the demo
  password). It switches itself to the live league and stays there.

## The league

The whole league (teams, nights, scores, lines, the league log) lives in one record on the
server. Set it up and look after it from the app (**Admin → League setup**) or from here:

```bash
./scripts/league.sh setup --first-night 2027-01-14 --opens 19:00 --closes 21:00 \
  --machines "Godzilla,Pulp Fiction,South Park,Venom" [--team-cap 12]
./scripts/league.sh show
./scripts/league.sh clear      # deletes the league and every team's sign-up; type sfi-s1 to confirm
```

- Weeks 1–8 are a week apart from the first night; week 9 is finals. Times are Eastern.
- The night **opens by itself** from 30 minutes before its start; the admin closes it.
- In the app, any admin can **Pause** (no nights opening by themselves, no reminder texts,
  sign-ups closed). Only an **owner** sees **Start over** (type START OVER), which does what
  `clear` does; then the **Set up the season** form appears.

## Admins and access

```bash
./scripts/admin.sh add "Name"         # asks for a password (10+ characters) at a hidden prompt
./scripts/admin.sh password "Name"    # new password; signs them out everywhere
./scripts/admin.sh remove "Name"
./scripts/admin.sh owner "Name"       # can Start over from the app (not-owner "Name" undoes it)
./scripts/admin.sh reset-2fa "Name"   # lost phone: removes their authenticator; they add a new one at next log-in
./scripts/admin.sh list

./scripts/demo-password.sh            # new random demo password, shown once; signs everyone out
./scripts/demo-password.sh --choose   # type your own (12+ characters)
./scripts/demo-password.sh --close    # lock the site for everybody
./scripts/demo-password.sh --check    # test a password against the live site
```

The app is a private demo. Until a visitor enters the demo password they get only the password
page: no app, no API, no photos. New sign-ups wait for an admin's approval and are deleted if
nobody approves them within 24 hours. Admins are created only from this computer, never online.

## Texting

The league texts a check-in reminder about 5 minutes before a night starts, only to players who
opted in, only if their team hasn't checked in. Number: (855) 255-8834 (toll-free, AWS End User
Messaging; registration `registration-ccd58d645c9e4b92816f169520505cb2`, filed Oct 27, 2026).

```bash
./scripts/sms-verify.sh status   # the number's status (PENDING until the carriers approve) and sandbox/production
./scripts/sms-verify.sh add      # verify a test phone (works once the number is ACTIVE)
./scripts/sms-verify.sh list     # verified test phones, last 4 digits
./scripts/sms-verify.sh log 24   # what happened to texts in the last 24 hours, last 4 digits
```

Public terms and privacy: https://knckr.com/sms.html. Contact card: https://knckr.com/split-flip-island.vcf.

## Checking and troubleshooting

```bash
./scripts/deploy-step.sh check          # tools, AWS login, the knckr.com zone; changes nothing
./scripts/deploy-step.sh check-gate     # the live site shows only the password page to strangers
./scripts/deploy-step.sh diagnose-gate  # test-run the password gate inside CloudFront
./scripts/deploy-step.sh api-logs       # the server's errors from the last 30 minutes
```

`./scripts/deploy-step.sh <step>` also runs any single release step by hand (`build-api`,
`plan-league`, `apply-league`, `plan-foundation`, `apply-foundation`, `web`); run it with no
step to list them. Each `plan-*` saves a plan and changes nothing; `apply-*` applies exactly that.

## Working on it locally

```bash
cd apps/split-flip-island/web && npm install && npm run dev       # the pages, on the sample league
cd apps/split-flip-island/api && npm test                          # the server's tests
cd apps/split-flip-island/api && node dev/build-local.mjs && node dev/local-server.mjs ../web/dist
                                                                   # the live league on one computer, no AWS
```

The local server runs the real server code on an in-memory database at http://127.0.0.1:4190,
with two teams (Left & Right, Tilt Me Tender; PIN 4821) and the admin Matt (password
"correct horse battery"). Build the web app first (`npm run build` in `web`).

In the app, the **Sample | Live** switch in the top bar picks the made-up demo league or the
real one on the server. Sample is the default until the December demo.

## First-time setup (already done; for a new account)

```bash
./scripts/deploy-step.sh check
./scripts/deploy-step.sh plan-state && ./scripts/deploy-step.sh apply-state   # Terraform state bucket
./scripts/release.sh                                                          # everything else
./scripts/demo-password.sh
./scripts/admin.sh add "Your name" && ./scripts/admin.sh owner "Your name"
./scripts/league.sh setup --first-night YYYY-MM-DD --opens 19:00 --closes 21:00 --machines "A,B"
```
