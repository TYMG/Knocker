// Builds the record the demo password gate reads (see infra/gate.js), and makes passwords.
// Used by scripts/demo-password.sh:
//   npx tsx scripts/gate-record.ts            a new random password
//   npx tsx scripts/gate-record.ts --stdin    your own, read from standard input (12 characters
//                                             or more), so it never appears in a command line
// Prints two lines: the password, then the JSON record. The record holds no password.
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The password page applies the same rule before hashing, so "Tavo-Miku " and "tavo-miku" match. */
export function normalizePassword(password: string): string {
  return password.trim().toLowerCase().replace(/\s+/g, ' ');
}

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export function gateRecord(password: string) {
  const salt = randomBytes(16).toString('hex');
  return {
    salt,
    hash: sha256(`${salt}:${sha256(normalizePassword(password))}`),
    // A fresh signing key every time, so changing the password signs everyone out.
    key: randomBytes(32).toString('hex')
  };
}

/** Easy to read out loud and type on a phone, about 50 bits of randomness: tavo-miku-seda-4821 */
export function randomPassword(): string {
  const consonants = 'bdfghjkmnprstvz';
  const vowels = 'aeiou';
  const chunk = () => [consonants, vowels, consonants, vowels].map((set) => set[randomInt(set.length)]).join('');
  return `${chunk()}-${chunk()}-${chunk()}-${String(randomInt(10_000)).padStart(4, '0')}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const own = process.argv[2] === '--stdin' ? normalizePassword(readFileSync(0, 'utf8')) : undefined;
  if (own !== undefined && own.length < 12) {
    console.error('Use 12 characters or more, or let the script make a random one.');
    process.exit(1);
  }
  const password = own ?? randomPassword();
  console.log(password);
  console.log(JSON.stringify(gateRecord(password)));
}
