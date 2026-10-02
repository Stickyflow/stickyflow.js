<p align="center">
  <img src="assets/ai-provider-dark-rounded.png" alt="Stickyflow AI provider integration" width="900">
</p>                                      

-------------------------------------------------- StickyFlow.js----------------------------------------------------------

Framework-independent SFL parser, render-scene, SVG runtime and interactive viewer. Parses the SFL diagram 
language and renders it — statically for docs (like Mermaid, but with precise positioning and far more styling), or
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
  model/             L0 framework-agnostic diagram model and geometry
  sflLanguage/       L1 SFL Language: AST, lexer, parser and canonical emitter
  sflSemantic/       L2 SFL Semantic: SFL AST → resolved canvas state
  renderInput/       L3 renderer contract, SFL adapter and presentation-value decoding
  importJson/        canvas-state → Stickyflow import JSON adapter
  rendering/         renderScene, buildRenderScene, renderSceneToSvg
  render.ts          render(sfl) / renderCanvas(input) — static tier
  index.ts           static public API  →  import 'stickyflow'
  viewer/            interaction tier   →  import 'stickyflow/viewer'
  web-component/     <stickyflow-diagram>  →  import 'stickyflow/web-component'
```

The three tiers and their one-way dependency are described under *Two tiers*
below and enforced by `test/boundary.test.ts`.

## Known gaps (documented, not hidden)

- **Absolute link waypoints have no SFL representation.** A manually-adjusted
  orthogonal route's per-segment perpendicular offsets (`segments:` in SFL,
  `segmentOffsets` once parsed) *do* round-trip and render correctly — fixed:
  `segments:` parses as a `list` value, which the generic string-props reader
  (`asString`, used for every other Link property) silently couldn't
  stringify, so the value never reached the renderer at all before. Absolute
  waypoints (`Link.waypoints`, a list of literal points rather than relative
  offsets) are a separate, narrower gap: nothing writes them to SFL text in
  the first place, so there's nothing yet to read back.
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

**Opting out: `measureText`.** A host that would rather match its own text
layout than be reproducible can pass real metrics in and take over the wrap:

```ts
import { render } from 'stickyflow'

render(sfl, {
  // called once per text node with that node's resolved font
  measureText: (fontFamily, fontSize) => {
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.font = `${fontSize}px ${fontFamily}`
    return {
      measure: (text, bold) => {
        ctx.font = `${bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`
        return ctx.measureText(text).width
      },
      spaceWidth: ctx.measureText(' ').width,
    }
  },
})
```

This is the seam for stickyflow-atlas specifically: its
`createTextMeasurer(fontFamily, fontSize)` already returns exactly this
`{ measure, spaceWidth }` pair, so it can be handed over with no adapter — and
its SVG export then breaks lines where its live Konva canvas does, instead of
where the heuristic guesses.

Leaving `measureText` unset keeps the default heuristic, and with it the
byte-identical output the golden SVGs pin. Supplying it trades that away:
output then depends on the fonts installed wherever it ran. Both wraps are
greedy and break only at word boundaries; they differ in the fit test (a
per-box character budget vs. per-word measured widths), so the same string can
break at different points under each.

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
together), drag a corner handle to resize, drag either endpoint of a selected
link onto a new anchor — a different spot on the same entity, or a different
entity entirely — to reconnect it. The dragged endpoint follows the cursor as
a free "ghost" over empty canvas and snaps to the nearest point on whichever
entity's under the pointer, so the gesture reads as continuous rather than
freezing until you land exactly on a target. All with a live preview (real
router, real text re-wrap) while the gesture is in progress. The package never mutates its
own model — it's a **controlled component**: each gesture only emits an event
with what changed, and the diagram visually reverts unless the host calls
`viewer.update()` with new content (a link-reconnect drag released over empty
canvas cancels the same way — the event simply never fires).

```ts
import { createViewer } from 'stickyflow/viewer'
import { bindEditing, applyTextChange, applyMoveChange, applyResizeChange, applyLinkReconnectChange } from 'stickyflow/interaction'

const viewer = createViewer({ container, source, interactive: true })
const editing = bindEditing(viewer)

