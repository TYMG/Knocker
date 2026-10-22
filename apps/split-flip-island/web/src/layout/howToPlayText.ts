// The wording in the "?" modal (How to play / Scoring). Edit the rules here: the layout in
// HowToPlay.tsx only arranges whatever this file says. Matches the Rules and Scoring page in
// Notion as of 2026-10-19.

/** One line. `lead` shows in bold before the rest. */
export interface Line { lead?: string; text: string }
export interface HelpSection { title: string; lines: Line[] }

export const PLAY: HelpSection[] = [
  {
    title: 'Before you start',
    lines: [
      { text: 'Two players, one machine. One of you takes the left flipper, the other takes the right.' },
      { text: 'Anyone can press start.' }
    ]
  },
  {
    title: 'While you play',
    lines: [
      { lead: 'One hand each.', text: "Your other hand never touches the machine. Keep it behind your back, or behind your partner's back if they're OK with it." },
      { lead: 'Plunging:', text: 'only the player on the plunger side plunges.' },
      { lead: 'Nudging:', text: 'with your playing hand only.' },
      { lead: 'Switching sides:', text: 'between balls if you like, never in the middle of a ball.' },
      { lead: 'Play the full game:', text: '3 balls plus 1 extra ball at most. If the machine gives you another extra ball, set up your shot, plunge it, and step away.' }
    ]
  },
  {
    title: 'After the game',
    lines: [
      { text: 'Take a photo of the score on the display.' },
      { text: 'Have your partner double-check the machine, the score and the photo.' },
      { text: 'Submit it in the app. Submit every game, not just your best.' }
    ]
  },
  {
    title: 'League night basics',
    lines: [
      { lead: 'Check in when you arrive:', text: "tap I'm here on your Home page (from 6:30), and the admin confirms you once they see you. You can't join a line or submit a score until the admin has confirmed you. League night runs 7 to 9 PM." },
      { lead: 'Everyone plays every week.', text: "Partner can't make it? Each player can be subbed out once a season, so a team has two subs in all. At check-in, tap Sub next to the partner who's out and type the sub's name. A sub has to be someone not in the league, and both of you can't be subbed out on the same night." },
      { lead: 'No-shows:', text: "not checked in when the night closes is a no-show. So is only one of you there when that partner's sub is already used. Two no-shows a season are allowed. A third puts you out of the running: you keep your points so far and can still play for fun, but nothing after that counts and you can't make the finals." },
      { text: 'Your best score on each machine each night is the one that counts.' },
      { lead: 'How you score:', text: "on each machine, each night, your best score is ranked against every team's. 1st earns as many points as there are teams, down to 1 for last. The Scoring tab has the full breakdown." },
      { lead: 'Wrong score?', text: "Teams can't change scores, so find the admin running the night." }
    ]
  }
];

export const SCORING: HelpSection[] = [
  {
    title: 'Machine points, each night',
    lines: [
      { text: 'Your best score on each machine that night is the one that counts. Every other game is kept for stats.' },
      { text: '1st earns as many points as there are teams, down to 1 for last.' },
      { text: "Didn't play a machine? That's 0. Put up at least one score on every machine." },
      { text: 'A broken machine is dropped for everyone that night, so nobody gains or loses from bad luck.' }
    ]
  }
];

/** The worked example under machine points. */
export const EXAMPLE = {
  caption: 'With 10 teams, on one machine:',
  rows: [['1st', '10'], ['2nd', '9'], ['…', '…'], ['10th (last)', '1'], ["Didn't play it", '0']]
};

export const SEASON = {
  title: 'The season total',
  intro: "The league is trying two ways of adding up the season and hasn't picked one yet. The app works out both every night, and the Season standings have a switch to see either one.",
  options: [
    { name: 'Machine points add up', text: "Every machine's points go straight into your season total. Big nights and big margins count the most." },
    { name: 'Rank the night', text: 'Each night, teams are ranked by their machine points. That place earns league points: as many as there are teams for 1st, down to 1 for last. Tied teams share the higher points. One huge night counts no more than a narrow win.' }
  ]
};

