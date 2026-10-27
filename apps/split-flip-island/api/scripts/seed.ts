// Sets up league data the prototype has no admin screens for yet:
// machines, a league night, and which night is active.
//
// Usage (from apps/split-flip-island/api):
//   AWS_PROFILE=knckr npx tsx scripts/seed.ts \
//     --table split-flip-island --night 2026-10-14 --week 1 \
//     --machines "Godzilla,Pulp Fiction,South Park,Venom"
//
// Re-run with a shorter --machines list to take a broken machine out of a night.
// Add --close to stop score submissions for that night.
// Add --starts 19:00 (24-hour, Eastern) to set when the night starts: check-in opens 30 minutes
// before, and the check-in reminder text goes out about 5 minutes before.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { parseArgs } from 'node:util';
import { isClockTime, zonedIso } from '../src/leagueTime.js';

const { values } = parseArgs({
  options: {
    table: { type: 'string', default: 'split-flip-island' },
    league: { type: 'string', default: 'sfi-s1' },
    night: { type: 'string' },
    week: { type: 'string', default: '1' },
    machines: { type: 'string' },
    close: { type: 'boolean', default: false },
    starts: { type: 'string' }
  }
});

if (!values.night || !/^\d{4}-\d{2}-\d{2}$/.test(values.night)) throw new Error('--night YYYY-MM-DD is required');
if (!values.machines) throw new Error('--machines "Name One,Name Two" is required');
if (values.starts && !isClockTime(values.starts)) throw new Error('--starts must be HH:MM, 24-hour (for example 19:00)');
const startsAt = values.starts ? zonedIso(values.night, values.starts) : undefined;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
const TableName = values.table!;
const PK = `LEAGUE#${values.league}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const names = values.machines.split(',').map((s) => s.trim()).filter(Boolean);
const machines = names.map((name, order) => ({ machineId: slug(name), name, order }));

await ddb.send(new BatchWriteCommand({
  RequestItems: {
    [TableName]: machines.map((m) => ({
      PutRequest: { Item: { PK, SK: `MACHINE#${m.machineId}`, type: 'machine', ...m } }
    }))
  }
}));

await ddb.send(new PutCommand({
  TableName,
  Item: {
    PK, SK: `NIGHT#${values.night}`, type: 'night', date: values.night,
    week: Number(values.week), machineIds: machines.map((m) => m.machineId), open: !values.close,
    ...(startsAt ? { startsAt } : {})
  }
}));

await ddb.send(new PutCommand({ TableName, Item: { PK, SK: 'META', type: 'meta', activeNight: values.night } }));

console.log(`Night ${values.night} (week ${values.week}) ${values.close ? 'closed' : 'open'}${startsAt ? `, starts ${values.starts} Eastern (${startsAt})` : ''} with: ${names.join(', ')}`);
