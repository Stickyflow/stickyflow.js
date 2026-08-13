import { describe, expect, it } from 'vitest';
import { sflToCanvasState, sflToRenderInput, renderCanvas } from '../src/index';

// Container `flow`/`gap` (SFL 1.4, §12.1): auto-positions a Container's
// DIRECT children (Container or positioned-leaf kinds) along one axis — the
// generalized, minimal version of what buildSwimlane's lane-offset loop
// already does for lane bands specifically. Mirrors stickyflow-atlas's own
// sflToCanvasState.ts implementation of the same feature (Container-only,
// `flow: horizontal|vertical` + `gap`, a running cursor, child `layout.size`
// stays required/explicit, child `layout.position` is ignored/overridden).

const HORIZONTAL_SFL = `sfl 1.4

Model board {
  Container metrics {
    kind: frame
    layout {
      position: 40, 420
      size: 300, 90
      flow: horizontal
      gap: 16
    }

    Entity output {
      text: "+112%"
      layout { size: 140, 90 }
    }
    Entity scrap {
      text: "-4.1%"
      layout { size: 140, 90 }
    }
  }
}`;

const VERTICAL_SFL = `sfl 1.4

Model board {
  Container stack {
    kind: frame
    layout {
      position: 10, 20
      size: 100, 90
      flow: vertical
      gap: 10
    }

    Entity a { layout { size: 100, 50 } }
    Entity b { layout { size: 100, 30 } }
  }
}`;

const EXPLICIT_SFL = `sfl 1.4

Model board {
  Container metrics {
    kind: frame
    layout {
      position: 40, 420
      size: 300, 90
    }

    Entity output {
      text: "+112%"
      layout { position: 10, 10; size: 140, 90 }
    }
    Entity scrap {
      text: "-4.1%"
      layout { position: 160, 10; size: 140, 90 }
    }
  }
}`;

describe('Container flow/gap (SFL 1.4, §12.1)', () => {
  it('horizontal flow places direct children left-to-right, cursor advancing by size+gap', () => {
    const state = sflToCanvasState(HORIZONTAL_SFL);
    const output = state.entities.find(e => e.id === 'output');
    const scrap = state.entities.find(e => e.id === 'scrap');
    // Relative to the parent Container's own absolute origin (40, 420).
    expect(output).toMatchObject({ x: 40, y: 420, width: 140, height: 90 });
    expect(scrap).toMatchObject({ x: 40 + 140 + 16, y: 420, width: 140, height: 90 });
  });

  it('vertical flow places direct children top-to-bottom, cursor advancing by size+gap', () => {
    const state = sflToCanvasState(VERTICAL_SFL);
    const a = state.entities.find(e => e.id === 'a');
    const b = state.entities.find(e => e.id === 'b');
    expect(a).toMatchObject({ x: 10, y: 20, width: 100, height: 50 });
    expect(b).toMatchObject({ x: 10, y: 20 + 50 + 10, width: 100, height: 30 });
  });

  it('a child\'s own layout.position is ignored (overridden) when the parent has flow set', () => {
    // Same as HORIZONTAL_SFL's children but each also declares an explicit
    // (wrong, if honored) position — flow must win regardless.
    const sfl = HORIZONTAL_SFL
      .replace('layout { size: 140, 90 }\n    }\n    Entity scrap', 'layout { position: 999, 999; size: 140, 90 }\n    }\n    Entity scrap')
      .replace('layout { size: 140, 90 }\n    }\n  }\n}', 'layout { position: -50, -50; size: 140, 90 }\n    }\n  }\n}');
    const state = sflToCanvasState(sfl);
    const output = state.entities.find(e => e.id === 'output');
    const scrap = state.entities.find(e => e.id === 'scrap');
    expect(output).toMatchObject({ x: 40, y: 420 });
    expect(scrap).toMatchObject({ x: 40 + 140 + 16, y: 420 });
  });

  it('gap defaults to 0 when flow is set but gap is omitted', () => {
    const sfl = HORIZONTAL_SFL.replace('      flow: horizontal\n      gap: 16\n', '      flow: horizontal\n');
    const state = sflToCanvasState(sfl);
    const output = state.entities.find(e => e.id === 'output');
    const scrap = state.entities.find(e => e.id === 'scrap');
    expect(output).toMatchObject({ x: 40 });
    expect(scrap).toMatchObject({ x: 40 + 140 }); // no gap added
  });

  it('regression: absent flow leaves explicit positions fully untouched', () => {
    const state = sflToCanvasState(EXPLICIT_SFL);
    const output = state.entities.find(e => e.id === 'output');
    const scrap = state.entities.find(e => e.id === 'scrap');
    expect(output).toMatchObject({ x: 40 + 10, y: 420 + 10, width: 140, height: 90 });
    expect(scrap).toMatchObject({ x: 40 + 160, y: 420 + 10, width: 140, height: 90 });
  });

  it('flows through to the rendered scene (RenderInput -> RenderScene) with the same resolved coordinates', () => {
    const { scene } = renderCanvas(sflToRenderInput(HORIZONTAL_SFL));
    const outputRect = scene.nodes.find(n => n.id === 'shape-output');
    const scrapRect = scene.nodes.find(n => n.id === 'shape-scrap');
    expect(outputRect?.type === 'rect' && outputRect.x).toBe(40);
    expect(scrapRect?.type === 'rect' && scrapRect.x).toBe(40 + 140 + 16);
  });

  it('is stable across repeated parses (determinism)', () => {
    const a = sflToCanvasState(HORIZONTAL_SFL).entities.find(e => e.id === 'scrap');
    const b = sflToCanvasState(HORIZONTAL_SFL).entities.find(e => e.id === 'scrap');
    expect(a).toEqual(b);
  });
});
