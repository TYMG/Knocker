import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { adminLogin, adminTeams, approveTeam, purgeExpired, removeTeam } from './admin.js';
import { sameSecret } from './auth.js';
import { audit, createUpload, login, me, register, standings, submitScore } from './handlers.js';
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
  'GET /api/admin/teams': { run: adminTeams }
};

// POST /api/admin/teams/{teamId}/approve and /remove. Team IDs are 8 hex characters.
const TEAM_ACTION = /^POST \/api\/admin\/teams\/([0-9a-f]{8})\/(approve|remove)$/;

/** The schedule that clears out unapproved sign-ups invokes the function with this. */
interface PurgeTask { task: 'purge' }

function isPurgeTask(event: APIGatewayProxyEventV2 | PurgeTask): event is PurgeTask {
  // API Gateway events always carry requestContext, so a web request can never look like this.
  return (event as PurgeTask).task === 'purge' && !('requestContext' in event);
}

/**
 * The site's front door (CloudFront) checks the demo password and then adds a secret header
 * when it passes a request on. Anything without that header came around the front door.
 */
function cameThroughFrontDoor(event: APIGatewayProxyEventV2): boolean {
  const given = event.headers?.['x-origin-verify'];
  return typeof given === 'string' && sameSecret(given, env('ORIGIN_SECRET'));
}

export async function handler(event: APIGatewayProxyEventV2 | PurgeTask): Promise<APIGatewayProxyStructuredResultV2 | { purged: number; failed: number }> {
  if (isPurgeTask(event)) {
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
      return json(200, verb === 'approve' ? await approveTeam(event, teamId) : await removeTeam(event, teamId));
    }
    return json(404, { error: 'Not found.' });
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: 'Something went wrong on our side. Try again in a moment.' });
  }
}
