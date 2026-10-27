// Who may apply which rule through the league server's general action endpoint
// (POST /api/league/action). The server enforces this; the web app uses the same lists to know
// which actions to send there when it runs on the live league.
import type { LeagueActionName } from './rules.js';

/** A logged-in team, always for its own team. */
export const TEAM_ACTIONS: ReadonlySet<LeagueActionName> = new Set<LeagueActionName>([
  'joinLine', 'leaveLine', 'startTurn', 'requestCheckIn', 'cancelCheckInRequest', 'challenge', 'answerChallenge',
  'forgivenSeen', 'forfeitSeen', 'noShowSeen', 'eliminatedSeen', 'answerSeasonTexts'
]);

/** An admin. Admins may also use the team actions (naming the team). */
export const ADMIN_ACTIONS: ReadonlySet<LeagueActionName> = new Set<LeagueActionName>([
  'lineToBack', 'forfeitTurn', 'forgiveForfeit', 'lineRemove',
  'finalsLock', 'finalsChoose', 'finalsScore', 'finalsPlayoff', 'finalsReset',
  'markChecked', 'markAllChecked', 'correctScore', 'voidScore',
  'checkIn', 'declineCheckIn', 'undoCheckIn', 'excuseNoShow', 'recalculateSeason', 'withdrawTeam', 'reinstateTeam',
  'postMessage', 'takeDownMessage', 'addMinutes', 'setNightTimes', 'openNight', 'closeNight', 'reopenNight', 'skipWeek',
  'setMachineInPlay', 'addMachine', 'removeMachine', 'restoreMachine', 'addLocation', 'setPaused'
]);

/**
 * Rules that touch private data or files, so they have their own endpoints: sign-up and the
 * waitlist (phones, PIN, photo), posting or entering a score (photo), approving, removing or
 * pairing sign-ups, PIN resets, text settings, and the server's own notes.
 */
export const SERVER_ONLY: ReadonlySet<LeagueActionName> = new Set<LeagueActionName>([
  'signUp', 'joinWaitlist', 'submitScore', 'adminEnterScore', 'approveTeam', 'removeSignUp', 'pairWaitlist',
  'resetPin', 'setSmsOptIn', 'leagueNote', 'expireSignUp'
]);
