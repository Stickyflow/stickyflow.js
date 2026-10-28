import { defineStickyflowDiagram, type StickyflowDiagram } from '../src/runtime/webComponent';

defineStickyflowDiagram();

const query = new URLSearchParams(location.search);
const sphere = Number(query.get('sphere') ?? 0);
const round = query.get('round') === '1';

const SFL = `sfl 1.5

Style tpl_canvas { fill: "#141414" }

Shader Dots {
  program: glassDots
  sphere: ${sphere}
  round: ${round ? 1 : 0}
}

Style Face {
  shape: ${round ? 'circle' : 'rounded_rectangle'}
  cornerRadius: 24
  shader: Dots
}

Model poster {
  Shape art : Face { layout { position: 20, 20; size: 440, 500 } }
}
`;

(document.getElementById('ball') as StickyflowDiagram).source = SFL;
