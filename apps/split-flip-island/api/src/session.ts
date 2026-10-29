// A team's log-in is good until it expires (60 days) or the admin resets the team's PIN, which
// signs out every phone (for a lost or stolen phone). The token says when it was issued; the
// league says when the team was last signed out.
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { requireTeam, type TokenPayload } from './auth.js';
import { loadLeagueState, type League } from './leagueStore.js';
import { HttpError } from './util.js';

export function stillSignedIn(token: TokenPayload, league: League): boolean {
  const team = league.teams.find((t) => t.teamId === token.teamId);
  if (!team) return false;
  return !team.signedOutAt || (token.iat ?? 0) >= Date.parse(team.signedOutAt);
}

export const SIGNED_OUT = () => new HttpError(401, 'This phone was signed out. Log in again with your team name and PIN.');

/** The logged-in team, if its log-in still holds. Pass the league when it's already loaded. */
export async function requireTeamSession(event: APIGatewayProxyEventV2, league?: League): Promise<TokenPayload> {
  const token = requireTeam(event);
  const l = league ?? (await loadLeagueState())?.league;
  if (!l || !stillSignedIn(token, l)) throw SIGNED_OUT();
  return token;
}
