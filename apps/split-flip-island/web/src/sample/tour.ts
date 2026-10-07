// The guide to every page: who uses it, when, and what they do there. It feeds the "About this
// page" panel and the All pages list at /tour. When a page is added or changed, update it here.

import type { Role } from './types';

export type TourGroup = 'Getting in' | 'On league night' | 'Following the league' | 'Running the night' | 'Running the season' | 'On the wall';

export interface TourPage {
  /** Route pattern, as in App.tsx. */
  path: string;
  /** A real address to open from the All pages list. */
  example: string;
  title: string;
  group: TourGroup;
  /** Who you need to be viewing as to see this page the way it is described. */
  role: Role;
  who: string;
  when: string;
  /** What someone does here, most important first. */
  does: string[];
  /** Something worth trying with the sample data. */
  tryIt?: string;
}

export const GROUPS: { group: TourGroup; blurb: string }[] = [
  { group: 'Getting in', blurb: 'How a couple finds the league, signs up and gets back in.' },
  { group: 'On league night', blurb: 'What a team has open on their phone between 7 and 9 PM.' },
  { group: 'Following the league', blurb: 'Open to anyone with the link: standings, teams, finals and the public record.' },
  { group: 'Running the night', blurb: 'What the organizer does at the bar while the night is open.' },
  { group: 'Running the season', blurb: 'Set up before the season and touched now and then.' },
  { group: 'On the wall', blurb: 'The screen behind the bar.' }
];

