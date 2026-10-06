// Manages admin accounts. Admins are created here, from the organizer's own computer, and
// never through the website, so nobody can make themselves an admin online.
//
// Usage (from the repo root): ./scripts/admin.sh <command>
//   add "Name"        create an admin; asks for a password (10 characters or more)
//   password "Name"   set a new password and sign that admin out everywhere
//   remove "Name"     delete the account; it stops working at once
//   list              show who has an admin account
//
// Passwords are typed at a hidden prompt, never passed on the command line or printed.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { parseArgs } from 'node:util';
import { hashPassword } from '../src/auth.js';
import { keys } from '../src/db.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    table: { type: 'string', default: 'split-flip-island' },
    league: { type: 'string', default: 'sfi-s1' }
  }
});
const [command, rawName = ''] = positionals;
const name = rawName.trim().replace(/\s+/g, ' ');
const TableName = values.table!;
const PK = keys.admins(values.league!);
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) fail('Run this in Terminal so the password can be typed at a hidden prompt.');
  process.stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\u0003') { // Ctrl+C
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function newPassword(): Promise<string> {
  const first = await askHidden('Password (10 characters or more, nothing shows as you type): ');
  if (first.length < 10) fail('That is shorter than 10 characters. Nothing was changed.');
  if (first.length > 200) fail('That is longer than 200 characters. Nothing was changed.');
  const again = await askHidden('Same password again: ');
  if (first !== again) fail("Those two don't match. Nothing was changed.");
  return first;
}

function needName() {
  if (name.length < 2 || name.length > 30) fail('Give the admin a name of 2 to 30 characters, in quotes. Example: ./scripts/admin.sh add "Matt"');
}

const missing = (err: unknown) => (err as Error).name === 'ConditionalCheckFailedException';

switch (command) {
  case 'add': {
    needName();
    const passHash = hashPassword(await newPassword());
    try {
      await ddb.send(new PutCommand({
        TableName,
        Item: { PK, SK: keys.admin(name), type: 'admin', name, passHash, tokenVersion: 1, createdAt: new Date().toISOString() },
        ConditionExpression: 'attribute_not_exists(PK)'
      }));
    } catch (err) {
      if (missing(err)) fail(`There is already an admin named ${name}. Use "password" to change their password.`);
      throw err;
    }
    console.log(`Added admin ${name}. They log in at /admin with that name and password.`);
    break;
  }
  case 'password': {
    needName();
    const passHash = hashPassword(await newPassword());
    try {
      await ddb.send(new UpdateCommand({
        TableName, Key: { PK, SK: keys.admin(name) },
        UpdateExpression: 'SET passHash = :hash, tokenVersion = tokenVersion + :one REMOVE failures, lastFailureAt',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeValues: { ':hash': passHash, ':one': 1 }
      }));
    } catch (err) {
      if (missing(err)) fail(`There is no admin named ${name}.`);
      throw err;
    }
    console.log(`Password changed for ${name}. They are signed out everywhere and need the new one.`);
    break;
  }
  case 'remove': {
    needName();
    try {
      await ddb.send(new DeleteCommand({ TableName, Key: { PK, SK: keys.admin(name) }, ConditionExpression: 'attribute_exists(PK)' }));
    } catch (err) {
      if (missing(err)) fail(`There is no admin named ${name}.`);
      throw err;
    }
    console.log(`Removed admin ${name}. Their access stopped just now.`);
    break;
  }
  case 'list': {
    const out = await ddb.send(new QueryCommand({ TableName, KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': PK } }));
    const admins = (out.Items ?? []).map((a) => `${a.name}  (added ${String(a.createdAt).slice(0, 10)})`);
    console.log(admins.length ? admins.join('\n') : 'No admins yet. Add one with: ./scripts/admin.sh add "Name"');
    break;
  }
  default:
    fail('Usage: ./scripts/admin.sh add "Name" | password "Name" | remove "Name" | list');
}
