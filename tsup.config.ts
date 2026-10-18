import { defineConfig } from 'tsup';

// Five library entries (one per tier) as ESM + CJS + .d.ts, with a shared chunk
// so the static core isn't duplicated across viewer/web-component. Plus a
// self-contained minified IIFE for dropping the web component in via <script>.
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'binding/index': 'src/binding/index.ts',
      'viewer/index': 'src/runtime/viewer/index.ts',
      'interaction/index': 'src/runtime/interaction/index.ts',
      'web-component/index': 'src/runtime/webComponent/index.ts',
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
    entry: { 'stickyflow-diagram': 'src/runtime/webComponent/iife.ts' },
    format: ['iife'],
    globalName: 'Stickyflow',
    minify: true,
    sourcemap: true,
    outDir: 'dist',
  },
]);
