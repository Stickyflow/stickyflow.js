import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// The vertical slice imports the REAL frontend source (no fork). These aliases
// mirror frontend/tsconfig.json so the package consumes the app's parser and
// render pipeline unchanged — proving portability against the actual code.
const src = resolve(here, '../../frontend/src');
const alias = (prefix: string, target: string) => ({ find: prefix, replacement: resolve(src, target) });

export default defineConfig({
  resolve: {
    alias: [
      alias('@entities', 'entities'),
      alias('@links', 'entities/links'),
      alias('@frames', 'entities/frames'),
      alias('@shapes', 'entities/shapes'),
      alias('@boards', 'entities/boards'),
      alias('@shared', 'shared'),
      alias('@lib', 'shared/lib'),
      alias('@features', 'features'),
    ],
  },
  test: {
    // Node — deliberately NOT jsdom. If the render core needs a DOM, this fails,
    // which is exactly the headless guarantee we want to prove.
    environment: 'node',
    root: here,
    include: ['test/**/*.test.ts'],
  },
});
