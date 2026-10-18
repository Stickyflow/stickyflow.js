import { describe, expect, it } from 'vitest';
import { buildBindingGraph } from '../src/binding';
import { parse, render } from '../src/index';
import { applyMoveChange, applyResizeChange } from '../src/runtime/interaction/patchSfl';
import type { OwnerRef } from '../src/runtime/viewer';
import { sflToCanvasState } from '../src/sflSemantic/sflToCanvasState';

const document = (kind: string) => `sfl 1.4

DataSource car {
  mode: record
  fields {
    speed: float
  }
}

Model m {
  ${kind} scale {
    type: tickScale
    value: <- car.speed
    max: 100
    layout {
      position: 10, 20
      size: 200, 200
    }
  }
  Shape press {
    text: "x"
    onTap: car.speed <- scale.pointer
    layout {
      position: 10, 10
      size: 50, 30
    }
  }
}
`;

const owner = (id: string): OwnerRef => ({ role: 'widget', id });

describe('the Component block', () => {
  it('renders exactly like the Widget block', () => {
    expect(render(document('Component')).svg).toBe(render(document('Widget')).svg);
  });

  it('resolves to a component canvas object under either name', () => {
    for (const kind of ['Component', 'Widget']) {
      const object = sflToCanvasState(document(kind)).canvasObjects.find(candidate => candidate.id === 'scale');
      expect(object?.objectType).toBe('component');
      expect(object?.component?.type).toBe('tickScale');
    }
  });

  it('gives a component the pointer state of a scale and binds its value', () => {
    for (const kind of ['Component', 'Widget']) {
      const graph = buildBindingGraph(parse(document(kind)));
      expect(graph.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
      expect(graph.bindings.map(binding => `${binding.ownerKind}.${binding.property}`)).toContain('Component.value');
    }
  });

  it('reports a type that is not known and still reads the block', () => {
    const state = sflToCanvasState(document('Component').replace('type: tickScale', 'type: carousel'));
    expect(state.diagnostics.map(diagnostic => diagnostic.code)).toContain('unsupported-component-type');
  });
});

describe('patching a component in the source', () => {
  it('moves a Component and a Widget block by the same delta', () => {
    for (const kind of ['Component', 'Widget']) {
      const next = applyMoveChange(document(kind), { owner: owner('scale'), dx: 15, dy: -5 });
      const object = sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'scale');
      expect([object?.x, object?.y]).toEqual([25, 15]);
      expect(next).toContain(`${kind} scale {`);
    }
  });

  it('resizes a Component and a Widget block', () => {
    for (const kind of ['Component', 'Widget']) {
      const next = applyResizeChange(document(kind), {
        owner: owner('scale'),
        dx: 0,
        dy: 0,
        dWidth: 100,
        dHeight: 40,
        x: 10,
        y: 20,
        width: 300,
        height: 240,
      });
      const object = sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'scale');
      expect([object?.width, object?.height]).toEqual([300, 240]);
    }
  });
});
