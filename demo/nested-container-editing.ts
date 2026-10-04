// Manual regression demo for stickyflow.js#9 (entity move/resize inside a
// Container away from the canvas origin writing an absolute position instead
// of one relative to its parent). Run with a TS-aware dev server, e.g.
// from packages/stickyflow.js:  npx vite demo
// then open nested-container-editing.html.

import { applyMoveChange, applyResizeChange, bindEditing } from '../src/runtime/interaction';
import { createViewer } from '../src/runtime/viewer';

function requireDemoElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Demo element #${id} is missing.`);
  }
  return element;
}

const SFL = `sfl 1.4

Style Box  { shape: rounded_rectangle; fill: "#e0f2fe"; stroke: "#0369a1" }
Style Frame { shape: rounded_rectangle; fill: "#ecfeff"; stroke: "#0891b2"; strokeWidth: 2 }
Style Flow { route: orthogonal; stroke: "#0369a1"; markerEnd: arrow }

Model M {
  text: "Nested-container move/resize"

  Entity outside : Box {
    kind: process
    text: "outside (top-level)"
    layout { position: -420, -80; size: 200, 70 }
  }

  Container box : Frame {
    kind: frame
    text: "box (parent origin away from 0,0)"
    layout { position: 120, -260; size: 420, 220 }

    Entity inside_a : Box {
      kind: process
      text: "inside_a"
      layout { position: 30, 60; size: 160, 60 }
    }
    Entity inside_b : Box {
      kind: process
      text: "inside_b"
      layout { position: 220, 60; size: 160, 60 }
    }
  }

  Link a : Flow { from: outside, right (0.5); to: box, left (0.3) }
}
`;

const container = requireDemoElement('diagram');
const sflOut = requireDemoElement('sfl');

let source = SFL;
const render = () => {
  sflOut.textContent = source;
};
render();

const viewer = createViewer({ container, source, interactive: true, diagramId: 'nested-container-demo' });
const editing = bindEditing(viewer);

editing.on('moveChange', event => {
  source = applyMoveChange(source, event);
  viewer.update({ source });
  render();
});

editing.on('resizeChange', event => {
  source = applyResizeChange(source, event);
  viewer.update({ source });
  render();
});

// Expose for poking around in the console.
(window as unknown as { viewer: typeof viewer }).viewer = viewer;
