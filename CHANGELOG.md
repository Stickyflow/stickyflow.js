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

## [0.9.0] - 2026-10-28

### Added

- The `Repeat` block puts the blocks in it on a grid, one set for every cell, so a scene of hundreds of equal parts is a few lines. `columns` and `rows` (or `count`) set the grid, `step` the distance between cells and `origin` where it starts. In the blocks inside, a value can be computed: `col`, `row`, `index`, `x` and `y` are the cell, and `+ - * /`, comparisons, `floor`, `round`, `abs`, `min`, `max`, `sin`, `cos`, `sqrt`, `when(condition, a, b)`, `random(low, high)` and `pick(a, b, c)` work out the rest, as in `position: (x - y) * 0.866, (x + y) * 0.5` and `fill: pick("#79b04c", "#6aa84a")`. `seed` makes `random` and `pick` give the same result every time, `jitter` shifts every cell by up to that many units, `chance` keeps only that share of the cells, `where` keeps the cells for which an expression is true, and `order: diagonal` makes the cells from the back to the front of an isometric scene. Any other computed property of the Repeat is a name for the blocks in it, like a height worked out once. `mix(color, color, amount)` blends two colors and `shade(color, factor)` makes one lighter or darker, and `exp`, `pow` and `dist` give soft patches of color. A Repeat is turned into plain blocks when a document is read. The text is not changed, and a document without a Repeat reads exactly as before.
- `seams: false` in the style of an `Isometric` block leaves out the light lines along the edges of its box, so a scene of many blocks has no outlines. They are drawn unless it is `false`.
- `blend` in the style of a `Shape` sets how it mixes with what lies under it: `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, `exclusion`, `hue`, `saturation`, `color` or `luminosity`. With `multiply`, layers of colored glass darken each other where they overlap, as in a print. Left out, a shape covers what is under it.
- The shader program `glassDots` fills a circle with an uneven cloud of color whose edge bleeds out into the dark, and lays a grid of round glass dots over it. Every dot is a lens with a gradient of its own: it is lighter on the side that faces the middle and darker on the side that faces out, and the dots near the edge of the cloud are nearly black on their outer side. The cloud runs through `colorA` (light side), `colorB` (base), `colorC` (cool side) and `colorD` (hot patch), with a glow in `rimColor` around it. `spread`, `warp` and `glow` set how far the cloud reaches, how uneven its edge is and how strong the glow is, `lens` the darkening of the dots, and `dots`, `dotSize`, `stagger`, `angle`, `grain`, `intensity` and `speed` the rest. `sphere` is an extra: it wraps the grid round a ball, so the dots turn to ellipses toward the rim, lined up to the middle. It is `0` (flat) by default. The shader draws its own rectangle, so it also works on a `rectangle` or a `rounded_rectangle`, where the dots run on over the whole surface and some lie wholly outside the cloud: `scatter` is how many of them are drawn there, in the dark glow color. On a circle the picture ends at the edge of the circle, unless `round` is `0`.
- `clip: true` in the style of a `Container` of `kind: frame` cuts everything that sits in it at the edge of the frame, with its rounded corners. It works for turned shapes too. Text is not cut, because a text has no style to carry the clip.
- `blur` in the style of a `Shape` softens the whole shape. It is the spread in pixels, and `0` or no value keeps the edge sharp. A blurred shape keeps room around it, so the soft edge is not cut off.

## [0.8.0] - 2026-10-28

### Added

- The shader program `glowCard`, the surface of a card: dark glass with a thin edge and colored lights low in the card that curl like smoke, fade out from the side set by `angle` and turn white at that edge, with grit in the lit parts. Parameters are `colorA`, `colorB`, `colorC`, `baseColor`, `glowHeight`, `glowSpread`, `angle`, `core`, `rim`, `grain`, `warp`, `intensity`, `cornerRadius` and `speed`. It draws its own rectangle.
- The names and the color bar of a heatmap can stand on any side of its grid. `rowLabelSide` is `left` or `right`, `columnLabelSide` is `top` or `bottom`, and `legendSide` is `top`, `bottom`, `left` or `right`. `legendGap` sets the distance between the grid and the color bar, and `axisLabelSpace` sets how much room the names get beside the data. Left out, the room is as much as the longest name needs. The names of a heatmap follow the font, size and color of the axis.
- `xLabelGap` and `yLabelGap` set how far the labels stand from the graphic, in pixels, along the x axis and along the y axis.
- `titleAlign` and `axisLabelAlign` align the title over a chart and the names beside the data to `left`, `center` or `right`.
- `axisLabelAngle` stands the labels of heatmap columns, bar categories and boxplot boxes up, from `0` for flat to `90` for upright.
- `data-sf-snap-distance` on the svg sets in pixels how close a shape has to come to another before it snaps. Without it the distance stays 20.
- Round charts (`pie`, `radar`, `radial`, `radialBar` and `polarArea`) keep their proportions while they are resized, and any shape does while Shift is held.

## [0.7.0] - 2026-10-25

### Added

- The components `slider`, `progress` and `segmented`. A `slider` takes a value between `min` and `max` from the pointer, in steps of `step` if set. A `progress` shows a value as a bar or, with `variant: "ring"`, as a ring, and can write the share or the value into itself with `display`. A `segmented` shows the labels of `options`, separated by commas, and its value is the number of the chosen one, counted from 0.
- Three shader programs for backgrounds, which draw a rectangle or a rounded rectangle of their own, as `reactivePanel` does. `ledMatrix` is a wall of small pill-shaped lights with a glow that rises and drifts. `lightBand` is a band of light with a glow that runs through three colors. `silkFolds` is a folded cloth of satin with thin bright edges. Each one has `cornerRadius`, as a share of the shorter side, and `speed`, where 0 gives a still picture. `ledMatrix` and `silkFolds` react to the pointer, and `reaction` sets how strongly. On `ledMatrix` the places the pointer has been dim down behind it, and `trail` is how many seconds that takes. `pointerSize` sets how wide that stripe is. Its light can be moved with `originX` and `originY`, sized with `spread` and put out with 0, and `drift` sets how far it sways.
- A shader program can read `uWake`, 16 places the pointer has been over its surface, each as x, y and how much of it is left, when it has a number parameter `trail`, the seconds a place takes to fade out.
- A shader program can read `uPointer`, where the pointer is over its surface from 0 to 1 and counted from the lower left, and `uHover`, which glides to 1 while the pointer is over the surface and back to 0 when it leaves.
- The component `range`, a slider with two thumbs. `value` is the lower end and `valueEnd` the upper end, and both can be bound with `<->`, each to a field of its own. The nearer thumb follows the pointer, and the thumbs do not pass each other. It takes the `variant`, `direction` and `ticks` of the slider. Its interaction is `range`.
- `valueEnd` is a bindable property of a component that has a number property of that name. `runtime.slide(id, x, y)` takes the position as fractions of the width and the height.
- `componentTypes()` is exported from the main entry.
- `category` on a component descriptor, and `COMPONENT_CATEGORIES`, the list of the shelves a component is filed on: actions, selection, value input, text input, indicators, instruments, navigation and containers. The built-in components name their shelf.
- The component `knob`, a dial with an arc that fills up to the value. The pointer sets the value by its angle round the dial, between `min` and `max`, in steps of `step`. `start` and `sweep` set where the arc begins and how far it runs, and `display`, `thickness`, `face` and `dot` style it. Its interaction is `turn`.
- `direction: "vertical"` on a `slider` and on a `progress` bar stands them upright, and they fill from below. `ticks` on a `slider` draws that many marks along it, the two ends included, and `tickColor` colors them.
- `variant: "field"` on a `slider` draws a field that fills up to the value, with a thin handle at its end, the `label` at the left and the value at the right (`display` is `value`, `percent` or `none`). `surface`, `fill`, `radius`, `textColor` and `fontSize` style it.
- The component interactions `slide` and `pick`, and `runtime.slide(id, fraction)` on a binding runtime, which turns a position along the width of a component into its value.
- `animate` on `switch`, `checkbox`, `toggleButton` and `button`, and on the new components. It is the number of milliseconds a change of position, size, color or opacity takes to show. The default is 160 for the first four, 0 for `slider`, 300 for `progress` and 200 for `segmented`. A scene style can carry the same as `transition`, and the viewer patches the elements in place, so the browser does the animation.
- The shader program `reactivePanel` draws a rounded panel that can send light into the scene and receive it. A panel with `emission` lights the edges of the panels near it on the side that faces it. `reception` sets how much a panel takes in, `emitterFill`, `grain` and `grainScale` light and texture the inside of an emitter, and `glowRadius`, `borderWidth` and `cornerRadius` shape the glow and the border.
- `surfacePadding` on a `Shader` adds room around the shape for an outer glow, in canvas units. It is not a parameter of the program.
- A shader on a `rectangle` or a `rounded_rectangle` is drawn when its program draws a rectangle of its own. Today that is `reactivePanel`. Every other program still needs a `circle` or an `oval`.
- `self.id` in an expression is the id of the element the expression belongs to. In a binding of a `Shader` it is read separately for every shape that uses the shader, so one shader can light the tapped panel and no other. In an element handler it is the element that was pressed, so `onTap: glow.active <- self.id` works for any number of elements.

### Changed

- Every shader surface in the SVG carries `data-sf-shader-padding`, `0` when there is no padding.

## [0.6.0] - 2026-10-22

### Added

- An `Isometric` block takes a `symbol`. The outline of the `Symbol` is extruded by the height, and every wall that faces the viewer is shaded on its own. It works for any closed outline of three or more points that does not cross itself.
- `cornerRadius` in the style of an `Isometric` block rounds the vertical edges of the box or of an extruded symbol.
- `shape: sphere` draws an `Isometric` block as a shaded ball that sits in the center of its box.
- A point of a `Path` or a `Symbol` can carry a third value, its own tension. `0` makes the point a corner, so one outline can mix corners and curves. A point without one takes the `tension` of the whole path.
- `pathToSymbol()` turns a `Path` into a `Symbol`, and `symbolToPath()` turns it back. `pathBounds()` and `flattenPath()` give the box of a path and the points of its curve as short straight edges. The types `PathFrame`, `PathPoint` and `PathSymbol` are exported.
- The `Dimension` block draws a measure line with an arrow at each end, extension lines and a label. `start` and `end` are the two measured points, and `offset` is the distance of the line, positive to the left of the direction. Without `text` the label is the measured length, rounded to one decimal place, followed by `unit`. `isDimensionObject()` and the types `Dimension` and `SflDimensionObject` are exported, and `RenderInput` takes `dimensions`.

### Changed

- Moving a path through `applyMoveChange` keeps the tension of its points.
- An `Isometric` block with a `symbol` that has curved points uses the curve as many short straight edges.

## [0.5.0] - 2026-10-18

### Added

- The entry `stickyflow/binding` with `createDataSource`, `createBindingRuntime`, `buildBindingGraph`, `renderBound` and `interactiveElements`. The same names stay exported from `stickyflow` for now.
- The components `switch`, `checkbox`, `toggleButton` and `button`. A switch, a checkbox and a toggle button hold a boolean value, a button fires `onTap`. They are drawn from scene nodes, so they render without a DOM, and they carry `role`, `aria-checked` or `aria-pressed` and `aria-disabled`.
- `value: <-> source.field` binds the value of a component to a field of a record source in both directions. A change by the user writes the field. A value bound with `<-` cannot be changed by the user.
- `onChange` runs when the user changes the value of a component. A binding or another handler never fires it.
- The states `focused` and `value` of a component are readable in expressions, and `disabled` can be set and bound. `runtime.change(id, value)` and `runtime.activate(id)` do from code what a tap and the keyboard do.
- `onTap` also fires when a component that can take focus is activated with Enter or Space. `connectInteraction` handles focus and the keyboard.
- `defineComponent()` adds a component type from outside the library, with its description and its drawing. `getComponentDescriptor()` reads a description.
- A type of component that is not known draws a dashed placeholder with its name, and is reported as before.

### Changed

- The `Widget` block is now called `Component`. Both names are read, so existing documents render as before. The types follow the new name (`Component`, `ComponentType`, `RollingNumberComponent`, `TickScaleComponent`, `RulerComponent`) and `viewer.setComponentValue()` replaces `viewer.setWidgetValue()`. `RenderInput` takes `components`. The old names remain as aliases for now.
- The diagnostic `unsupported-widget-type` is now `unsupported-component-type`.
- `sflToRenderInput()` returns the components as `components` and no longer as `widgets`. `BoundProperty.ownerKind` is `'Component'` for a `Component` and for a `Widget` block, and a binding is keyed `Component.value`.
- `Component` now also covers components that are not one of the three built-in types. Narrow with `isGenericComponent()` before reading `parameters` or `style`.
- The component types are listed in one place, `COMPONENT_TYPES`, as the shape and chart types are, and no longer repeated in the code that reads them.

### Fixed

- The number next to the knob of a ruler fades to the `peak` color and no longer always to white, so it stays readable on a light canvas.

The DOM contract is unchanged. The attributes `data-sf-widget*`, the role `widget` and the scene ids keep their names.

## [0.4.0] - 2026-10-17

### Added

- `applyQuickDuplicateChange(source, event, { shapeId, linkId, gap? })` in `stickyflow/interaction` carries out a quick duplicate. It adds a copy of the object with its look, beyond the edge that was dragged, and a link to it that looks like the other links of the document. For an isometric object it adds a copy and a connection between the touching faces. The ids come from the caller, and `gap` is 200 for a shape and 40 for an isometric object by default.

## [0.3.0] - 2026-10-17

### Added

- Arrow keys move the selected objects by 1 unit, Shift by 10, through the existing `moveChange` event.
- The color picker has an alpha slider for solid colors and for every gradient stop. A transparent color is written as `rgba(r, g, b, a)`, and `rgba()` and `#rrggbbaa` fills are read back into the picker.
- `fontSize` on the rollingNumber widget sets the digit size. Without it the size still follows the box.
- `peak` on the ruler widget sets the color the ticks at the knob fade to. The default stays white.
- `pointSize`, `pointOpacity`, `pointStrokeWidth` and `pointStrokeColor` on scatter charts set the dots. The dots used to be fixed at a radius of 4.
- `scale`, `hexGap`, `hexStrokeWidth`, `hexStrokeColor` and `hexMinOpacity` on hexbin charts. A `scale` ramp colors every cell by its density. Without these a hexbin chart is drawn as before.
- `radarStrokeWidth`, `radarPointSize` and `radarSpokes` on radar and radial charts set the outline, the corner dots and the spokes, and `radarTension` sets how round a radial chart curves. A width or size of 0 leaves the outline or the dots out. Without them both charts are drawn as before.
- `ringTrackOpacity`, `ringCap`, `ringStartAngle` and `ringSweep` on radialBar charts set the track, the ends of the rings and where the rings start and how far they go around. A `ringSweep` below 360 gives a gauge. Without them the chart is drawn as before.
- `pieStartAngle`, `pieStroke` and `pieStrokeWidth` now also work on polarArea charts, and `polarTrackOpacity`, `polarTrackStroke`, `polarTrackStrokeWidth` and `polarTrackDash` style the track behind the wedges, `polarRings` draws reference rings at the axis ticks, `polarNameSize`, `polarValueSize` and `polarValueFirst` set the size and order of the label in a wedge, and `polarOutsideLabels` puts the label of a wedge that is too small for it next to the wedge.
- `boxWhiskerWidth`, `boxWhiskerColor` (a color or `series`), `boxMedianWidth`, `boxMedianColor`, `boxCapSize`, `boxPointSize`, `boxPointOpacity` and `boxJitter` on boxplot charts set the whiskers, the median line, the caps and the sample dots. Without them the chart is drawn as before. Without them the chart is drawn as before.
- `cellShape` (`square` or `circle`), `cellStrokeColor`, `cellStrokeWidth`, `cellValueSize` and `cellValueColor` on heatmap charts set the cells and the numbers in them. Without them the chart is drawn as before.
- `tileStrokeColor`, `tileStrokeWidth`, `tileLabelSize`, `tileValueSize`, `tileTextColor`, `tileLabelPadding`, `showTileValues` and `headerHeight` on treemap charts set the tile border, the text in the tiles and the group headers. Without them the chart is drawn as before.
- `mekkoColumnGap`, `mekkoSegmentGap`, `mekkoRoundAll`, `mekkoSegmentStrokeColor`, `mekkoSegmentStrokeWidth`, `mekkoLabelSize`, `mekkoValueSize`, `mekkoTextColor`, `showMekkoTotals` and `mekkoValueFormat` (`value` or `percent`) on mekko charts set the gaps, the segment border, the text in the segments and the totals above the columns. A segment name that is wider than its column ends with an ellipsis. Without these a mekko chart is drawn as before.
- `sankeyNodeWidth`, `sankeyNodeGap`, `sankeyLinkOpacity`, `sankeyLinkCurve` and `sankeyLabelSize` on sankey charts set the width of the nodes, the space between them, the opacity and the curve of the links and the size of the labels. Without them the chart is drawn as before.
- `customConnectorWidth`, `customConnectorOpacity`, `customConnectorDash`, `customBeforeFill`, `customBeforeStroke`, `customBeforeStrokeWidth`, `customLabelSize` and `customLabelColor` on custom charts with `connectPoints` set the connectors, the hollow first point and the row labels. Without them the chart is drawn as before.

### Changed

- The quick duplicate buttons are smaller: the radius is 6 px instead of 8 and the plus is smaller to match.
- The tabs of the color picker follow the segmented style of the panels, and its accent color is neutral instead of purple. The checkerboard behind the alpha slider follows the theme.

### Fixed

- A treemap tile name that is wider than its tile ends with an ellipsis, and a number that does not fit is left out. Before, the text ran over the edge of the tile.
- Panning and zooming follow the pointer exactly when the canvas and the visible area have different aspect ratios. Panning used to lag behind the cursor, and the zoom anchor drifted.
- A large `pieCornerRadius` no longer folds the corners of small slices and wedges into loops. The radius is limited to what the slice can hold.
- A `tickScale` widget can be clicked, selected and moved on the canvas. Its shader surface no longer ignores the pointer.

## [0.2.0] - 2026-10-15

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
[0.7.0]: https://github.com/D-Queck/stickyflow.js/releases/tag/v0.7.0
[0.1.0]: https://github.com/D-Queck/stickyflow.js/releases/tag/v0.1.0