export const SCORING_AFTER: HelpSection[] = [
  {
    title: 'Challenges',
    lines: [
      { text: 'Pick a team and a machine, and bet points you already have in the season standings. 10 at most.' },
      { text: 'They accept or pass. When the night closes, the better score on that machine wins the loser\'s points.' },
      { text: 'One challenge per pair of teams per night.' }
    ]
  },
  {
    title: 'Season-end bonuses',
    lines: [
      { lead: 'Season high:', text: '+10 to the team holding the highest score of the season on each machine.' },
      { lead: 'Challenge Champion:', text: '+10 to the team with the most challenge wins. Level on wins? Most points won takes it. Still level? Each gets the 10.' }
    ]
  },
  {
    title: 'Finals',
    lines: [
      { text: 'After week 8, the top 4 teams play championship night: 3 games, all 4 teams on each.' },
      { text: 'Each game: 1st gets 4, 2nd gets 3, 3rd gets 2, 4th gets 1. Most points after 3 games is League Champion.' },
      { text: '5th to 8th play a second-chance final the same night, for bragging rights.' }
    ]
  }
];

// ---- Lines ----

export const LINES: HelpSection[] = [
  {
    title: 'Why lines',
    lines: [
      { text: "Lines keep the machines fair. Nobody hogs a game, and you don't have to stand around guarding a spot. Sign up in the app, then go do something else until it's your turn." }
    ]
  },
  {
    title: 'Signing up',
    lines: [
      { text: 'Lines open when the night opens. Go to Lines and pick a machine.' },
      { text: "Choose whether you want a message on your phone when you're next. Either way, the Lines page always shows your place." },
      { lead: 'One line at a time.', text: 'Signing up for a different machine takes you out of the line you were in, and you start at the back of the new one.' },
      { text: 'A machine that is down for the night has no line.' }
    ]
  },
  {
    title: 'Waiting your turn',
    lines: [
      { text: "The Lines page shows who is playing and how many teams are ahead of you." },
      { lead: "You're next:", text: 'head over to the machine now. Once the team playing finishes, the clock starts.' },
      { text: 'Changed your mind? Leave the line anytime.' }
    ]
  },
  {
    title: "When it's your turn",
    lines: [
      { lead: 'You have 5 minutes to start your game.', text: 'The app shows a countdown when your turn comes up. Once your first ball is in play, tap "We started". It\'s the honor system, and the admins can see who is on each machine.' },
      { lead: 'No tap within 5 minutes?', text: "You forfeit your turn: you're off the line, and the next team goes. Want to play? Sign up again at the back." },
      { lead: 'Forfeits add up.', text: 'They are counted for the night and the season. 3 in a season brings a penalty.' },
      { lead: 'One foul ball a night.', text: "The admin can forgive one forfeit per team per night. A forgiven forfeit doesn't count toward the 3, but you still sign up again at the back." },
      { text: "This keeps anyone from holding a machine to stall a night out." },
      { text: 'Play one game. Take the photo, have your partner double-check, and submit. Submitting your score takes you out of that line.' }
    ]
  },
  {
    title: 'Playing again',
    lines: [
      { text: 'Want another go on the same machine? Sign up again. You join at the back, behind anyone already waiting.' },
      { text: 'If nobody is waiting, sign up and play right away.' }
    ]
  }
];

/** The short version shown on the Lines page itself. */
export const LINES_SHORT: string[] = [
  'Pick a machine and sign up. You can be in one line at a time.',
  "Wait for your turn. This page shows your place, and we can message you when you're next.",
  'When it\'s your turn, start within 5 minutes and tap "We started", or you forfeit your spot. Play one game, then submit your score.',
  'Want another go? Sign up again at the back of the line.'
];
