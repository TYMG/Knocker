import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { adminLogin, approveTeam, purgeExpired, removeTeam } from './admin.js';
import { sameSecret } from './auth.js';
import { adminEnterScore, createUpload, login, register, submitScore } from './handlers.js';
import { getLeague, postAction } from './leagueApi.js';
import { setupLeague, startOver } from './leagueAdmin.js';
import { changePin, resetPin } from './pin.js';
import { openNightIfTime, sendCheckInReminders } from './reminders.js';
import { setTeamTexts, smsStatus, smsTest, teamTexts } from './sms.js';
import { env, HttpError, json } from './util.js';

type Route = (event: APIGatewayProxyEventV2) => Promise<unknown>;

// "201" marks routes that create something.
const routes: Record<string, { run: Route; status?: 201 }> = {
  'POST /api/uploads': { run: createUpload },
  'POST /api/teams': { run: register, status: 201 },
  'POST /api/login': { run: login },
  'POST /api/scores': { run: submitScore, status: 201 },
  'GET /api/health': { run: async () => ({ ok: true }) },
  'POST /api/admin/login': { run: adminLogin },
  'GET /api/admin/sms': { run: smsStatus },
  'POST /api/admin/sms/test': { run: smsTest },
  'GET /api/me/texts': { run: teamTexts },
  'POST /api/me/texts': { run: setTeamTexts },
  'POST /api/me/pin': { run: changePin },
  'GET /api/league': { run: getLeague },
  'POST /api/league/action': { run: postAction },
  'POST /api/admin/league/setup': { run: setupLeague, status: 201 },
  'POST /api/admin/scores': { run: adminEnterScore, status: 201 },
  'POST /api/admin/league/start-over': { run: startOver }
};


// POST /api/admin/teams/{teamId}/approve, /remove and /reset-pin. Team IDs are short slugs
// made from the team name ("left-and-right").
const TEAM_ACTION = /^POST \/api\/admin\/teams\/([a-z0-9-]{1,40})\/(approve|remove|reset-pin)$/;

/** Schedules invoke the function with one of these instead of a web request (see infra). */
interface ScheduledTask { task: 'purge' | 'reminders' }

function isTask(event: APIGatewayProxyEventV2 | ScheduledTask): event is ScheduledTask {
  // API Gateway events always carry requestContext, so a web request can never look like this.
  const task = (event as ScheduledTask).task;
  return (task === 'purge' || task === 'reminders') && !('requestContext' in event);
}

/**
 * The site's front door (CloudFront) checks the demo password and then adds a secret header
 * when it passes a request on. Anything without that header came around the front door.
 */
function cameThroughFrontDoor(event: APIGatewayProxyEventV2): boolean {
  const given = event.headers?.['x-origin-verify'];
  return typeof given === 'string' && sameSecret(given, env('ORIGIN_SECRET'));
}

export async function handler(event: APIGatewayProxyEventV2 | ScheduledTask): Promise<APIGatewayProxyStructuredResultV2 | Record<string, unknown>> {
  if (isTask(event)) {
    if (event.task === 'reminders') {
      // The league clock: open tonight's night when it's time, then the check-in reminder.
      if (await openNightIfTime()) console.log('Opened tonight\'s league night');
      const sent = await sendCheckInReminders();
      if (!sent.skipped) console.log('Check-in reminders', JSON.stringify(sent));
      return { ...sent };
    }
    const result = await purgeExpired();
    console.log('Purged unapproved sign-ups', JSON.stringify(result));
    return result;
  }
  if (!event.requestContext?.http) return json(400, { error: 'Not found.' });
  if (!cameThroughFrontDoor(event)) return json(403, { error: 'Not found.' });

  const key = `${event.requestContext.http.method} ${event.rawPath.replace(/\/+$/, '')}`;
  try {
    const route = routes[key];
    if (route) return json(route.status ?? 200, await route.run(event));
    const action = TEAM_ACTION.exec(key);
    if (action) {
      const [, teamId, verb] = action;
      if (verb === 'reset-pin') return json(200, await resetPin(event, teamId));
      return json(200, verb === 'approve' ? await approveTeam(event, teamId) : await removeTeam(event, teamId));
    }
    return json(404, { error: 'Not found.' });
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: 'Something went wrong on our side. Try again in a moment.' });
  }
}
