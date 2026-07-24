import { defineConfig } from 'tsup';

// Three library entries (one per tier) as ESM + CJS + .d.ts, with a shared chunk
// so the static core isn't duplicated across viewer/web-component. Plus a
// self-contained minified IIFE for dropping the web component in via <script>.
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'viewer/index': 'src/viewer/index.ts',
      'interaction/index': 'src/interaction/index.ts',
      'web-component/index': 'src/web-component/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
    treeshake: true,
    outDir: 'dist',
  },
  {
    entry: { 'stickyflow-diagram': 'src/web-component/iife.ts' },
    format: ['iife'],
    globalName: 'Stickyflow',
    minify: true,
    sourcemap: true,
    outDir: 'dist',
  },
]);
