# knckr

Code and infrastructure for knckr.com. First app: **Split Flipper Island**, a couples
split-flipper pinball league. See `CLAUDE.md` for architecture and rules.

## Deploy the prototype (first time)

Prereqs on the Mac: AWS CLI with a working `knckr` profile, Terraform 1.10+, Node 22+.

```bash
export AWS_PROFILE=knckr
cd /Volumes/Stack/Projects/Knckr

# 1. State bucket (once)
cd infra/bootstrap && terraform init && terraform apply && cd ../..
cp infra/backend.hcl.example infra/backend.hcl   # put the printed bucket name in it

# 2. Foundation: certificate + knckr.com root + redirect (cert validation can take ~5 min)
cd infra/foundation && terraform init -backend-config=../backend.hcl && terraform apply && cd ../..

# 3. Build the API
cd apps/split-flip-island/api && npm install && npm test && npm run build && cd ..

# 4. League stack: site, API, DynamoDB, photos
cd infra && terraform init -backend-config=../../../infra/backend.hcl && terraform apply && cd ../../..

# 5. Web app
./scripts/deploy-web.sh

# 6. Set the demo password (the site stays locked until you do) and add yourself as an admin
./scripts/demo-password.sh
./scripts/admin.sh add "Your name"

# 7. Open a league night (no admin screens for this yet)
cd apps/split-flip-island/api
npx tsx scripts/seed.ts --night 2026-10-14 --week 1 --machines "Godzilla,Pulp Fiction,South Park,Venom"
```

Then visit https://knckr.com/split-flip-island.

## Who can get in

The app is a private demo. Three things guard it:

- **Demo password.** Until a visitor enters it they get only the password page: no app, no
  API, no photos. `./scripts/demo-password.sh` makes a new random one (or pass your own, 12+
  characters) and signs out everyone who was in. `./scripts/demo-password.sh --close` locks the
  site for everybody. The password is shown once and never stored, so note it down.
- **Team approval.** A new sign-up waits as "pending": the team can log in, but can't score and
  isn't in the standings. An admin approves or removes it at `/admin`. A sign-up nobody approves
  within 24 hours is deleted (change `pending_team_hours` in the league stack and re-apply).
- **Admin accounts.** Each admin has their own name and password, created only from this
  computer: `./scripts/admin.sh add "Name"`, `password "Name"`, `remove "Name"`, `list`.

Steps 1 to 5 can also be run one at a time with `./scripts/deploy-step.sh <step>` (run it with no
step to list them). Each `plan-*` step saves a plan and changes nothing; the matching `apply-*` step
applies exactly that plan. Output is saved to `.deploy-logs/`.

## Everyday commands

- API change: `cd apps/split-flip-island/api && npm run build`, then `terraform apply` in its `infra/`
- Web change: `./scripts/deploy-web.sh`
- Local web dev against the live API: `cd apps/split-flip-island/web && npm install && npm run dev`
- New demo password: `./scripts/demo-password.sh` (everyone has to enter the new one)
- Approve teams: log in at `/admin`
- Machine breaks: re-run the seed script for that night without the broken machine
- Close the night: add `--close` to the seed command
