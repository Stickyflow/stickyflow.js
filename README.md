# stickyflow

Framework-independent SFL parser, render-scene, SVG runtime and interactive
viewer. Parses the SFL diagram language and renders it — statically for docs
(like Mermaid, but with precise positioning and far more styling), or
interactively for embedding in web projects and chatbots.

Part of the `stickyflow.js` effort (see `docs/SFL/STICKYFLOW_JS_IMPLEMENTATION_PLAN.md`
and `docs/SFL/STICKYFLOW_JS_ADR_SUPPLEMENT.md`). App-independent: no runtime
dependencies, no Konva, no React; the static tier is DOM-free and runs in Node.

## Quick start

```ts
import { render } from 'stickyflow';

const { svg, width, height, diagnostics } = render(sflSourceText);
// A complete, deterministic SVG string. render() never touches the DOM.
```

Pipeline: `SFL text → parse → sflToCanvasState → sflToImportJson → sflToRenderInput
→ buildRenderScene → renderSceneToSvg`.

## Structure

```
src/
  sfl/               SFL core: ast, lexer, parser, emitter, sflToCanvasState,
                     adapters/{sflToImportJson,decodeStyles} — pure, no DOM
  model/             framework-agnostic document model:
                       shapes/frames/links/swimlanes/tables + colors/shadows
                       geometry/{connectionLine,router,tables}
  rendering/         renderScene, buildRenderScene, renderSceneToSvg
  render.ts          render(sfl) / renderCanvas(input) — static tier
  sflToRenderInput.ts  model adapter: SFL v3 JSON → RenderInput
  index.ts           static public API  →  import 'stickyflow'
  viewer/            interaction tier   →  import 'stickyflow/viewer'
  web-component/     <stickyflow-diagram>  →  import 'stickyflow/web-component'
```

The three tiers and their one-way dependency are described under *Two tiers*
below and enforced by `test/boundary.test.ts`.

## Known gaps (documented, not hidden)

- **Link waypoints**: v3 JSON carries `segmentOffsets`, not absolute waypoints, so
  orthogonal links use default routing rather than saved bends.
- **Text outlines** (`textMode: 'outlines'`) are intentionally excluded — they pull
  `opentype.js` + font assets. The FontRegistry decision (ADR-01) addresses this
  before it enters the core path.
- **No reverse SFL emitter (`canvasStateToSfl`) yet**: `stickyflow/interaction`
  still emits `textChange`/`moveChange`/`resizeChange` events for the host to
  apply, rather than mutating a canonical model and serializing it back itself.
  `applyTextChange`/`applyMoveChange`/`applyResizeChange` (also from
  `stickyflow/interaction`, pure/no DOM) turn those events straight into
  updated SFL text via targeted line patches — not a full parse-mutate-emit
  round trip — so this is a thinner gap than it used to be, but a true
  controlled-component API (SFL as `value`/`onChange`, the model itself owning
  the mutation) is still the fuller version of this vision.
- **Large diagrams still pay full JS recompute on commit**: `viewer.update()`'s
  DOM write is incremental (`patchSceneNodes`, only what differs), but the
  geometry it diffs against is recomputed for the whole scene graph every
  time — text measurement, link routing, everything — not just the changed
  entity. Fine at the hundreds-of-shapes scale this package targets; a
  many-thousand-node board would need incremental geometry, which doesn't
  exist yet.
