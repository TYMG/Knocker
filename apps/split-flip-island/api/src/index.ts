import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { adminLogin, adminTeams, approveTeam, purgeExpired, removeTeam } from './admin.js';
import { sameSecret } from './auth.js';
import { audit, createUpload, login, me, register, standings, submitScore } from './handlers.js';
import { adminCheckIns, answerCheckIn, checkIn, myCheckIn, setNightStart } from './checkin.js';
import { changePin, resetPin } from './pin.js';
import { sendCheckInReminders } from './reminders.js';
import { setTeamTexts, smsStatus, smsTest, teamTexts } from './sms.js';
import { env, HttpError, json } from './util.js';

type Route = (event: APIGatewayProxyEventV2) => Promise<unknown>;

// "201" marks routes that create something.
const routes: Record<string, { run: Route; status?: 201 }> = {
  'POST /api/uploads': { run: createUpload },
  'POST /api/teams': { run: register, status: 201 },
  'POST /api/login': { run: login },
  'GET /api/me': { run: me },
  'POST /api/scores': { run: submitScore, status: 201 },
  'GET /api/standings': { run: standings },
  'GET /api/audit': { run: audit },
  'GET /api/health': { run: async () => ({ ok: true }) },
  'POST /api/admin/login': { run: adminLogin },
  'GET /api/admin/teams': { run: adminTeams },
  'GET /api/admin/sms': { run: smsStatus },
  'POST /api/admin/sms/test': { run: smsTest },
  'GET /api/me/texts': { run: teamTexts },
  'POST /api/me/texts': { run: setTeamTexts },
  'GET /api/me/check-in': { run: myCheckIn },
  'POST /api/me/check-in': { run: checkIn },
  'GET /api/admin/check-ins': { run: adminCheckIns },
  'POST /api/me/pin': { run: changePin }
};

// POST /api/admin/check-ins/{teamId}/confirm and /decline.
const CHECK_IN_ACTION = /^POST \/api\/admin\/check-ins\/([0-9a-z-]{1,40})\/(confirm|decline)$/;
// POST /api/admin/nights/{YYYY-MM-DD}/start
const NIGHT_START = /^POST \/api\/admin\/nights\/(\d{4}-\d{2}-\d{2})\/start$/;

// POST /api/admin/teams/{teamId}/approve and /remove. Team IDs are 8 hex characters.
const TEAM_ACTION = /^POST \/api\/admin\/teams\/([0-9a-f]{8})\/(approve|remove|reset-pin)$/;

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
    const answer = CHECK_IN_ACTION.exec(key);
    if (answer) return json(200, await answerCheckIn(event, answer[1], answer[2] as 'confirm' | 'decline'));
    const start = NIGHT_START.exec(key);
    if (start) return json(200, await setNightStart(event, start[1]));
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
