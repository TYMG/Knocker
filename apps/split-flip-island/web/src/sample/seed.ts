// Builds the made-up league. Weeks 1 to 4 are generated from a fixed random seed, so they come
// out the same every time. Week 5 ("tonight") is written by hand so the pages tell one story:
//
//   It is 8:12 PM on Wednesday, November 11, week 5 at Lyman's. 48 minutes are left.
//   Venom broke at 7:40 PM, so its scores stopped counting. Slam Tilt and Multiball Mates
//   never showed up. You are Left & Right: two machines played, South Park still to play,
//   3rd in line for Godzilla. Two scores are waiting for an admin to look at them.

import { scoreNight } from '../../../shared/scoring';
import { teamPhoto } from './art';
import { addMinutes, at, SAMPLE_NOW } from './time';
import type { CheckState, SCallOut, SFeedItem, SLogEntry, SMachine, SScore, STeam, SWeek, SampleState } from './types';

/** Picked so the season order matches the wireframes. Change it and weeks 1 to 4 come out differently. */
export const SEED = 53792;

export const ADMIN = 'Matt';
export const MY_TEAM = 'left-and-right';
export const TONIGHT = '2026-11-11';

// id, name, players, how strong they are (1 is average)
const TEAMS: [string, string, [string, string], number][] = [
  ['tilt-me-tender', 'Tilt Me Tender', ['Ava', 'Jonah'], 1.28],
  ['nudge-nudge', 'Nudge Nudge', ['Priya', 'Sam'], 1.2],
  ['left-and-right', 'Left & Right', ['Riley', 'Morgan'], 1.24],
  ['outlane-lovers', 'Outlane Lovers', ['Dee', 'Marcus'], 1.1],
  ['flip-city', 'Flip City', ['Nico', 'Tess'], 1.08],
  ['drain-gang', 'Drain Gang', ['Omar', 'Lena'], 1.12],
  ['extra-ballers', 'Extra Ballers', ['Kit', 'Robin'], 1.0],
  ['slam-tilt', 'Slam Tilt', ['Gus', 'Imani'], 1.0],
  ['bumper-crop', 'Bumper Crop', ['Hana', 'Theo'], 0.86],
  ['multiball-mates', 'Multiball Mates', ['Cal', 'Joss'], 0.88]
];

const MACHINES: [string, string, number][] = [
  ['godzilla', 'Godzilla', 40_000_000],
  ['pulp-fiction', 'Pulp Fiction', 15_000_000],
  ['south-park', 'South Park', 24_000_000],
  ['venom', 'Venom', 95_000_000],
  ['jaws', 'Jaws', 30_000_000]
];

const PAST_WEEKS = ['2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04'];
const LATER_WEEKS = ['2026-11-18', '2026-11-25', '2026-12-02', '2026-12-09'];

/** Small repeatable random number generator (mulberry32). */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const clockAt = (minutesAfterSeven: number) => `${19 + Math.floor(minutesAfterSeven / 60)}:${pad(minutesAfterSeven % 60)}`;

