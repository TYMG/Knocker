// A word filter for names people pick (team names, player first names, solo players): slurs and
// strong swearing are refused, with a friendly message. It's a first line only; admins can still
// rename a team or hide a photo (league rules renameTeam, hideTeamPhoto, hideScorePhoto).
//
// Matching is on whole words after evening out tricks like "sh1t" or "f.u.c.k", so ordinary words
// that happen to contain a short bad word (Scunthorpe, Dickens, assassin) are fine. The worst
// words are also caught inside other words ("xxSLURxx"), but only those, and only long ones.

// Strong swearing: refused as whole words.
const WORDS = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'shitty', 'bullshit', 'cunt', 'cock', 'cocksucker',
  'dick', 'dickhead', 'pussy', 'twat', 'wanker', 'bitch', 'bastard', 'asshole', 'arsehole', 'whore', 'slut',
  'jizz', 'cum', 'porn', 'rape', 'rapist', 'nazi', 'hitler', 'kkk'
];
// Slurs: refused as whole words in any name, people's first names included.
const SLURS = [
  'nigger', 'nigga', 'faggot', 'fagot', 'retard', 'tranny', 'chink', 'gook', 'spic', 'wetback', 'kike',
  'raghead', 'towelhead', 'beaner', 'coon', 'dyke', 'paki', 'jap', 'fag'
];
// The worst, also caught hidden inside other words ("xxNIGGAxx"). Long and unmistakable only.
const HIDDEN = ['nigger', 'nigga', 'faggot', 'wetback', 'towelhead', 'raghead'];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g' };
const even = (text: string) => text.toLowerCase().replace(/[0134578@$!|9]/g, (c) => LEET[c] ?? c);
/** Words, with "f.u.c.k" / "f u c k" style spelling joined back up. */
function words(text: string): string[] {
  const parts = even(text).split(/[^a-z]+/).filter(Boolean);
  // Runs of single letters ("f u c k") are one word.
  const out: string[] = [];
  let run = '';
  for (const p of parts) {
    if (p.length === 1) { run += p; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(p);
  }
  if (run) out.push(run);
  return out;
}
const squash = (text: string) => even(text).replace(/[^a-z]/g, '');
// "shiiit": a word with doubled letters also counts with them taken out. (Not the other way
// round, so "Niger" never matches a slur that's spelled with a double letter.)
const single = (w: string) => w.replace(/(.)\1+/g, '$1');
const lists = (list: string[]) => ({ raw: new Set(list), single: new Set(list.map(single)) });
const TEAM = lists([...WORDS, ...SLURS]);
const PERSON = lists(SLURS);
// Each letter may repeat: n+i+g+g+a+ catches "niiigga" but needs the gg.
const HIDDEN_RE = HIDDEN.map((w) => new RegExp(w.split('').map((c) => `${c}+`).join('')));

function listed(word: string, l: { raw: Set<string>; single: Set<string> }): boolean {
  for (const w of [word, word.replace(/s$/, ''), word.replace(/es$/, '')]) {
    if (l.raw.has(w)) return true;
    if (w !== single(w) && l.single.has(single(w))) return true;
  }
  return false;
}

/**
 * '' when the name is fine, else what to tell the person. Team names refuse swearing and slurs;
 * people's first names only slurs (Dick and Fanny are real names).
 */
export function nameProblem(name: string, kind: 'team' | 'person' = 'team'): string {
  const l = kind === 'team' ? TEAM : PERSON;
  const flat = squash(name);
  const bad = words(name).some((w) => listed(w, l)) || HIDDEN_RE.some((re) => re.test(flat));
  return bad ? "That name isn't allowed in the league. Pick another one." : '';
}
