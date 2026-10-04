# Adding a Canvas Object

Use this checklist when adding a new kind of placeable diagram artifact. In current code, use **canvas object** as
the umbrella term. Use **shape** only for the concrete `Shape` artifact. Do not introduce new `Entity` names; that
word is reserved for legacy SFL compatibility.

The required dependency direction is:

`L0 Model -> L1 SFL Language -> L2 SFL Semantic -> L3 RenderInput -> L4 Render Scene -> L5 SVG`

Complete one layer before moving to the next. A new artifact is finished only when its public pipeline test and
documentation are complete.

## Before implementation

- [ ] Choose one precise artifact name and use it consistently in SFL, TypeScript, scene IDs, tests, and docs.
- [ ] Decide whether this is genuinely a new canvas-object kind or only a new `Shape.shapeType`.
- [ ] Write down its authored SFL contract: block kind, properties, child blocks, and defaults.
- [ ] Decide which values are semantic data and which values only control rendering.
- [ ] Confirm that links and interaction are part of this change; otherwise leave them for separate features.

## L0 - Model (`src/model`)

- [ ] Add the framework-neutral renderer input type for the artifact.
- [ ] Put reusable geometry calculations in the model when they do not depend on Scene or SVG.
- [ ] Reuse existing `Point`, `Bounds`, paint, shadow, and geometry contracts where they fit.
- [ ] Export the model type from its domain index.
- [ ] Add unit tests for non-trivial geometry, clamping, and boundary cases.

Do not import SFL, Render Scene, SVG, DOM, or runtime code into Model.

## L1 - SFL Language (`src/sflLanguage`)

- [ ] Register the authored block kind in the AST/parser vocabulary.
- [ ] Confirm that parsing produces syntax only; do not resolve defaults or diagram meaning here.
- [ ] Confirm that canonical emission preserves the block and is idempotent.
- [ ] Add a parse-and-emit test using the smallest valid example.

## L2 - SFL Semantic (`src/sflSemantic`)

- [ ] Add the artifact-specific semantic payload and specialized canvas-object type.
- [ ] Add a type guard named `is<Artifact>Object` when consumers need narrowing.
- [ ] Add the block kind to canvas-object classification.
- [ ] Add a focused reader for artifact properties.
- [ ] Add a focused resolver that combines the shared base with the artifact payload.
- [ ] Delegate to that resolver from the canvas-object processing switch.
- [ ] Export the semantic type and guard through the semantic public surface.
- [ ] Add a semantic test for resolved values, defaults, and the type guard.

Keep shared canvas-object fields in the base resolver. Keep artifact-only fields in the artifact reader and resolver.

## L3 - RenderInput (`src/renderInput`)

- [ ] Add the renderer-ready artifact collection to `RenderInput` if it needs its own rendering workflow.
- [ ] Add one semantic-to-model adapter for the artifact.
- [ ] Decode authored presentation values here; do not make Render Scene understand SFL values.
- [ ] Add the artifact to canvas-object collection.
- [ ] Add an adapter test proving that semantic values and defaults reach RenderInput.

Choose one owner for every default. Prefer the adapter for presentation defaults and Render Scene only for
defensive fallbacks required by programmatically constructed `RenderInput`.

## L4 - Render Scene (`src/renderScene`)

- [ ] Add a `SceneRole` only when the artifact needs its own DOM-contract identity.
- [ ] Implement an artifact builder that returns existing abstract scene nodes.
- [ ] Keep geometry calculations out of the scene builder when they can remain pure Model operations.
- [ ] Add a collection builder that applies semantic tagging for the artifact owner.
- [ ] Register that collection builder in the small scene orchestration function.
- [ ] Give every generated node a deterministic ID and order.
- [ ] Include all visual extents in bounds: strokes, labels, shadows, and decorations.
- [ ] Add focused scene tests for node types, geometry, paint, order, identity, and optional visuals.

Do not put artifact-specific construction back into the central scene orchestrator.

## L5 - SVG (`src/svg`)

- [ ] Verify that the artifact serializes through existing Scene nodes.
- [ ] Add SVG code only if the artifact requires a genuinely new generic Scene primitive.
- [ ] Preserve escaping, deterministic IDs, and the versioned DOM contract.

Most new artifacts should require **no L5 implementation change**. If SVG needs to know the artifact kind, first
check whether the abstraction belongs in Render Scene instead.

## Public API and optional runtime support

- [ ] Export intentionally public model and semantic types from `src/index.ts` without disturbing its L0-L5 order.
- [ ] Rebuild `dist` and inspect the actual ESM and declaration exports.
- [ ] Update `stickyflow/viewer` or `stickyflow/interaction` only when the feature explicitly includes interaction.
- [ ] If insertion/removal is supported, extend the Canvas Object patch contracts without restoring `Entity` names.
- [ ] Update downstream consumers after a public rename; do not hide current naming behind new legacy aliases.

## Completion tests

- [ ] Add one public pipeline test: SFL text -> semantic state -> RenderInput -> Render Scene -> SVG.
- [ ] Assert diagnostics are empty for the valid example.
- [ ] Assert stable scene IDs and at least one meaningful SVG result.
- [ ] Run focused tests while implementing.
- [ ] Run `npm run lint`, `npm run typecheck`, and `git diff --check`.
- [ ] Run `npm run ci`; report unrelated existing failures explicitly instead of silently ignoring them.

## Documentation and review

- [ ] Add or update the artifact page in the StickyFlow-Web stickyflow.js library docs.
- [ ] Document only behavior that is implemented now; list future interaction, icon, or link behavior separately.
- [ ] Run the Web docs export check and production build.
- [ ] Review the final diff for duplicate defaults, oversized orchestrators, optional payload fields, and forgotten
      registrations.
- [ ] Keep structural refactors in separate commits from new artifact behavior where practical.

## Definition of done

The artifact is done when a public `render(source)` call produces its expected SVG, every layer can be tested in
isolation, no lower layer imports a higher layer, the public API and docs use current Canvas Object terminology, and
no unrelated subsystem needed artifact-specific knowledge.
