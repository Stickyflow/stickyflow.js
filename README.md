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

## Interactive DOM contract (ADR-03)

The SVG is the binding surface for a viewer. Every node carries its owner's
identity so a click on any sub-node (a cylinder cap, a table cell, link text)
resolves to the entity via `closest('[data-sf-id]')`:

```html
<svg … role="img" data-sf-contract="1">
  <rect id="sf-shape-start" data-sf-role="entity" data-sf-id="start"
        data-sf-kind="rounded_rectangle" tabindex="0" aria-label="Start" …/>
  <path id="sf-link-go" data-sf-role="link" data-sf-id="go"
        tabindex="0" aria-label="next" …/>
```

- `data-sf-contract` on the root is the versioned handshake (`DOM_CONTRACT_VERSION`):
  a viewer checks it on mount and refuses a mismatch instead of binding blindly.
- `data-sf-role` ∈ `entity | link | frame | swimlane | table`; `data-sf-id` is the
  stable owner id; `data-sf-kind` is the shape type for entities.
- The **primary** node of each owner is focusable (`tabindex="0"`) and labelled
  (`aria-label`, whitespace-collapsed to one line). Ids and labels are XML-escaped.

`test/domContract.test.ts` asserts all of this on the SVG string — no browser
needed. This is the foundation the interactive viewer (M4) binds to.

## Two tiers: static vs interaction (kept strictly separate)

The package deliberately splits into two tiers, with a **one-way dependency**
(interaction may use static, never the reverse):

| Tier | Import | Runs | What |
|---|---|---|---|
| **Static** (docs/display, like Mermaid but richer) | `stickyflow` | headless (Node) | `render(sfl) → svg`, deterministic, DOM contract |
| **Interaction** (embed, chatbots) | `stickyflow/viewer` | browser | mount, select/hover/click, zoom/pan, events |
| **Web component** (drop-in embed) | `stickyflow/web-component` | browser | `<stickyflow-diagram>`, static by default, `interactive` opts in |

The separation is **enforced by `test/boundary.test.ts`**: the static core must
not import from a browser tier (`viewer/`, `web-component/`) and must use no DOM
globals, so it always stays headless. A docs site pulls only the static tier and
pays nothing for viewer JS. The web component sits on top and composes both.

```html
<stickyflow-diagram interactive></stickyflow-diagram>
<script type="module">
  import { defineStickyflowDiagram } from 'stickyflow/web-component';
  defineStickyflowDiagram();
  document.querySelector('stickyflow-diagram').source = sflText; // or the source="" attribute
</script>
```

Inside the viewer the split continues:

```
src/viewer/
  display.ts      STATIC display — mount SVG + camera (fit/zoom/pan). No events.
  interaction.ts  INTERACTION — the only place with event listeners: select,
                  hover, click → serializable events. Model mutation (tier 2b)
                  attaches here later as applyOp(), without touching display.
  contract.ts / selection.ts / events.ts   PURE, node-tested logic (no DOM)
  index.ts        createViewer() — composes display + optional interaction
```

`createViewer` verifies the SVG's `data-sf-contract` on mount and refuses a
mismatch (ADR-03). Only `display.ts` / `interaction.ts` touch the DOM; everything
else is unit-tested under Node. **Browser behaviour is verified via the demo, not
the Node tests.**

### Demo (browser)

```bash
cd packages/stickyflow.js
npx vite demo      # then open the printed URL
```

- `index.html` — the viewer (`createViewer`): click to select (Ctrl/Shift =
  multi), wheel = zoom, drag = pan, Esc = clear; events stream into the panel.
- `web-component.html` — `<stickyflow-diagram>` static **and** interactive
  side by side.

## Build & distribution

The package is self-contained (`npm install` here pulls only `tsup`, `typescript`,
`vitest` — no runtime deps).

```bash
npm run build     # tsup → dist/: ESM + CJS + .d.ts per tier, shared chunks, + IIFE
npm run smoke     # imports the BUILT dist/index.js in Node and renders headless
npm run verify    # build + smoke in one
```

`dist/` layout (mapped by `exports`):

| Import | ESM | CJS | Types |
|---|---|---|---|
| `stickyflow` | `dist/index.js` | `dist/index.cjs` | `dist/index.d.ts` |
| `stickyflow/viewer` | `dist/viewer/index.js` | `.cjs` | `.d.ts` |
| `stickyflow/web-component` | `dist/web-component/index.js` | `.cjs` | `.d.ts` |

`dist/stickyflow-diagram.global.js` is a minified, self-registering **IIFE** for a
plain CDN `<script>` — no bundler, `<stickyflow-diagram>` just works:

```html
<script src="…/stickyflow-diagram.global.js"></script>
<stickyflow-diagram interactive source="sfl 1.2 …"></stickyflow-diagram>
```

## Running the tests

```bash
npm test          # vitest, environment: 'node' — a green run is the headless proof
```
