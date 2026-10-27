// Sets up and looks after the league record (see src/leagueStore.ts), from the organizer's
// own computer. Run it through ./scripts/league.sh from the repo root:
//
//   setup --first-night 2027-01-14 --opens 19:00 --closes 21:00 --machines "Godzilla,Venom" [--team-cap 12]
//        Creates the season: weeks 1-8 a week apart from the first night, week 9 for finals.
//        Times are 24-hour, Eastern. Refuses if a league already exists, so it can't wipe one.
//   show
//        Prints the league's version, weeks, teams and whether a night is open.
//   clear
//        Deletes the league record, its history and every team's sign-up details (name claims,
//        PINs, phones), plus anything left from before Oct 27. Admin accounts are kept. For
//        clearing the demo before real sign-ups open. Asks you to type the league id to confirm.
//        Photos are left for the bucket's own cleanup.
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    table: { type: 'string', default: 'split-flip-island' },
    league: { type: 'string', default: 'sfi-s1' },
    'first-night': { type: 'string' },
    opens: { type: 'string', default: '19:00' },
    closes: { type: 'string', default: '21:00' },
    machines: { type: 'string', default: '' },
    'team-cap': { type: 'string', default: '12' }
  }
});
process.env.TABLE_NAME = values.table;
process.env.LEAGUE_ID = values.league;
process.env.AWS_REGION ??= 'us-east-1';

const { createLeagueState, loadLeagueState } = await import('../src/leagueStore.js');
const { newLeague } = await import('../../shared/league/new.js');

const slug = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const clockOk = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

async function setup() {
  const first = values['first-night'];
  if (!first || !/^\d{4}-\d{2}-\d{2}$/.test(first)) throw new Error('--first-night YYYY-MM-DD is required');
  if (!clockOk(values.opens!) || !clockOk(values.closes!)) throw new Error('--opens and --closes are HH:MM, 24-hour (for example 19:00)');
  const machines = values.machines!.split(',').map((n) => n.trim()).filter(Boolean).map((name) => ({ machineId: slug(name), name }));
  const league = newLeague({ firstNight: first, opensAt: values.opens!, closesAt: values.closes!, teamCap: Number(values['team-cap']), machines }, new Date().toISOString());
  try {
    await createLeagueState(league, 'league.sh setup');
  } catch (err) {
    if ((err as Error).name === 'TransactionCanceledException') throw new Error(`A league already exists for ${values.league}. Use "show" to see it.`);
    throw err;
  }
  console.log(`Set up ${values.league}: week 1 on ${first}, nights ${values.opens} to ${values.closes}, ${machines.length} machines.`);
  console.log(`Weeks: ${league.weeks.map((w) => `${w.week}: ${w.date}`).join(', ')} (week 9 is finals).`);
}

async function show() {
  const state = await loadLeagueState();
  if (!state) return console.log(`No league set up for ${values.league}.`);
  const l = state.league;
  const open = l.weeks.find((w) => w.state === 'open');
  console.log(`League ${values.league}, version ${state.version}`);
  console.log(`Nights ${l.night.opensAt} to ${l.night.closesAt} Eastern. ${open ? `Week ${open.week} is open now.` : 'No night open.'}`);
  console.log(`Weeks: ${l.weeks.map((w) => `${w.week} ${w.date} ${w.state}`).join(' | ')}`);
  console.log(`Teams: ${l.teams.filter((t) => t.status === 'approved').length} approved, ${l.teams.filter((t) => t.status === 'pending').length} waiting. Machines: ${l.machines.filter((m) => !m.removed).map((m) => m.name).join(', ') || 'none yet'}.`);
}

async function clear() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const typed = (await rl.question(`This deletes the whole league ${values.league} and every team's sign-up. Type the league id to confirm: `)).trim();
  rl.close();
  if (typed !== values.league) return console.log('Nothing deleted.');
  const { clearLeague } = await import('../src/leagueAdmin.js');
  const deleted = await clearLeague(values.league!);
  console.log(`Deleted ${deleted} records. Admin accounts are kept. Run "setup" to start a fresh season.`);
}

const command = positionals[0];
if (command === 'setup') await setup();
else if (command === 'show') await show();
else if (command === 'clear') await clear();
else console.log('Usage: ./scripts/league.sh setup|show|clear (see the top of api/scripts/league.ts)');
