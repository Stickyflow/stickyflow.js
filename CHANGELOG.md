# Changelog

All notable changes to this package are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**While the version is below `1.0.0`, the minor slot carries breaking changes** —
`0.1.x` → `0.2.0` may break the API. Pin an exact version if that matters to you.

Two things count as breaking here that are easy to overlook:

- **A change in rendered SVG output.** The golden suite (`test/__golden__/`) exists
  precisely to make those visible; regenerating a golden is never a silent act.
- **A bump of `DOM_CONTRACT_VERSION`.** Renderer and viewer negotiate on it, so a
  mismatch makes `createViewer()` refuse to mount.

## [Unreleased]

### Added

- **Data binding.** A document can declare `DataSource` blocks with typed fields
  and bind properties to them with `key: <- expression`. The runtime
  (`createBindingRuntime`, `renderBound`, `createDataSource`) validates the
  bindings against the declared types, re-renders only what changed, and reports
  problems as diagnostics. Expressions support arithmetic, comparisons,
  `&&` / `||`, boolean literals and number functions such as `moveToward`.
- **Events and handlers.** `onPress`, `onRelease`, `onTap` and `onDrag` on
  Shapes, Texts and Widgets, and `onTick` on a record `DataSource`, write to
  data sources (`onTap: counter.value <- counter.value + 1`). Element state is
  readable in expressions as `id.pressed`, `id.hovered` and `id.pointer`.
  `connectInteraction(viewer, runtime)` from `stickyflow/viewer` wires pointer
  input to the runtime; `viewer.setPaused()` freezes shader time and ticks.
- **Shaders and widgets.** A `Shader` block with parameters that can be bound to
  data, new built-in shaders (`plasmaGauge`, `tickScale`, `button`,
  `chromaticGlassPlate`, orb and halo effects), `shaderProgram` and
  `SHADER_DEFAULTS` as exports, a native `RollingNumber` widget, a `tickScale`
  widget with numbers and a `ruler` widget with a bending wire and a knob.
- **Text block** with wider font weights and letter spacing, and editable
  `Shader` blocks.
- **Line charts:** `lineWidth`, `lineGlow`, `pointSize`, `pointFill`,
  `pointStrokeWidth`, per-series `dash` and `strokeWidth`, gradient strokes,
  and `highlightPoints` with a guide and a label.
- **Pie charts:** `pieStartAngle`, `pieSweep`, `pieExplode` (and a per-series
  `offset`), `pieGlow`, `pieStroke`, `pieStrokeWidth`, `pieLabelPosition`,
  `pieLabelContent`, `pieLabelColor` and `pieCenterText`.
- **Bar charts:** horizontal bars, segmented bars with gap and snap, tracks with
  hatching, photo backgrounds with frosted glass, per-bar gradients, glow, value
  labels, axis lines and ticks.
- Change-highlighting: `viewer.update()` takes an opt-in `highlightChanges` flag
  that briefly flashes the shapes an update added or changed, plus a `sceneDiff`
  event (always emitted) with added, removed and changed owner ids.
  `highlightChanges` also accepts `{ color }`.
- Bending orthogonal links with segment handles, editable frame titles, move and
  resize of widgets, an isometric snap grid for move and axis resize.
- Circular `radial` charts and configurable polar `areaOpacity`.
- Tier layering, viewer encapsulation and the headless guarantee are enforced by
  `test/boundary.test.ts`. A jsdom-based test project (`npm run test:dom`) covers
  the DOM-bound interaction tier.

### Changed

- **Breaking (terminology).** Runtime and interaction APIs use the canvas-object
  vocabulary: `entityClick` is `canvasObjectClick`, and the pure patch helpers
  are `insertCanvasObject` / `removeCanvasObject`. Diagnostic ownership is
  exposed as `ownerId` instead of `entityId`. The legacy SFL `Entity` block and
  the version-1 `data-sf-role="entity"` value remain supported.
- **Breaking (isometric objects).** One `fill` replaces `topFill`, `frontFill`
  and `sideFill`; the shaded sides are derived from it.
- **Breaking (internal module layout).** `rendering/renderScene` is split into
  `rendering/scene`, `rendering/renderInput` and `rendering/domContractVersion`.
  Only deep imports into `dist/rendering/renderScene` are affected.
