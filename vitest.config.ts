import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// The vertical slice imports the REAL frontend source (no fork). These aliases
// mirror frontend/tsconfig.json so the package consumes the app's parser and
// render pipeline unchanged — proving portability against the actual code.
const src = resolve(here, '../../frontend/src');

export default defineConfig({
  resolve: {
    // Only seam left to the app: the SFL core (not yet extracted). The render
    // half is local, so no @entities/@shared aliases are needed any more.
    alias: [{ find: '@features', replacement: resolve(src, 'features') }],
  },
  test: {
    // Node — deliberately NOT jsdom. If the render core needs a DOM, this fails,
    // which is exactly the headless guarantee we want to prove.
    environment: 'node',
    root: here,
    include: ['test/**/*.test.ts'],
  },
});
