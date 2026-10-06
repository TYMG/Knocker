// CloudFront Function (viewer request) on every path of split-flip-island.knckr.com.
//
// The demo password gate. Nothing behind this site (app, API, photos) is served until the
// visitor has entered the demo password and holds a signed cookie. The password is never
// stored: the key value store holds one key, "gate", with
//   { "salt": hex, "hash": sha256(salt + ":" + sha256(password)), "key": cookie signing key }
// written by scripts/demo-password.sh. A new password writes a new signing key, which signs
// everyone out. With no "gate" key, nobody gets in.
//
// Tested by api/src/gate.test.ts, which loads this file with stand-ins for the two imports.
import cf from 'cloudfront';
import crypto from 'crypto';

var kvs = cf.kvs();
var COOKIE = 'sfi_gate';
var MAX_AGE = 30 * 24 * 60 * 60; // seconds the cookie lasts

async function loadGate() {
  try {
    var gate = JSON.parse(await kvs.get('gate'));
    if (gate && typeof gate.salt === 'string' && typeof gate.hash === 'string' && typeof gate.key === 'string' && gate.key.length >= 32) {
      return gate;
    }
  } catch (err) {
    // Missing or unreadable: stay locked.
  }
  return null;
}

// Compares in constant time so a wrong guess learns nothing from how long it took.
function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sign(key, text) {
  return crypto.createHmac('sha256', key).update(text).digest('hex');
}

function hasPass(request, gate, now) {
  var cookie = request.cookies && request.cookies[COOKIE];
  if (!cookie || typeof cookie.value !== 'string') return false;
  var parts = cookie.value.split('.');
  if (parts.length !== 2 || !/^[0-9]{1,12}$/.test(parts[0])) return false;
  if (parseInt(parts[0], 10) <= now) return false;
  return sameText(sign(gate.key, parts[0]), parts[1]);
}

function reply(statusCode, statusDescription, body) {
  return {
    statusCode: statusCode,
    statusDescription: statusDescription,
    headers: {
      'content-type': { value: 'application/json' },
      'cache-control': { value: 'no-store' }
    },
    body: { encoding: 'text', data: JSON.stringify(body) }
  };
}

async function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var now = Math.floor(Date.now() / 1000);
  var gate = await loadGate();

  // The password page calls this with sha256(password) in a header.
  if (uri === '/gate/enter') {
    if (!gate) return reply(503, 'Service Unavailable', { error: 'The demo is closed right now.' });
    var header = request.headers['x-demo-pass'];
    var given = header && typeof header.value === 'string' ? header.value : '';
    if (!/^[0-9a-f]{64}$/.test(given) || !sameText(sha256(gate.salt + ':' + given), gate.hash)) {
      return reply(401, 'Unauthorized', { error: "That password didn't work." });
    }
    var expires = String(now + MAX_AGE);
    var ok = reply(200, 'OK', { ok: true });
    ok.cookies = {};
    ok.cookies[COOKIE] = {
      value: expires + '.' + sign(gate.key, expires),
      attributes: 'Path=/; Max-Age=' + MAX_AGE + '; Secure; HttpOnly; SameSite=Lax'
    };
    return ok;
  }

  var isApi = uri.indexOf('/api/') === 0;
  var isPhoto = uri.indexOf('/leagues/') === 0;

  if (gate && hasPass(request, gate, now)) {
    // App routes have no file extension: serve the app shell so refreshes don't 404.
    if (!isApi && !isPhoto && uri.indexOf('.') === -1) request.uri = '/index.html';
    return request;
  }

  // No pass. The app reloads into the password page when it sees "gate": true.
  if (isApi) return reply(401, 'Unauthorized', { error: 'Enter the demo password to continue.', gate: true });
  if (isPhoto) return reply(403, 'Forbidden', { error: 'Enter the demo password to continue.' });
  if (uri === '/gate.html' || uri.indexOf('.') === -1) {
    request.uri = '/gate.html';
    return request;
  }
  return reply(403, 'Forbidden', { error: 'Enter the demo password to continue.' });
}
