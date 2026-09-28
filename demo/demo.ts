// Browser demo for the INTERACTION tier. Run with a TS-aware dev server, e.g.
// from packages/stickyflow.js:  npx vite demo
// (The static tier needs no browser — see the node tests.)
import { createViewer } from '../src/viewer';

function requireDemoElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Demo element #${id} is missing.`);
  }
  return element;
}

const SFL = `sfl 1.2

Style Box {
  shape: rounded_rectangle
  fill: "#e0f2fe"
  stroke: "#0369a1"
}

Style Decision {
  shape: diamond
  fill: "#fef9c3"
  stroke: "#ca8a04"
}

Style Flow {
  route: orthogonal
  stroke: "#0369a1"
  markerEnd: arrow
}

Model Checkout {
  text: "Checkout"

  Shape start : Box {
    kind: process
    text: "Warenkorb"
    layout { position: 120, 80  size: 180, 70 }
  }

  Shape check : Decision {
    kind: decision
    text: "Zahlung ok?"
    layout { position: 140, 240  size: 160, 100 }
  }

  Shape done : Box {
    kind: process
    text: "Bestellung"
    layout { position: 120, 420  size: 180, 70 }
  }

  Link a : Flow {
    from: start, bottom (0.5)
    to: check, top (0.5)
  }

  Link b : Flow {
    from: check, bottom (0.5)
    to: done, top (0.5)
    text: "ja"
  }
}
`;

const container = requireDemoElement('diagram');
const log = requireDemoElement('log');
const write = (line: string): void => {
  log.textContent = `${line}\n${log.textContent}`.split('\n').slice(0, 12).join('\n');
};

const viewer = createViewer({ container, source: SFL, interactive: true, diagramId: 'checkout' });

viewer.on('ready', () => write('ready'));
viewer.on('entityClick', e => write(`entityClick → ${e.owner.kind} "${e.owner.label}" (${e.owner.id})`));
viewer.on('linkClick', e => write(`linkClick → ${e.owner.id}`));
viewer.on('selectionChange', e => write(`selection: [${e.selection.map(o => o.id).join(', ')}]`));

requireDemoElement('fit').addEventListener('click', () => viewer.fit());
requireDemoElement('clear').addEventListener('click', () => viewer.select([]));

// Expose for poking around in the console.
(window as unknown as { viewer: typeof viewer }).viewer = viewer;
