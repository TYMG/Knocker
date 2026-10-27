// Bundles dev/local-server.ts: the real API on an in-memory database (no AWS), plus a built web
// app, for trying the live league on one computer. Not deployed.
//   node dev/build-local.mjs && node dev/local-server.mjs ../web/dist   -> http://127.0.0.1:4190
// It starts with two teams (Left & Right, Tilt Me Tender; PIN 4821) and an admin (Matt,
// "correct horse battery"), and tonight's night opening 10 minutes after it starts.
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
await build({
  entryPoints: [resolve(here, 'local-server.ts')],
  outfile: resolve(here, 'local-server.mjs'),
  bundle: true, platform: 'node', format: 'esm', target: 'node22',
  // The stand-in database finds commands by their class names.
  keepNames: true,
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  plugins: [{
    name: 'local',
    setup(b) {
      // The API's database module becomes the in-memory one.
      b.onResolve({ filter: /\/db\.js$/ }, (a) => (a.importer.includes(`${'/'}src${'/'}`) ? { path: resolve(here, 'fake-db.ts') } : undefined));
      // Source files import each other as .js; point those at the .ts files.
      b.onResolve({ filter: /\.js$/ }, (a) => {
        if (!a.path.startsWith('.')) return undefined;
        const ts = resolve(a.resolveDir, a.path.replace(/\.js$/, '.ts'));
        return existsSync(ts) ? { path: ts } : undefined;
      });
    }
  }]
});
console.log('Built dev/local-server.mjs');
