// Browser demo for the web-component tier. Run from packages/stickyflow.js:
//   npx vite demo   → open web-component.html
import { defineStickyflowDiagram, type StickyflowDiagram } from '../src/runtime/webComponent';

defineStickyflowDiagram();

const SFL = `sfl 1.2

Style Box {
  shape: rounded_rectangle
  fill: "#e0f2fe"
  stroke: "#0369a1"
}

Style Flow {
  route: orthogonal
  stroke: "#0369a1"
  markerEnd: arrow
}

Model Demo {
  text: "Demo"

  Shape a : Box {
    kind: process
    text: "Schritt A"
    layout { position: 120, 80  size: 180, 70 }
  }

  Shape b : Box {
    kind: process
    text: "Schritt B"
    layout { position: 120, 260  size: 180, 70 }
  }

  Link go : Flow {
    from: a, bottom (0.5)
    to: b, top (0.5)
    text: "next"
  }
}
`;

// Feed both diagrams via the .source property (avoids huge HTML attributes).
for (const el of document.querySelectorAll<StickyflowDiagram>('stickyflow-diagram')) {
  el.source = SFL;
}

// Wire the interactive one's viewer to a log panel.
const interactive = document.getElementById('interactive') as StickyflowDiagram;
const log = document.getElementById('log') as HTMLElement;
interactive.addEventListener('sf-render', () => {
  interactive.viewer?.on('selectionChange', e => {
    log.textContent = `selection: [${e.selection.map(o => o.id).join(', ')}]`;
  });
});
