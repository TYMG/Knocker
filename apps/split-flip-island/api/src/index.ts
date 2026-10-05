import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { audit, createUpload, login, me, register, standings, submitScore } from './handlers.js';
import { HttpError, json } from './util.js';

type Route = (event: APIGatewayProxyEventV2) => Promise<unknown>;

const routes: Record<string, Route> = {
  'POST /api/uploads': createUpload,
  'POST /api/teams': register,
  'POST /api/login': login,
  'GET /api/me': me,
  'POST /api/scores': submitScore,
  'GET /api/standings': standings,
  'GET /api/audit': audit,
  'GET /api/health': async () => ({ ok: true })
};

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const key = `${event.requestContext.http.method} ${event.rawPath.replace(/\/+$/, '')}`;
  const route = routes[key];
  if (!route) return json(404, { error: 'Not found.' });
  try {
    const status = event.requestContext.http.method === 'POST' && key !== 'POST /api/login' && key !== 'POST /api/uploads' ? 201 : 200;
    return json(status, await route(event));
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    console.error(err);
    return json(500, { error: 'Something went wrong on our side. Try again in a moment.' });
  }
}
