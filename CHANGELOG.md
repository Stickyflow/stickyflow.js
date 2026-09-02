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

### Fixed

- SFL patching no longer corrupts documents containing `"""` multiline strings.
  The patcher used its own line-local regex scanner, so a `{` or `//` inside a
  multiline string desynchronised brace depth for the rest of the document —
  editing such an entity could produce unparseable SFL. Block and property
  positions now come from the real lexer, so there is a single SFL grammar.
- Property values that span multiple lines are replaced as a whole instead of
  only their first line.
- A throwing host event handler no longer prevents the remaining handlers from
  running; the error is rethrown asynchronously instead of being swallowed.

### Changed

- **Breaking (internal module layout).** `rendering/renderScene` is split into
  `rendering/scene` (scene vocabulary), `rendering/renderInput` (pipeline input)
  and `rendering/domContractVersion`. The public entry re-exports the same
  names, so only deep imports into `dist/rendering/renderScene` are affected.
- **Breaking (`Token`).** Lexer tokens now carry required `endLine`/`endCol`.
- DOM-contract access (`resolveOwner`, `findOwnerNode`, overlays, SVG namespace)
  moved out of `viewer/` into its own `domContract` tier, consumed by both the
  viewer and the interaction tier. `stickyflow/interaction` now uses only the
  public `stickyflow/viewer` API.
- Added circular `radial` charts and configurable polar `areaOpacity`.

### Added

- Tier layering, viewer encapsulation and the headless guarantee are enforced by
  `test/boundary.test.ts` instead of convention.
- A second, jsdom-based test project (`npm run test:dom`) for the DOM-bound
  interaction tier. The node-only run stays untouched as the headless proof.

- Add full SFL parsing and headless SVG rendering for freeform `Path` and `Chart` entities.
- Preserve explicit `[x, y]` series data for line and scatter charts while retaining legacy flat line-series support.
- Add the registry-ready polar `radar` chart type with category labels, radial scale, polygon grid and multi-series rendering.

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
