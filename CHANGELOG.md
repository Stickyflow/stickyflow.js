# Changelog

- Added circular `radial` charts and configurable polar `areaOpacity`.

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

- Add full SFL parsing and headless SVG rendering for freeform `Path` and `Chart` entities.
- Preserve explicit `[x, y]` series data for line and scatter charts while retaining legacy flat line-series support.
- Add the registry-ready polar `radar` chart type with category labels, radial scale, polygon grid and multi-series rendering.
- Add vector SVG rendering for the 8 remaining chart types (`matrix`, `heatmap`, `hexbin`, `mekko`, `treemap`, `sankey`, `pie`, `boxplot`), reaching full parity with the main app's 13 chart types. No raster fallback is used — every mark is a genuine `rect`/`ellipse`/`path` primitive, matching the app's own render output shape-for-shape.
- Fix: `bar`/`boxplot` charts now actually apply `config.zones`' per-category color override — previously the field was parsed and round-tripped but silently ignored by the renderer for these two chart types (every other chart family already read it correctly).
- Add a `pattern` `ColorValue` kind (`hachure`/`cross-hatch`/`dots`, `PatternColor` in `model/colors.ts`) alongside solid/gradient/mesh, usable anywhere a `ChartZone.color` is read (currently: bar/boxplot's per-category override) and round-trippable through SFL as `pattern(<style>, <color>, <spacing>, <width>, <angle>)`, mirroring `gradient(...)`/`mesh(...)`.
- Add `ChartConfig.minimalAxes` (sketch-style axes): swaps a cartesian chart's numeric-tick grid/border for a plain arrow-tipped L-axis, matching the main app's own "Sketch axes" toggle. Not yet supported for `hexbin`/`boxplot`, which don't render axis ticks in this package at all yet (a pre-existing gap, not new).

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
