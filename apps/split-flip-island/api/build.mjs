// Bundles the Lambda into dist/index.mjs (Terraform zips the dist folder).
import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  minify: true,
  sourcemap: false,
  // ESM bundles need require() for some AWS SDK internals.
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }
});
console.log('Built dist/index.mjs');