- **Breaking (`Token`).** Lexer tokens carry required `endLine` and `endCol`.
- DOM-contract access moved into its own `domContract` tier, used by both the
  viewer and the interaction tier. `stickyflow/interaction` uses only the public
  `stickyflow/viewer` API.
- A pie label drag writes `labelOffsetX` and `labelOffsetY` instead of a
  `labelPulled` flag.
- The legend is off by default; `showLegend: true` turns it on.
- The package contains no comments in its sources, and the largest functions are
  split into small ones. Rendered output is byte-identical.

### Fixed

- `stickyflow/web-component` can be imported where there is no DOM (SSR). It no
  longer throws at import time, and `defineStickyflowDiagram()` does nothing
  without `customElements`.
- A property change on a chart no longer lands in a nested block that happens
  to share the key (for example the `text` of a `Rule`).
- A pie label can be pulled out of the ring again; its offset was clamped to zero.
- Pie and polar-area labels on black or gray slices stay readable.
- A glow on a small element is no longer cut to a box by the filter region.
- SFL patching no longer corrupts documents containing `"""` multiline strings.
  Block and property positions come from the real lexer, so there is a single
  SFL grammar.
- Property values that span multiple lines are replaced as a whole.
- A throwing host event handler no longer prevents the remaining handlers from
  running; the error is rethrown asynchronously.
- A press that the document handles no longer selects the element afterwards.
- Widget digits follow a changed value on update; shader surfaces render at the
  size shown on screen, so zoomed widgets stay sharp.

## [0.1.0] - 2026-07-26

First versioned release. Not yet published to npm.

### Added

- **`stickyflow`** — the static tier. `render()` / `renderCanvas()` turn SFL text
  into a self-contained SVG string with no DOM involved, so it runs in Node, in
  SSR, or in a build step. Also exposes the staged pipeline behind it
  (`parse`, `canonicalize`, `sflToCanvasState`, `sflToImportJson`,
  `sflToRenderInput`) for tools that need an intermediate representation.
- **`stickyflow/viewer`** — the read-only interactive tier. `createViewer()`
  mounts a diagram into a container element with select, hover, pan and zoom, and
  emits serializable events. Never mutates its own model.
- **`stickyflow/interaction`** — the editing tier, layered on top of the viewer.
  Two halves that can be used independently:
  - `bindEditing()` binds DOM gestures — double-click text edit, drag-to-move
    (including multi-selection), drag-to-resize, and drag-to-reconnect link
    endpoints — each reporting a serializable event rather than mutating anything.
  - Pure patch functions with no DOM dependency, usable from Node:
    `applyTextChange`, `applyMoveChange`, `applyResizeChange`,
    `applyLinkReconnectChange` turn a gesture's event into updated SFL text;
    `insertEntity`, `removeEntity`, `insertLink`, `removeLink` cover structural
    changes that no gesture produces.
- **`stickyflow/web-component`** — `defineStickyflowDiagram()` registers a drop-in
  `<stickyflow-diagram>` element.
- **`Table` as a first-class SFL block kind.** `Table t { … }` alongside the
  existing `Container t { kind: table … }`, which keeps working.
- **Interactive DOM contract** (`DOM_CONTRACT_VERSION`, currently `1`) — every
  rendered node carries its owner's role and id, so an interaction layer can map
  any sub-node back to the entity it belongs to.
- **Committed golden renders** (`test/__golden__/`) locking the pipeline's output,
  plus a repeat-render check asserting byte-identical results.

### Fixed

- **Link `segments:` were silently dropped.** A list-valued property never reached
  the renderer, because the generic string-props reader used for every other link
  property cannot stringify a list. Manually adjusted orthogonal routes now
  survive the round trip and render as authored.
- **Single-line blocks were mis-measured when patching SFL.** Block ranges were
  found by counting braces per line as a net delta, which cannot tell a block that
  opens and closes on one line apart from a line with no braces at all — so an
  edit could swallow the following sibling block. Brace matching is now a real
  character scan.
- **`Table` was missing from the patcher's block-header pattern**, making every
  `apply*Change` call a silent no-op for tables declared with the new keyword.
- **Locale-dependent node ordering.** Equal-order scene nodes were tie-broken with
  `localeCompare`, which is host- and ICU-dependent and could reorder output
  across machines. Now a locale-independent code-point compare.

[Unreleased]: https://github.com/D-Queck/stickyflow.js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/D-Queck/stickyflow.js/releases/tag/v0.1.0
