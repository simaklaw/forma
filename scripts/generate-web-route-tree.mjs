/**
 * Regenerates apps/web/src/routeTree.gen.ts for type-check/CI
 * without requiring a Vite dev/build pass.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Generator, getConfig } from '@tanstack/router-generator';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(root, 'apps/web');

const config = await getConfig(
  {
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
  },
  webRoot,
);

const gen = new Generator({ config, root: webRoot });
await gen.run();
console.log('routeTree.gen.ts updated');
