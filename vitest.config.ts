import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// Fully self-contained: SFL core + render half are local, so there are no app
// aliases at all. (This config is used once the package has its own vitest;
// today the frontend-hosted runner executes the same setup.)
export default defineConfig({
  test: {
    // Node — deliberately NOT jsdom. If the pipeline reached for a DOM this would
    // fail, which is exactly the headless guarantee we want to keep proving.
    environment: 'node',
    root: here,
    include: ['test/**/*.test.ts'],
  },
});