export function buildSeed(seed = SEED): SampleState {
  const rand = random(seed);
  let seq = 0;
  const id = (prefix: string) => `${prefix}${++seq}`;

  const teams: STeam[] = TEAMS.map(([teamId, teamName, players], i) => ({
    teamId,
    teamName,
    players,
    phone1: `(202) 555-01${pad(10 + i * 2)}`,
    phone2: `(202) 555-01${pad(11 + i * 2)}`,
    photo: teamPhoto(teamName),
    status: 'approved',
    createdAt: at('2026-10-01', `${10 + i}:15`),
    firstWeek: 1
  }));
  // Two sign-ups waiting for an admin. One runs out in under half an hour.
  teams.push(
    {
      teamId: 'shoot-again', teamName: 'Shoot Again', players: ['Bea', 'Wes'], phone1: '(202) 555-0140', phone2: '(202) 555-0141',
      photo: teamPhoto('Shoot Again'), status: 'pending', createdAt: at('2026-11-10', '20:40'), expiresAt: at(TONIGHT, '20:40'), firstWeek: 6
    },
    {
      teamId: 'ball-hogs', teamName: 'Ball Hogs', players: ['Ines', 'Pete'], phone1: '(202) 555-0142', phone2: '(202) 555-0143',
      photo: teamPhoto('Ball Hogs'), status: 'pending', createdAt: at(TONIGHT, '14:10'), expiresAt: at('2026-11-12', '14:10'), firstWeek: 6
    }
  );

  const machines: SMachine[] = MACHINES.map(([machineId, name]) => ({ machineId, name, locationId: 'lymans', removed: false }));
  const machineName = (machineId: string) => machines.find((m) => m.machineId === machineId)!.name;
  const teamName = (teamId: string) => teams.find((t) => t.teamId === teamId)!.teamName;

  const fourMachines = ['godzilla', 'pulp-fiction', 'south-park', 'venom'];
  const weeks: SWeek[] = [
    ...PAST_WEEKS.map((date, i): SWeek => ({ week: i + 1, date, state: 'final', machineIds: fourMachines, out: {} })),
    { week: 5, date: TONIGHT, state: 'open', machineIds: fourMachines, out: { venom: { at: at(TONIGHT, '19:40'), reason: 'left flipper stuck' } } },
    ...LATER_WEEKS.map((date, i): SWeek => ({ week: i + 6, date, state: 'upcoming', machineIds: ['godzilla', 'pulp-fiction', 'south-park'], out: {} }))
  ];

  const scores: SScore[] = [];
  const log: SLogEntry[] = [];

  // ---- Weeks 1 to 4: generated ----
  const bell = () => rand() + rand() + rand() - 1.5; // roughly -1.5 to 1.5, mostly near 0
  for (const week of weeks.filter((w) => w.state === 'final')) {
    const absent = week.week === 3 ? 'multiball-mates' : null;
    log.push({ id: id('l'), at: at(week.date, '19:00'), kind: 'league', action: `Week ${week.week} opened` });
    for (const [teamId, , , skill] of TEAMS) {
      if (teamId === absent) continue;
      for (const [machineId, , typical] of MACHINES) {
        if (!week.machineIds.includes(machineId)) continue;
        const roll = rand();
        const games = roll < 0.45 ? 1 : roll < 0.8 ? 2 : 3;
        for (let g = 0; g < games; g++) {
          let value = typical * Math.pow(skill, 1.6) * Math.exp(bell() * 0.62);
          // Keep Godzilla's season best under 100 million so tonight's 147 million stands out.
          if (machineId === 'godzilla' && value > 96_000_000) value = 96_000_000 - rand() * 9_000_000;
          const score = Math.max(Math.round(value / 10) * 10, 310_000);
          const time = at(week.date, clockAt(2 + Math.floor(rand() * 114)));
          const voided = rand() < 0.02;
          scores.push({
            scoreId: id('s'), week: week.week, teamId, machineId, score, at: time, enteredBy: 'team', photoSource: 'camera',
            check: 'checked', checkedBy: ADMIN, status: voided ? 'voided' : 'active', reason: voided ? 'submitted twice by mistake' : undefined,
            history: [
              { at: time, text: `${teamName(teamId)} submitted ${score.toLocaleString('en-US')}` },
              voided
                ? { at: addMinutes(time, 4), text: `Voided by ${ADMIN}: submitted twice by mistake` }
                : { at: addMinutes(time, 6), text: `Checked by ${ADMIN}` }
            ]
          });
          if (voided) {
            log.push({ id: id('l'), at: addMinutes(time, 4), kind: 'admin', action: `Admin voided ${teamName(teamId)}'s ${machineName(machineId)} score`, reason: 'submitted twice by mistake' });
          }
        }
      }
    }
    const active = scores.filter((s) => s.week === week.week && s.status === 'active');
    const night = scoreNight(active, week.machineIds, 10);
    const [winner, points] = [...night.machinePoints].sort((a, b) => b[1] - a[1])[0]!;
    log.push({ id: id('l'), at: at(week.date, '21:00'), kind: 'league', action: `Week ${week.week} closed. ${teamName(winner)} won the night with ${points} points.` });
  }

  // ---- Week 5: tonight, by hand ----
  type Row = [team: string, machine: string, time: string, score: number, check: CheckState, extra?: Partial<SScore>];
  const tonight: Row[] = [
    // Venom, before it broke at 7:40 PM. These stay on record but don't count.
    ['tilt-me-tender', 'venom', '19:06', 98_450_120, 'checked'],
    ['nudge-nudge', 'venom', '19:12', 143_220_600, 'checked'],
    ['drain-gang', 'venom', '19:28', 76_031_440, 'unchecked'],
    // Godzilla
    ['nudge-nudge', 'godzilla', '19:09', 40_118_250, 'checked'],
    ['left-and-right', 'godzilla', '19:18', 54_310_760, 'checked'],
    ['extra-ballers', 'godzilla', '19:22', 41_008_930, 'checked'],
    ['outlane-lovers', 'godzilla', '19:26', 62_665_370, 'checked'],
    ['flip-city', 'godzilla', '19:31', 61_204_880, 'checked'],
    ['nudge-nudge', 'godzilla', '19:33', 66_407_910, 'unchecked'],
    ['tilt-me-tender', 'godzilla', '19:38', 55_430_210, 'unchecked'],
    ['bumper-crop', 'godzilla', '19:44', 87_692_480, 'unchecked'],
    ['left-and-right', 'godzilla', '19:52', 89_198_520, 'checked'],
    ['nudge-nudge', 'godzilla', '19:58', 78_761_670, 'unchecked'],
    ['flip-city', 'godzilla', '20:09', 147_270_340, 'flagged', { scoreId: 'fc-godzilla-147m', flag: "Far above this machine's best this season" }],
    // Pulp Fiction
    ['bumper-crop', 'pulp-fiction', '19:15', 12_440_870, 'checked'],
    ['tilt-me-tender', 'pulp-fiction', '19:20', 30_551_200, 'checked'],
    ['nudge-nudge', 'pulp-fiction', '19:21', 34_679_320, 'checked'],
    ['left-and-right', 'pulp-fiction', '19:35', 2_064_550, 'unchecked'],
    ['drain-gang', 'pulp-fiction', '19:35', 28_110_450, 'unchecked'],
    ['extra-ballers', 'pulp-fiction', '19:36', 19_870_340, 'unchecked'],
    ['outlane-lovers', 'pulp-fiction', '19:40', 33_120_480, 'unchecked'],
    ['flip-city', 'pulp-fiction', '19:46', 2_267_912, 'checked', { status: 'voided', reason: 'missing a digit' }],
    ['flip-city', 'pulp-fiction', '19:48', 22_679_120, 'unchecked'],
    [
      'drain-gang', 'pulp-fiction', '20:05', 124_000_000, 'flagged',
      { scoreId: 'dg-pulp-124m', photoSource: 'library', photoTakenAt: at(TONIGHT, '18:12'), flag: 'Photo came from the library and was taken at 6:12 PM, before the night opened' }
    ],
    // South Park
    ['flip-city', 'south-park', '19:08', 18_300_640, 'checked'],
    ['outlane-lovers', 'south-park', '19:12', 31_870_220, 'checked'],
    ['flip-city', 'south-park', '19:15', 44_870_900, 'checked'],
    ['nudge-nudge', 'south-park', '19:46', 58_902_110, 'unchecked'],
    ['tilt-me-tender', 'south-park', '19:54', 41_336_700, 'unchecked'],
    ['bumper-crop', 'south-park', '19:58', 21_905_060, 'unchecked'],
    ['outlane-lovers', 'south-park', '20:02', 52_377_640, 'unchecked'],
    ['extra-ballers', 'south-park', '20:03', 36_208_450, 'unchecked']
  ];

  log.push({ id: id('l'), at: at(TONIGHT, '19:00'), kind: 'league', action: 'Week 5 opened' });
  for (const [teamId, machineId, clockTime, score, check, extra] of tonight) {
    const time = at(TONIGHT, clockTime);
    const who = teamName(teamId);
    const what = machineName(machineId);
    const history = [{ at: time, text: `${who} submitted ${score.toLocaleString('en-US')}` }];
    if (extra?.status === 'voided') history.push({ at: addMinutes(time, 1), text: `Voided by ${ADMIN}: ${extra.reason}` });
    else if (check === 'checked') history.push({ at: addMinutes(time, 4), text: `Checked by ${ADMIN}` });
    else if (check === 'flagged') history.push({ at: time, text: `Flagged on its own: ${extra!.flag!.charAt(0).toLowerCase()}${extra!.flag!.slice(1)}` });
    scores.push({
      scoreId: id('s'), week: 5, teamId, machineId, score, at: time, enteredBy: 'team', photoSource: 'camera',
      check, checkedBy: check === 'checked' ? ADMIN : undefined, status: 'active', history, ...extra
    });
    log.push({ id: id('l'), at: time, kind: 'score', action: `${who} submitted a score on ${what}` });
    if (extra?.status === 'voided') log.push({ id: id('l'), at: addMinutes(time, 1), kind: 'admin', action: `Admin voided ${who}'s ${what} score`, reason: extra.reason });
    else if (check === 'checked') log.push({ id: id('l'), at: addMinutes(time, 4), kind: 'admin', action: `Admin checked ${who}'s ${what} score` });
  }
  log.push(
    { id: id('l'), at: at(TONIGHT, '19:30'), kind: 'league', action: 'Nudge Nudge called out Drain Gang on Pulp Fiction' },
    { id: id('l'), at: at(TONIGHT, '19:32'), kind: 'league', action: "Drain Gang accepted Nudge Nudge's call-out on Pulp Fiction" },
    { id: id('l'), at: at(TONIGHT, '19:40'), kind: 'admin', action: 'Admin took Venom out for the night', reason: 'left flipper stuck' },
    { id: id('l'), at: at(TONIGHT, '19:41'), kind: 'admin', action: 'Admin posted a message to everyone' },
    { id: id('l'), at: at(TONIGHT, '20:01'), kind: 'league', action: 'Flip City called out Left & Right on Godzilla' }
  );
  log.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)); // newest first

  // Settled call-outs from earlier weeks take their winner from the scores above.
  const settled = (week: number, machineId: string, a: string, b: string): SCallOut => {
    const best = (teamId: string) =>
      Math.max(0, ...scores.filter((s) => s.week === week && s.machineId === machineId && s.teamId === teamId && s.status === 'active').map((s) => s.score));
    return {
      id: id('c'), week, machineId, fromTeamId: a, toTeamId: b, at: at(weeks[week - 1]!.date, '19:20'),
      status: 'settled', winnerTeamId: best(a) >= best(b) ? a : b
    };
  };
  const callOuts: SCallOut[] = [
    { id: id('c'), week: 5, machineId: 'godzilla', fromTeamId: 'flip-city', toTeamId: MY_TEAM, at: at(TONIGHT, '20:01'), status: 'waiting' },
    { id: id('c'), week: 5, machineId: 'pulp-fiction', fromTeamId: 'nudge-nudge', toTeamId: 'drain-gang', at: at(TONIGHT, '19:30'), status: 'live' },
    settled(4, 'south-park', 'tilt-me-tender', 'outlane-lovers'),
    settled(3, 'venom', MY_TEAM, 'slam-tilt')
  ];

  const feed: SFeedItem[] = [
    { id: id('f'), teamId: MY_TEAM, at: at(TONIGHT, '20:09'), text: 'Flip City beat your Godzilla score.', to: '/machines/godzilla', linkLabel: 'See the Godzilla board' },
    { id: id('f'), teamId: MY_TEAM, at: at(TONIGHT, '20:03'), text: 'Extra Ballers passed you for 6th tonight.' },
    { id: id('f'), teamId: MY_TEAM, at: at(TONIGHT, '20:01'), text: 'Flip City called you out on Godzilla.', to: '/call-outs', linkLabel: 'Answer the call-out' }
  ];

  return {
    now: SAMPLE_NOW,
    role: 'visitor',
    myTeamId: MY_TEAM,
    adminName: ADMIN,
    teamCap: 12,
    teams,
    locations: [{ locationId: 'lymans', name: "Lyman's" }],
    machines,
    weeks,
    skippedDates: [],
    scores,
    lines: [
      {
        machineId: 'godzilla', teamIds: ['drain-gang', 'bumper-crop', MY_TEAM],
        joinedAt: { 'drain-gang': at(TONIGHT, '19:50'), 'bumper-crop': at(TONIGHT, '19:59'), [MY_TEAM]: at(TONIGHT, '20:04') },
        notify: [MY_TEAM]
      },
      { machineId: 'pulp-fiction', teamIds: ['tilt-me-tender'], joinedAt: { 'tilt-me-tender': at(TONIGHT, '20:06') }, notify: [] },
      {
        machineId: 'south-park', teamIds: ['outlane-lovers', 'extra-ballers'],
        joinedAt: { 'outlane-lovers': at(TONIGHT, '20:04') , 'extra-ballers': at(TONIGHT, '20:08') }, notify: ['extra-ballers']
      }
    ],
    checkIns: {
      'tilt-me-tender': at(TONIGHT, '18:52'), 'flip-city': at(TONIGHT, '18:55'), 'nudge-nudge': at(TONIGHT, '18:58'),
      'outlane-lovers': at(TONIGHT, '19:01'), [MY_TEAM]: at(TONIGHT, '19:04'), 'bumper-crop': at(TONIGHT, '19:06'),
      'extra-ballers': at(TONIGHT, '19:10'), 'drain-gang': at(TONIGHT, '19:21')
    },
    message: { text: 'Venom is down for the night. Last scores at 8:45.', postedAt: at(TONIGHT, '19:41'), by: ADMIN },
    callOuts,
    log,
    feed,
    waitlist: [
      { id: id('w'), name: 'Dana', at: at('2026-10-03', '11:20') },
      { id: id('w'), name: 'Quinn', at: at('2026-10-06', '17:45') }
    ],
    night: { opensAt: '19:00', closesAt: '21:00', extraMinutes: 0 },
    // Finals are four weeks away. This is what the page looks like on the night, mid game 3.
    finals: {
      championship: {
        title: 'Championship',
        teamIds: ['tilt-me-tender', 'nudge-nudge', MY_TEAM, 'outlane-lovers'],
        games: [
          { machineId: 'godzilla', places: { 'tilt-me-tender': 1, 'nudge-nudge': 3, [MY_TEAM]: 2, 'outlane-lovers': 4 } },
          { machineId: 'pulp-fiction', places: { 'tilt-me-tender': 2, 'nudge-nudge': 1, [MY_TEAM]: 3, 'outlane-lovers': 4 } },
          { machineId: 'south-park', places: null }
        ],
        live: { game: 2, scores: { 'outlane-lovers': 41_220_870, [MY_TEAM]: 39_519_280 }, playing: 'nudge-nudge', next: 'tilt-me-tender' }
      },
      secondChance: {
        title: 'Second-chance final',
        teamIds: ['flip-city', 'drain-gang', 'extra-ballers', 'slam-tilt'],
        games: [
          { machineId: 'godzilla', places: { 'flip-city': 2, 'drain-gang': 1, 'extra-ballers': 3, 'slam-tilt': 4 } },
          { machineId: 'pulp-fiction', places: { 'flip-city': 1, 'drain-gang': 3, 'extra-ballers': 2, 'slam-tilt': 4 } },
          { machineId: 'south-park', places: null }
        ],
        live: { game: 2, scores: { 'extra-ballers': 28_440_910 }, playing: 'drain-gang', next: 'flip-city' }
      }
    },
    seq
  };
}
