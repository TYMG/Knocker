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

# 6. Open a league night (no admin screens yet)
cd apps/split-flip-island/api
npx tsx scripts/seed.ts --night 2026-10-14 --week 1 --machines "Godzilla,Pulp Fiction,South Park,Venom"
```

Then visit https://knckr.com/split-flip-island.

## Everyday commands

- API change: `cd apps/split-flip-island/api && npm run build`, then `terraform apply` in its `infra/`
- Web change: `./scripts/deploy-web.sh`
- Local web dev against the live API: `cd apps/split-flip-island/web && npm install && npm run dev`
- Machine breaks: re-run the seed script for that night without the broken machine
- Close the night: add `--close` to the seed command
