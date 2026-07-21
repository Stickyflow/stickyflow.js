# stickyflow (vertical slice)

First step of the `stickyflow.js` effort (see `docs/SFL/STICKYFLOW_JS_IMPLEMENTATION_PLAN.md`
and `docs/SFL/STICKYFLOW_JS_ADR_SUPPLEMENT.md`).

**Purpose of this slice:** prove that the SFL parser + render-scene + SVG pipeline
runs **headless** — Node, no DOM, no Konva, no React — by consuming the *real*
app source unchanged (no fork). If that holds, the biggest risk in the plan
(RenderScene portability) is retired before any monorepo/packaging work begins.

## What works today

```ts
import { render } from 'stickyflow';

const { svg, width, height, diagnostics } = render(sflSourceText);
// svg is a complete, deterministic SVG string. render() never touches the DOM.
```

Pipeline: `SFL text → parse (real SFL core) → sflToImportJson → sflToRenderInput
(new pure adapter) → buildRenderScene → renderSceneToSvg`.

- `render(source)` — SFL text to SVG.
- `renderCanvas(input)` — a pre-built `RenderInput` to SVG.
- Re-exports the real `parse`, `canonicalize`, `sflToCanvasState`, `sflToImportJson`.

See `demo-output.svg` for a sample render.

## How it consumes the app

Not a fork. `vitest.config.ts` / `tsconfig.json` alias `@entities/*`, `@features/*`,
`@shared/*` to `../../frontend/src`, so the package imports the live app files.
The eventual extraction (plan M1/M2) replaces these aliases with real package
dependencies; until then this proves portability against the actual code.

## Known slice-1 gaps (documented, not hidden)

- **Swimlanes** don't render from SFL: the app's own SFL import already collapses
  them into frames without lane data (`sflToImportJson`), so lanes don't survive
  the round-trip yet. Entity/frame/table/link paths are covered.
- **Link waypoints**: v3 JSON carries `segmentOffsets`, not absolute waypoints, so
  orthogonal links use default routing rather than saved bends.
- **Text outlines** (`textMode: 'outlines'`) are intentionally excluded — they pull
  `opentype.js` + Vite `?url` font imports. The FontRegistry decision (ADR-01)
  addresses this before it enters the core path.

## Running the tests

The package has no `node_modules` yet (that arrives with the workspace migration).
Run via the frontend's installed vitest:

```bash
cd frontend
node ./node_modules/vitest/vitest.mjs run --config ./stickyflow.vitest.config.ts
```

All tests use `environment: 'node'` — a green run is the headless proof.
