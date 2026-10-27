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
      'Just got here? Tap I\'m here on the Tonight tab (from 6:30). Partner out tonight? Tap Sub next to them and type the sub\'s name: one sub per player per season, never someone in the league. The card says Waiting for the league admin until an admin confirms you.',
      'Missed a night? A pop-up the next time you open the app counts your no-shows (2 allowed a season). A third puts the team out of the running.',
      'Until the admin confirms your check-in, Lines and Submit are closed. A banner counts down the last 5 minutes before 7 PM, with a sub reminder at 1 minute.',
      'See your place in line, what you still have to play and what you have played.',
      'Jump to Submit a score.',
      'Read what just happened to you: someone beat your score, passed you, or challenged you.',
      'Get coaching from the Love Dr.: a chart of your strong and weak machines that only your team sees.'
    ],
    tryIt: 'Submit a South Park score, then come back: it moves from "still to play" to "played" and your place changes.'
  },
  {
    path: '?help', example: '/standings?help=play', title: 'How to play (the ? button)', group: 'On league night', role: 'visitor',
    who: 'Anyone. The round ? button sits at the bottom right of every page except the admin pages.',
    when: 'Before a first game, or to settle a question at the machine.',
    does: [
      'How to play: one hand each, anyone presses start, the plunger side plunges, nudge with your playing hand, switch sides between balls, 3 balls plus 1 extra ball.',
      'Lines: signing up, waiting, the 5-minute rule, forfeits, playing again.',
      'Scoring: machine points with an example, both season options, challenges, the season-end bonuses and finals.',
      'Only the X closes it. A tap outside does nothing.'
    ],
    tryIt: 'Scroll slowly: the flippers and pinballs move at a different speed from the text. Turn Effects off in Settings (the gear) and they stop.'
  },
  {
    path: '/lines', example: '/lines', title: 'Lines', group: 'On league night', role: 'team',
    who: 'A logged-in team.',
    when: 'Before walking to a machine.',
    does: ['See who is playing and who is waiting on every machine.', 'Sign up for one line, switch lines, or leave.', 'One line at a time. Play one game, then sign up again.', 'When it is your turn: a 5-minute countdown and a We started button on your place card.', 'How lines work: four short steps, and a link to the Lines tab of the ? help.'],
    tryIt: 'Leave the Godzilla line. The page changes to "You are not in a line" and every machine offers a sign-up button.'
  },
  {
    path: '/lines#turn', example: '/lines', title: 'Your turn and forfeits', group: 'On league night', role: 'team',
    who: 'A team in a line. Not a page: alerts that show on whatever page the team has open.',
    when: 'As the team moves up a line, and when its turn comes.',
    does: [
      "When you're next, a note says to head over: once the team playing finishes, you have 5 minutes to start.",
      'When it is your turn, a pop-up counts down from 5:00. Tap We started once your first ball is in play (the honor system). Hide for now tucks it into a slim bar with the clock.',
      'No tap in 5 minutes and the turn is forfeited: the team is off the line, the next team is up, and it goes in the league log.',
      'A Turn forfeited alert shows the count for tonight and the season. 3 in a season brings a penalty (not decided yet).',
      'The admin can forgive one forfeit per team per night (a foul ball): it stops counting, the team stays off the line, and a "You\'re forgiven" pop-up tells them tonight\'s forgiveness is used.'
    ],
    tryIt: 'View as Admin + team, open Machine lines and Remove the two teams ahead of you on Godzilla. Your turn pops up. Tap Sample: skip 1 minute five times to see the forfeit, or tap We started.'
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
      'It has its own tab in the bottom bar, with a count of challenges waiting on you.',
      'Challenge another team on one machine and put up to 10 of your own points on it.',
      'Quest for Challenge Champion: the team with the most challenge wins when the season ends gets 10 extra points.',
      'Accept or pass on a challenge sent to you.',
      'Post your score for a live challenge from here.',
      "You wager points you already have. When the night closes, the loser's points go to the winner in the season standings. One challenge a night between any two teams."
    ],
    tryIt: 'Accept the challenge from Flip City for 10 points. Then, as an admin, void their flagged Godzilla score and close the night: the points come to you.'
  },
  {
    path: '/love-dr', example: '/love-dr', title: 'The Love Dr.: full analysis', group: 'On league night', role: 'team',
    who: 'A logged-in team. Only that team sees it.',
    when: "Any time. The Doctor's orders pop-up links here.",
    does: [
      'What kind of couple you are, from how you play.',
      "Tonight's prescription: the one machine to play next, and why.",
      'What the Dr. noticed tonight: a lead you lost, a near miss, a new best.',
      'A relationship status for every machine, with your place on it week by week.',
      'The check-up: a recap of your last finished night.'
    ],
    tryIt: 'Open it from the Love Dr. card on team home with "See the full analysis".'
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
    when: 'All night. Tap the ADMIN badge beside the name in the top bar, and every other admin page is one tap from here.',
    does: [
      'An admin is a player with extra powers: the bottom bar is the same as a team\'s, and the ADMIN badge in the top bar opens the admin pages.','See whether the night is open and how long is left.', 'See what needs attention: teams not here, scores to look at, sign-ups waiting.', 'Go to one job at a time. Each button is one job.']
  },
  {
    path: '/admin/check-in', example: '/admin/check-in', title: 'Check in teams', group: 'Running the night', role: 'admin',
    who: 'A league admin.',
    when: 'As teams arrive, 6:45 to 7:15 PM.',
    does: [
      'Says they\'re here: teams that tapped I\'m here on their phone wait at the top, with any sub they named. Confirm once you see them (that uses the sub), or Not here if they are not. Each request also pops up for the admin wherever they are in the app.',
      'Tap Check in next to a team that walks in without tapping.',
      'Undo a check-in made by mistake.',
      'See at a glance who has not shown up. Admin home also says how many are waiting to be confirmed.'
    ],
    tryIt: 'View as a team, tap I\'m here on the Tonight tab, then switch to Admin and confirm them here.'
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
    when: 'All night, to see who is on each machine, and when a team is not at the machine for its turn.',
    does: ['See who is up on each machine: started, or the time left to start.', 'Forfeit now, when a team is plainly not at the machine. The app also forfeits on its own after 5 minutes.', 'Send a team to the back of a line, or take it off.', 'Turn the quick notes on or off: a small note when a team starts a turn, gone in a few seconds. A forfeit always pops up.', 'For an admin who is not on a team, this is what the Lines tab opens.'],
    tryIt: 'Remove the team at the front of a line, then tap Sample: skip 1 minute on the next team until the clock runs out.'
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
    path: '/admin/finals', example: '/admin/finals', title: 'Run the finals', group: 'Running the season', role: 'admin',
    who: 'The one admin running championship night.',
    when: 'Finals night (week 9), for the championship and the second-chance final.',
    does: [
      'Lock in the four teams from the season standings (choose which scoring option seeds them).',
      'Game 1: the 1st seed picks the machine and play goes in seed order.',
      'Games 2 and 3: in seed order, each team picks the machine or a spot in the play order; the last team gets what is left. Machines already played are greyed out.',
      'Enter each team\'s score as they finish. All four in: 4-3-2-1 points. After game 3 the champion is crowned, or a one-ball playoff settles a tie.',
      'The public Finals tab follows along live.'
    ],
    tryIt: 'Lock in the championship, then play all three games with made-up scores. Watch the Finals tab on another device or tab.'
  },
  {
    path: '/admin/teams/:teamId', example: '/admin/teams/flip-city', title: 'One team (admin)', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'A team asks about their scores, or forgot their PIN.',
    does: ['See both phone numbers and reset the PIN.', "Go through the team's scores week by week.", 'Mark a whole week as checked in one tap.', 'See forfeited turns: tonight and this season. The Teams list flags a team at 3.', 'See which partner has used their sub.', 'See no-shows (2 allowed a season) and Excuse one for a good reason. A third no-show puts the team out of the running; for a big team, Remove from the standings entirely works the season out without them.', 'Withdraw this team: every night is worked out again as if they were never in the league. Bring them back undoes it.']
  },
  {
    path: '/admin/weeks', example: '/admin/weeks', title: 'Weeks', group: 'Running the season', role: 'admin',
    who: 'A league admin.',
    when: 'Looking back at a night, or changing the calendar.',
    does: ['See every week and its state: final, open or still to come.', 'Skip a week, which moves the later ones back.', 'Reopen a night that was closed by mistake.', 'Recalculate the season standings after withdrawing, bringing back or adding a team.']
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
