import { defineStickyflowDiagram, type StickyflowDiagram } from '../src/runtime/webComponent';

defineStickyflowDiagram();

const query = new URLSearchParams(location.search);
const sphere = Number(query.get('sphere') ?? 0);

const SFL = `sfl 1.5

Style tpl_canvas { fill: "#141414" }

Shader Ball {
  program: glassDots
  sphere: ${sphere}
}

Style Face {
  shape: circle
  shader: Ball
}

Model poster {
  Shape ball : Face { layout { position: 20, 20; size: 400, 400 } }
}
`;

(document.getElementById('ball') as StickyflowDiagram).source = SFL;
