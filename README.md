# stickyflow (vertical slice)

First step of the `stickyflow.js` effort (see `docs/SFL/STICKYFLOW_JS_IMPLEMENTATION_PLAN.md`
and `docs/SFL/STICKYFLOW_JS_ADR_SUPPLEMENT.md`).

**Status:** the SFL parser + render-scene + SVG pipeline runs **headless** — Node,
no DOM, no Konva, no React. The whole pipeline (SFL core **and** render half) is
now **extracted into this package** — there are no app aliases left; the only
external reference is the `vitest` dev dependency. The package is app-independent.

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

## Structure & what is extracted

The **render half is now owned by this package** (plan M2, render-scene extraction):

```
src/
  sfl/                 SFL core (plan M1): ast, lexer, parser, emitter,
                       sflToCanvasState, adapters/{sflToImportJson,decodeStyles}
                       + local index — pure, alias-free
  entities/            model types + pure geometry (shapes, frames, links,
                       swimlanes, tables) — extracted, all-relative imports
  shared/ui/           the 3 pure leaf files the models depend on (color/shadow)
  rendering/           renderScene, buildRenderScene, renderSceneToSvg — extracted
  sflToRenderInput.ts  model adapter: SFL v3 JSON → RenderInput
  render.ts / index.ts public API
```

All files were copied from `frontend/src` and their alias imports rewritten to
relative — **no app source was touched**. Byte-identical golden SVGs before/after
each copy prove every extraction step is behaviour-neutral. The SFL core is a
minimal closure of the four functions the render path uses; the app's editor,
hooks, autocomplete and highlighting stay in the app and are not copied here.

**No app seam remains** — the package builds and tests with zero app aliases. The
app still has its own copy of these files (a transitional dual copy, guarded by
the golden suite as the plan endorses); the two reconverge when the app is
rewired to consume this package (Arbeitspaket E).

> Divergence note: this package's `buildRenderScene` carries the ADR-02 tie-break
> fix (below); the app's copy does not yet.

## Known slice-1 gaps (documented, not hidden)

- **Swimlanes** don't render from SFL: the app's own SFL import already collapses
  them into frames without lane data (`sflToImportJson`), so lanes don't survive
  the round-trip yet. Entity/frame/table/link paths are covered.
- **Link waypoints**: v3 JSON carries `segmentOffsets`, not absolute waypoints, so
  orthogonal links use default routing rather than saved bends.
- **Text outlines** (`textMode: 'outlines'`) are intentionally excluded — they pull
  `opentype.js` + Vite `?url` font imports. The FontRegistry decision (ADR-01)
  addresses this before it enters the core path.

## Determinism

`test/__golden__/*.svg` are committed golden renders — real, viewable SVGs that
lock the pipeline's output (plan §18.3, ADR-02). `test/golden.test.ts` diffs
against them and also asserts byte-identical output across repeated renders.
Regenerate intentionally with `vitest -u` after a reviewed change.

**Cross-environment tie-break (ADR-02) — fixed.** `buildRenderScene` previously
broke node-sort ties with `a.id.localeCompare(b.id)`, which is host/ICU-dependent
and could reorder equal-`order` nodes (e.g. a cylinder's `-body`/`-bottom`
sub-nodes) across machines. Now that this package owns the file, the tie-break is
a locale-independent code-point compare. The change is byte-neutral on the
current fixtures (ASCII ids), so no golden was regenerated — it removes a latent
cross-machine hazard without altering output.

## Running the tests

The package has no `node_modules` yet (that arrives with the workspace migration).
Run via the frontend's installed vitest:

```bash
cd frontend
node ./node_modules/vitest/vitest.mjs run --config ./stickyflow.vitest.config.ts
```

All tests use `environment: 'node'` — a green run is the headless proof.