export const TOUR: TourPage[] = [
  // ---- Getting in ----
  {
    path: '/', example: '/', title: 'Front door', group: 'Getting in', role: 'visitor',
    who: 'Anyone who has the link and is not logged in.',
    when: 'Before the season, or the first time someone hears about the league.',
    does: ['Read what the league is and how a night works.', 'See the top of the standings.', 'Tap Sign up your team, or Log in.'],
    tryIt: 'Scroll slowly: the background drifts and the steps arrive one at a time.'
  },
  {
    path: '/join', example: '/join', title: 'Sign up your team', group: 'Getting in', role: 'visitor',
    who: 'A couple signing up, or a solo player joining the waitlist.',
    when: 'Once, before the season.',
    does: ['Pick a team name and a 4-digit PIN.', 'Give both phone numbers (private) and a team photo.', 'A solo player leaves a name and joins the waitlist instead.'],
    tryIt: 'Sign up a team. You land on a home page that says you are waiting for approval, and the team shows up for the admin under Teams.'
  },
  {
    path: '/login', example: '/login', title: 'Log in', group: 'Getting in', role: 'visitor',
    who: 'A team that already signed up.',
    when: 'On a new phone, or after logging out.',
    does: ['Type the team name and PIN.', 'Forgot the PIN? An admin resets it at the bar.', 'The league admin log-in is linked at the bottom.']
  },

  // ---- On league night ----
  {
    path: '/', example: '/', title: 'Team home', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'All night. This is the page the phone sits on.',
    does: [
      'See where you stand tonight and how long is left.',
      'See your place in line, what you still have to play and what you have played.',
      'Jump to Submit a score.',
      'Read what just happened to you: someone beat your score, passed you, or challenged you.',
      'Get coaching from the Love Dr.: a chart of your strong and weak machines that only your team sees.'
    ],
    tryIt: 'Submit a South Park score, then come back: it moves from "still to play" to "played" and your place changes.'
  },
  {
    path: '/lines', example: '/lines', title: 'Lines', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'Before walking to a machine.',
    does: ['See who is playing and who is waiting on every machine.', 'Sign up for one line, switch lines, or leave.', 'One line at a time. Play one game, then sign up again.'],
    tryIt: 'Leave the Godzilla line. The page changes to "You are not in a line" and every machine offers a sign-up button.'
  },
  {
    path: '/lines/join/:machineId', example: '/lines/join/pulp-fiction', title: 'Sign up for a line', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'Right after tapping Sign up on a machine.',
    does: ['Check the machine and your team.', 'See the spot you would get and who is ahead of you.', 'Choose whether to be told when you are next, then sign up.']
  },
  {
    path: '/submit', example: '/submit', title: 'Submit a score', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'Right after a game ends, standing at the machine.',
    does: ['Pick the machine (filled in if you scanned its code).', 'Take a photo of the score display.', 'Type the score, check it against the photo, and post it.', 'A posted score cannot be changed by the team, only by an admin.'],
    tryIt: 'Post a score far above the rest. It still counts, and it lands in the admin\'s "needs a look" list.'
  },
  {
    path: '/machines/:machineId', example: '/machines/godzilla', title: 'One machine', group: 'On league night', role: 'team',
    who: 'Anyone. Teams get here by scanning the code stuck to the machine.',
    when: 'Standing at the machine.',
    does: [
      'Submit a score on this machine in one tap.',
      'See its line and join or leave it.',
      "See tonight's board, every score ever posted on it, and the season high.",
      'The season high is worth 10 bonus points to whoever holds it when the season ends.',
      'See where scores land in a bubble chart: score ranges across, one row per week, bigger bubbles where more games landed.'
    ]
  },
  {
    path: '/challenges', example: '/challenges', title: 'Challenges', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'Any time during the night, like a dollar game.',
    does: [
      'Challenge another team on one machine and put up to 10 of your own points on it.',
      'Accept or pass on a challenge sent to you.',
      'Post your score for a live challenge from here.',
      "You wager points you already have. When the night closes, the loser's points go to the winner in the season standings. One challenge a night between any two teams."
    ],
    tryIt: 'Accept the challenge from Flip City for 10 points. Then, as an admin, void their flagged Godzilla score and close the night: the points come to you.'
  },

  // ---- Following the league ----
  {
    path: '/standings', example: '/standings', title: "Standings: tonight", group: 'Following the league', role: 'visitor',
    who: 'Anyone.',
    when: 'During the night, and the morning after.',
    does: ["See tonight's points for every team.", 'Open each machine to see its board, with a photo of every score.', 'See which scores the league has checked.'],
    tryIt: 'As an admin, void Flip City\'s 147 million on Godzilla, then look here again: the rows slide to their new places.'
  },
  {
    path: '/standings/season', example: '/standings/season', title: 'Standings: season', group: 'Following the league', role: 'visitor',
    who: 'Anyone.',
    when: 'Between league nights.',
    does: ['See the season table and who moved since last week.', 'Switch between the two scoring options the league is testing.', 'See the race week by week in two charts.', 'See where the cut for the championship and the second-chance final falls.', 'See who holds the season high on each machine: each is worth 10 bonus points at the end of the season.'],
    tryIt: 'Switch to "Rank the night": the leader changes.'
  },
  {
    path: '/standings/finals', example: '/standings/finals', title: 'Finals', group: 'Following the league', role: 'visitor',
    who: 'Anyone.',
    when: 'The last weeks of the season, and on championship night.',
    does: ['Before finals: see who would qualify if the season ended today.', 'On the night: follow each game, the running total and what your team needs.'],
    tryIt: 'Use the switch at the top to see the page as it looks before finals and on the night itself.'
  },
  {
    path: '/standings/log', example: '/standings/log', title: 'League log', group: 'Following the league', role: 'visitor',
    who: 'Anyone.',
    when: 'When someone asks "why did that score change?"',
    does: ['Read everything that happened, newest first.', 'Filter to scores or to admin changes.', 'Every admin change shows its reason. No phone numbers or PINs ever appear.']
  },
  {
    path: '/teams/:teamId', example: '/teams/flip-city', title: 'A team', group: 'Following the league', role: 'visitor',
    who: 'Anyone. Reached by tapping a team name in any table.',
    when: 'Sizing up a rival.',
    does: ['See their season place, games played, best night and machine wins.', 'See their badges, best score on each machine and week-by-week results.', 'A logged-in team can call them out from here.']
  },

  // ---- Running the night ----
  {
    path: '/admin/login', example: '/admin/login', title: 'Admin log in', group: 'Running the night', role: 'visitor',
    who: 'A league admin.',
    when: 'At the start of the night.',
    does: ['Log in with your own name and password.', 'Admin accounts are made on the organizer\'s computer, never on the website.']
  },
  {
    path: '/admin', example: '/admin', title: 'Admin home', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'All night. It is the Admin tab in the bottom bar, and every other admin page is one tap from here.',
    does: [
      'An admin is a player with extra powers: the bottom bar is Home, Lines, Submit, Standings and Admin.','See whether the night is open and how long is left.', 'See what needs attention: teams not here, scores to look at, sign-ups waiting.', 'Go to one job at a time. Each button is one job.']
  },
  {
    path: '/admin/check-in', example: '/admin/check-in', title: 'Check in teams', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'As teams arrive, 6:45 to 7:15 PM.',
    does: ['Tap Check in next to a team when they walk in.', 'Undo a check-in made by mistake.', 'See at a glance who has not shown up.']
  },
  {
    path: '/admin/scores', example: '/admin/scores', title: 'Check scores', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'Through the night, a few at a time.',
    does: ['Start with "Needs a look": scores the app flagged on its own.', 'Compare each photo with the typed score and tap Looks right.', 'Open one to fix or void it.']
  },
  {
    path: '/admin/scores/:scoreId', example: '/admin/scores/dg-pulp-124m', title: 'One score', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'When a score looks wrong.',
    does: ['Zoom the photo, see where it came from and when it was taken.', 'Mark it right, correct the number, or void it.', 'A correction or void needs a reason, and the reason goes in the public log.', 'See the full history of that score.'],
    tryIt: 'Void this one with a reason, then check the League log and the Challenges page: Nudge Nudge now lead the 5-point challenge.'
  },
  {
    path: '/admin/enter-score', example: '/admin/enter-score', title: 'Enter a score for a team', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: "A team's phone died, or they cannot get a signal.",
    does: [
      'Pick the team and machine, type the score and add the photo.',
      'Say why. Tick "No photo available" when there is none.',
      'It is logged as entered by an admin.',
      'For an admin who is not on a team, this is what the Submit tab opens.'
    ]
  },
  {
    path: '/admin/message', example: '/admin/message', title: 'Message everyone', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'A machine breaks, last call for scores, anything the whole room should know.',
    does: ['Post one short message. It shows at the top of every phone and on the bar TV.', 'Take it down when it is no longer true.']
  },
  {
    path: '/admin/lines', example: '/admin/lines', title: 'Machine lines', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'A team is not at the machine when its turn comes.',
    does: ['Send a team to the back of a line.', 'Take a team off a line.', 'For an admin who is not on a team, this is what the Lines tab opens.']
  },
  {
    path: '/admin/lineup', example: '/admin/lineup', title: "This week's machines", group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'Before the night to pick the machines, and during it when one breaks.',
    does: ['Put each machine in or out for the week.', 'Taking a machine out mid-night drops its scores for everyone that night and empties its line.', 'Look ahead to next week.'],
    tryIt: 'Put Venom back in. Its three early scores start counting and tonight\'s points change.'
  },
  {
    path: '/admin/night', example: '/admin/night', title: 'Night settings', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'Rarely: the night opens and closes on its own.',
    does: ['Change the opening and closing times for every league night.', 'Add 15 minutes tonight.', "Close the night now, which locks in tonight's points."]
  },

  // ---- Running the season ----
  {
    path: '/admin/teams', example: '/admin/teams', title: 'Teams', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'While sign-ups are open, and when looking for one team.',
    does: ['Approve or remove new sign-ups. One that nobody approves is deleted after 24 hours.', 'Find a team and open it.', 'Pair up solo players from the waitlist.'],
    tryIt: 'Approve Shoot Again before its time runs out. It joins the league starting next week.'
  },
  {
    path: '/admin/teams/:teamId', example: '/admin/teams/flip-city', title: 'One team (admin)', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'A team asks about their scores, or forgot their PIN.',
    does: ['See both phone numbers and reset the PIN.', "Go through the team's scores week by week.", 'Mark a whole week as checked in one tap.']
  },
  {
    path: '/admin/weeks', example: '/admin/weeks', title: 'Weeks', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'Looking back at a night, or changing the calendar.',
    does: ['See every week and its state: final, open or still to come.', 'Skip a week, which moves the later ones back.', 'Reopen a night that was closed by mistake.']
  },
  {
    path: '/admin/weeks/:week', example: '/admin/weeks/5', title: 'One week', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'Reviewing a whole night machine by machine.',
    does: ['See every score from that week grouped by machine.', 'Filter to what is not checked or needs a look.', 'Open any score to fix or void it.']
  },
  {
    path: '/admin/machines', example: '/admin/machines', title: 'Locations and machines', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'Before the season, and when the bar swaps a machine.',
    does: ['Add or remove machines at a location.', 'Removing one keeps its old scores.', 'Print the code stickers that go on each machine.']
  },

  // ---- On the wall ----
  {
    path: '/tv', example: '/tv', title: 'Bar TV', group: 'On the wall', role: 'visitor',
    who: 'The whole room. Nobody touches it.',
    when: 'All night, on the screen behind the bar.',
    does: ['Shows time left, the league message and tonight\'s points.', 'Rotates through each machine\'s board.', "Shows who's up on every machine.", 'Shows a code to scan to get in line or post a score.']
  }
];

/** Turns "/machines/:machineId" into a test for real addresses. */
function matches(pattern: string, pathname: string) {
  const a = pattern.split('/').filter(Boolean);
  const b = pathname.split('/').filter(Boolean);
  return a.length === b.length && a.every((part, i) => part.startsWith(':') || part === b[i]);
}

/** The guide entry for the page at an address. The front door and team home share "/", so the role decides. */
export function tourFor(pathname: string, role: Role): TourPage | undefined {
  const hits = TOUR.filter((p) => matches(p.path, pathname));
  if (pathname === '/') return hits.find((p) => p.role === (role === 'team' ? 'team' : 'visitor'));
  return hits.find((p) => p.path === pathname) ?? hits[0];
}