let currentSource = source
editing.on('textChange', event => { currentSource = applyTextChange(currentSource, event); viewer.update({ source: currentSource }) })
editing.on('moveChange', event => { currentSource = applyMoveChange(currentSource, event); viewer.update({ source: currentSource }) })
editing.on('resizeChange', event => { currentSource = applyResizeChange(currentSource, event); viewer.update({ source: currentSource }) })
editing.on('linkReconnect', event => { currentSource = applyLinkReconnectChange(currentSource, event); viewer.update({ source: currentSource }) })
```

`applyTextChange`/`applyMoveChange`/`applyResizeChange`/`applyLinkReconnectChange`
are pure (no DOM, run in Node too) and ship so a host doesn't have to hand-roll
its own SFL patcher.
They patch only the touched property's own line(s) — via brace-depth block
location, not a full parse-mutate-emit round trip (there's no reverse
serializer in this package yet, see *Known gaps*) — so everything else in the
document (comments, formatting, unrelated blocks) survives untouched, and
`applyMoveChange` resolves the entity's *current* position through the real
parser first, so a delta lands correctly even when the position is inherited
from a composed `Layout` reference rather than set inline. A host is free to
ignore these and patch its own structured state instead — the events carry
everything needed either way.

**Structural changes** — `insertEntity`/`removeEntity`/`insertLink`/`removeLink`
(also from `stickyflow/interaction`, pure/no DOM) cover create/delete, which no
drag gesture produces on its own. Call them directly — from a host reflecting
an LLM-authored change, an "add shape" toolbar button, etc. — and pass the
result to `viewer.update()` the same way:

```ts
import { insertEntity, insertLink, removeEntity } from 'stickyflow/interaction'

currentSource = insertEntity(currentSource, { id: 'n2', kind: 'shape', text: 'New', x: 320, y: 80, width: 160, height: 60 })
currentSource = insertLink(currentSource, { id: 'l1', fromId: 'n1', toId: 'n2' })
currentSource = removeEntity(currentSource, 'n1') // also removes links attached to it by default
```

Same surgical-patch philosophy as the apply\*Change functions: `insertEntity`/
`insertLink` append a new block (indented to match, id-uniqueness- and
parent-checked first — a no-op if the id already exists or a referenced
entity/parent doesn't), `removeEntity`/`removeLink` splice out a block's exact
line range. Neither attempts a generic value formatter for arbitrary style
properties — SFL's quoting rules depend on each property's own semantics, not
just the JS type — so extra properties go through an optional raw `body`
string of already-valid SFL text instead.

### Change-highlighting

`viewer.update({ source, highlightChanges: true })` briefly flashes an amber
ring/halo around whichever shapes that update actually added or changed —
opt-in, since a shared viewer instance may receive both self-caused updates
(the host's own `apply*Change` calls above) and updates that genuinely
originate elsewhere (a re-render after a remote edit, an LLM-authored patch),
and only the latter usually wants the flash. A `sceneDiff` event fires on
every `update()` regardless of the flag — `{ diagramId, added, removed,
changed }`, owner ids — for a host that wants the raw diff (a toast, a log)
without the built-in visual:

```ts
viewer.on('sceneDiff', ({ added, removed, changed }) => {
  console.log(`${added.length} added, ${removed.length} removed, ${changed.length} changed`)
})

// Self-caused — no flash, the reader already just watched this happen.
editing.on('moveChange', event => { currentSource = applyMoveChange(currentSource, event); viewer.update({ source: currentSource }) })

// Arrived from elsewhere — flash the touched shapes.
viewer.update({ source: incomingSource, highlightChanges: true })

// Pass { color } instead of `true` for a host that can tell this update apart
// from an ordinary one (e.g. it looks like a bulk/tool-driven rewrite rather
// than a hand-typed edit) and wants a visually distinct flash.
viewer.update({ source: incomingSource, highlightChanges: { color: '#2563eb' } })
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

### Examples (standalone projects)

`demo/` above runs against this package directly. `examples/` holds self-contained
projects with their own `package.json`, each consuming the package the way a real
host would:

- **`examples/sfl-chat`** — an LLM answers in SFL, the diagram renders and stays
  editable, and your canvas edits become the context for the next turn. The full
  round trip this package exists for, in about 200 lines. Needs an OpenAI and/or
  Anthropic key; see its own README.
- **`examples/sfl-vue`** — the same round trip consumed from a Vue project
  through `stickyflow/web-component`'s `<stickyflow-diagram>` tag instead of
  the raw viewer/interaction API — the "least setup, no editing" counterpart
  to sfl-chat's "full control, includes editing." Proof that the package
  works outside a vanilla-TS host, not just a claim. See its own README for
  exactly which sfl-chat features it does and doesn't carry over, and why.

Neither `demo/` nor `examples/` ships in the npm tarball (`files` is an allowlist).

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

## Lint, format, CI

Biome is the single lint + format tool (`biome.json`); `.gitattributes` pins the
working tree to LF so the same file is checked on Windows and on the CI runner.

```bash
npm run lint      # biome check — formatting + lint rules, no writes
npm run lint:fix  # apply the safe fixes
npm run format    # formatting only
npm run ci        # lint + typecheck + test + verify — exactly what CI runs
```

`tsconfig.json` runs with `noUnusedLocals`/`noUnusedParameters`, so a dead import
left behind by a file split fails the typecheck instead of accumulating.

Two rules stay at warning level on purpose and do not fail the build:
`noNonNullAssertion` (the lexer, parser and sankey layout lean on `!` in places
where the surrounding invariant is local and obvious) and `noExplicitAny` (the
`sfl/adapters/importJson` boundary is untyped JSON by design).
`.github/workflows/ci.yml` runs `npm run ci` on Node 18, 20 and 22.