- **No conflict handling for concurrent writers**: `applyMoveChange` and
  friends patch whatever SFL string you pass in — there's no version stamp or
  check that it's still the text the drag started from. Two writers racing
  (a user dragging while an LLM or a collaborator's change lands) can produce
  a patch applied against stale text. A host serializing writes today avoids
  this; a built-in guard (a version/hash per patch call) doesn't exist yet.
- **Accessibility covers structure, not meaning**: the DOM contract gives every
  node a role, an id, and a focusable/labelled primary (`tabindex`,
  `aria-label`) — enough for a screen reader to enumerate what's on the board
  and read each label. It does not yet describe *relationships* (which link
  connects which entities, table semantics beyond a labelled grid, a
  meaningful reading order for a non-trivial layout) — a sighted user reads
  those from position; a screen reader user currently can't.

> The app still keeps its own copy of the render/SFL files (a transitional dual
> copy, guarded by the golden suite). This package's `buildRenderScene` carries
> the ADR-02 tie-break fix the app copy doesn't have yet; they reconverge when
> the app is rewired to consume this package.

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

**Text layout is deterministic; drawn glyphs aren't.** `wrapText` computes line
breaks and text bounds from a fixed character-width model
(`width / (fontSize * 0.58)`, `model/geometry/text.ts`) — not `measureText` or
any browser/OS font metric — so line breaks, label heights, and therefore link
anchors and the diagram's own bounds are identical on every machine, regardless
of installed fonts. What isn't identical is the exact pixel shape of each
glyph the browser paints inside that layout: two systems missing the requested
`fontFamily` fall back to different substitute fonts, so a rendered word can
look subtly different even though its wrapping and bounding box are provably
the same SVG output. Exact glyph-level determinism would need real font
metrics baked in (the FontRegistry decision, ADR-01) — out of scope until
then.

## Security

`render()`'s output is meant to be inserted via `innerHTML` (that's how the
docs examples and `stickyflow/viewer` use it), so everything user-supplied —
entity/link text, ids — is escaped before it reaches the SVG string
(`renderSceneToSvg.ts`'s `xml()`: `& < > " '`), and ids are additionally
restricted to a safe character set (`safeId`). There is no `<script>`,
`<foreignObject>`, or event-handler attribute anywhere in the renderer's own
output, and no attribute ever carries a user-supplied URL — `href`/`url(...)`
only ever point at gradients/markers/filters this package generates itself, by
its own generated id. `test/domContract.test.ts` asserts this against an
actively hostile payload (an attribute break-out plus an inline
`<script>`/`onerror` string), not just plain text.

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

## Editing: `stickyflow/interaction`

A third, opt-in tier layered on top of `stickyflow/viewer` (never the other way
round): double-click to edit text, drag to move (a multi-selection moves
together), drag a corner handle to resize — all with a live preview (real
router, real text re-wrap) while the gesture is in progress. The package never
mutates its own model — it's a **controlled component**: each gesture only
emits an event with what changed, and the diagram visually reverts unless the
host calls `viewer.update()` with new content.

```ts
import { createViewer } from 'stickyflow/viewer'
import { bindEditing, applyTextChange, applyMoveChange, applyResizeChange } from 'stickyflow/interaction'

const viewer = createViewer({ container, source, interactive: true })
const editing = bindEditing(viewer)

let currentSource = source
editing.on('textChange', event => { currentSource = applyTextChange(currentSource, event); viewer.update({ source: currentSource }) })
editing.on('moveChange', event => { currentSource = applyMoveChange(currentSource, event); viewer.update({ source: currentSource }) })
editing.on('resizeChange', event => { currentSource = applyResizeChange(currentSource, event); viewer.update({ source: currentSource }) })
```

`applyTextChange`/`applyMoveChange`/`applyResizeChange` are pure (no DOM, run
in Node too) and ship so a host doesn't have to hand-roll its own SFL patcher.
They patch only the touched property's own line(s) — via brace-depth block
location, not a full parse-mutate-emit round trip (there's no reverse
serializer in this package yet, see *Known gaps*) — so everything else in the
document (comments, formatting, unrelated blocks) survives untouched, and
`applyMoveChange` resolves the entity's *current* position through the real
parser first, so a delta lands correctly even when the position is inherited
from a composed `Layout` reference rather than set inline. A host is free to
ignore these and patch its own structured state instead — the events carry
everything needed either way.

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
