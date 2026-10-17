# Architecture

Stickyflow rests on one idea. A visual artifact is a plain text document written in SFL. People, language models and tools all read and write that same text. Everything else in the project either turns the text into a picture, turns a gesture on the picture back into an edit of the text, or measures how well that works.

The diagram of this page is [Architecure.sfl](./Architecure.sfl). It is written in SFL itself and renders with the package it describes.

## One document, edited from both sides

An SFL document is block structured text. Comments, order and formatting belong to the author and survive every change. When someone drags a shape on the canvas, nothing is stored apart from the document. The package turns the gesture into a small patch of the text, and the picture is drawn again from the new text. A language model edits the same text. The canvas and the model never need to agree on anything except the document.

## The package

stickyflow.js is the only place where SFL is understood. It has six layers, numbered from the bottom, and every layer may only use the ones below it.

L0, the model in `src/model`, holds the framework neutral types for charts, shapes, paths, shaders, widgets and isometric objects, and the geometry that needs no other layer.

L1, the language in `src/sflLanguage`, reads text. It has a lexer, a parser that produces a syntax tree, and a canonical emitter that writes the tree back as text. It knows the grammar and nothing about meaning.

L2, the semantic layer in `src/sflSemantic`, gives the syntax tree its meaning. It resolves styles and layouts, applies defaults and produces the canvas state, a list of canvas objects such as shapes, containers, links, charts and paths.

L3, the render input in `src/renderInput`, is the contract between the document and the renderer. It decodes colors, shadows and styles and hands the renderer plain data.

L4, the render scene in `src/renderScene`, builds a deterministic scene from the render input. Every visible thing becomes a scene node with an identity and an order. The chart renderers live here, one per chart type, as do the shapes, links and text layout.

L5, the SVG layer in `src/svg`, serializes the scene. It also defines the DOM contract, the stable ids and attributes that the runtime relies on to find a shape or a chart value again.

The rule is checked by the tests in `test/architecture`. A lower layer never imports a higher one, collection folders named shared, utils or helpers are not allowed, and the public entries stay stable.

## From text to picture

`render(sfl)` runs the whole path. The text is parsed, given its meaning, turned into render input, built into a scene and written as SVG. The result carries the SVG, its size and a list of diagnostics, and the scene as well for callers that want to look inside. The path is pure. The same text gives the same SVG, byte for byte, which is what the golden tests rely on. A small cache keeps the latest scenes by source text.

Diagnostics are data. An unknown property or a missing reference never stops the drawing, it adds an entry to the list.

## The runtime

The runtime is everything that needs a browser. It is split into tiers, and a tier may only use the tiers below it.

The dom tier finds objects in the drawn SVG and paints the overlays for selection, handles and guides. The eventing tier is a small emitter. The viewer mounts the SVG in a container, keeps the camera, redraws when the source changes and exports images. The interaction tier binds gestures such as moving, resizing, drawing links, dragging chart values and picking colors, and turns each of them into a patch of the text. The web component tier wraps the viewer as a tag that needs no code of its own.

Shaders and widgets are drawn by the viewer on top of the scene, which is why they work live while the core path stays pure.

## Data and events

The binding folder lets a document react. A document can declare data sources and bind properties to expressions over them, and it can declare handlers for presses, drags and ticks. The binding runtime evaluates the expressions and applies the values to the drawn elements. The adapters folder converts a document to a JSON shape that other tools import.

## Entry points

The package has four entries, and each one is a tier of the architecture.

`stickyflow` holds the language, the semantic layer and `render`. `stickyflow/viewer` holds the viewer. `stickyflow/interaction` holds the editing. `stickyflow/web-component` holds the tag `stickyflow-diagram`.

A consumer imports the entry it needs and nothing else. A page that only shows a diagram never loads the editing code.

## Consumers

Several repositories use the package. StickyFlow-Web installs it from npm, the others link the local folder while they are developed.

StickyFlow-Web is the website. It contains the documentation, the language specification and the Playground, an editor built on the viewer and the interaction tier with example charts, style panels and templates.

sfl-chat and sfl-vue are the smallest complete round trip. A model writes SFL, the diagram renders, the user changes it by hand and the next turn starts from the changed text. One uses the viewer, the other the web component.

vscode-sfl-preview shows a live preview next to the text and copies the built package into its own media folder. obsidian-sfl draws diagram blocks in notes.

## Tools that speak SFL on their own

Three projects read and write SFL without the package. stickyflow-atlas is the studio. It has its own canvas, a React frontend, and a FastAPI backend with a database that stores boards and talks to language models. vscode-sfl gives the editor language support, with highlighting, diagnostics, completion and formatting. latex-sfl lets a typeset document carry SFL inline and draws it while the document is built.

They share the language and its specification with the package, not its code. The specification is what keeps them in step.

## Research

SFL-visual-intelligence and stickyflow-visual-planner test two questions without assuming the answer. Can the decision of what to visualize and how be written down explicitly enough to evaluate, and is SFL a useful common form for it. They read and write SFL documents and do not depend on the package internals.

## Changing the architecture

The working rules are in [AGENTS.md](../AGENTS.md). A new placeable object goes through every layer in order and is described step by step in [ADDING_CANVAS_OBJECT.md](./ADDING_CANVAS_OBJECT.md). Changes of the public behavior belong in [CHANGELOG.md](../CHANGELOG.md).
