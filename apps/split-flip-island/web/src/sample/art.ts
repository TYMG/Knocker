// Drawn stand-ins for photos, so the sample league looks lived-in without any real pictures.
// Each returns an image address that works anywhere an <img> or Avatar takes one.

const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}`;

const TEAM_TINTS = ['#ff616b', '#ccff00', '#a49a87', '#ffff99', '#6bd6ff', '#ff9f43', '#c49bff', '#7dffb0', '#ff8ad1', '#f5f0e6'];

function hash(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** A team "photo": two figures on a tinted square, with the team's initials. */
export function teamPhoto(teamName: string): string {
  const tint = TEAM_TINTS[hash(teamName) % TEAM_TINTS.length];
  const initials = teamName.split(/[\s&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return svg(
    `<rect width="200" height="200" fill="#1c1a16"/><rect width="200" height="200" fill="${tint}" opacity="0.22"/>` +
      `<circle cx="72" cy="84" r="26" fill="${tint}"/><path d="M28 200c0-44 20-66 44-66s44 22 44 66z" fill="${tint}"/>` +
      `<circle cx="132" cy="92" r="23" fill="${tint}" opacity="0.72"/><path d="M92 200c0-40 18-58 40-58s40 18 40 58z" fill="${tint}" opacity="0.72"/>` +
      `<text x="100" y="190" font-family="Arial Black, Impact, sans-serif" font-size="30" fill="#000000" text-anchor="middle">${initials}</text>`,
    200, 200
  );
}

/** A "photo of the score display": amber digits on dark glass, slightly tilted like a phone shot. */
export function scorePhoto(score: number, machineName: string, size: 'thumb' | 'full' = 'full'): string {
  const text = score.toLocaleString('en-US');
  const tilt = (hash(text) % 7) - 3;
  const w = size === 'thumb' ? 160 : 640;
  const h = size === 'thumb' ? 120 : 480;
  const k = w / 640;
  return svg(
    `<rect width="${w}" height="${h}" fill="#0a0806"/>` +
      `<g transform="rotate(${tilt} ${w / 2} ${h / 2})">` +
      `<rect x="${60 * k}" y="${120 * k}" width="${520 * k}" height="${220 * k}" rx="${10 * k}" fill="#140b02" stroke="#3a2a12" stroke-width="${6 * k}"/>` +
      `<text x="${92 * k}" y="${176 * k}" font-family="Courier New, monospace" font-weight="700" font-size="${26 * k}" fill="#b8791a">BALL 3   ${machineName.toUpperCase().slice(0, 14)}</text>` +
      `<text x="${w / 2}" y="${278 * k}" font-family="Courier New, monospace" font-weight="700" font-size="${(text.length > 11 ? 62 : 76) * k}" fill="#ffa51f" text-anchor="middle">${text}</text>` +
      `</g>` +
      `<rect width="${w}" height="${h}" fill="#ffffff" opacity="0.03"/>`,
    w, h
  );
}

const MACHINE_TINTS: Record<string, string> = { godzilla: '#7dffb0', 'pulp-fiction': '#ffff99', 'south-park': '#6bd6ff', venom: '#c49bff', jaws: '#ff616b' };

/** A square of "cabinet art" for a machine: its initials on its own color. */
export function machineArt(machineId: string, name: string): string {
  const tint = MACHINE_TINTS[machineId] ?? TEAM_TINTS[hash(machineId) % TEAM_TINTS.length];
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return svg(
    `<rect width="200" height="200" fill="#000000"/><rect x="10" y="10" width="180" height="180" rx="14" fill="${tint}" opacity="0.18" stroke="${tint}" stroke-width="4"/>` +
      `<circle cx="100" cy="86" r="34" fill="none" stroke="${tint}" stroke-width="8"/><circle cx="100" cy="86" r="10" fill="${tint}"/>` +
      `<text x="100" y="172" font-family="Arial Black, Impact, sans-serif" font-size="34" fill="${tint}" text-anchor="middle">${initials}</text>`,
    200, 200
  );
}
