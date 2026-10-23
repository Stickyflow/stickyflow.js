import { describe, expect, it } from 'vitest';
import { buildBindingGraph, createBindingRuntime, createDataSource, parse } from '../src';

const source = `sfl 1.5

DataSource glow {
  mode: record
  fields {
    active: string
  }
}

Shader CellGlow {
  program: reactivePanel
  emission: <- when(glow.active == self.id, 0.45, 0)
}

Style Cell {
  shape: rounded_rectangle
  shader: CellGlow
}

Model grid {
  Shape a : Cell {
    onTap: glow.active <- self.id
    layout { position: 0, 0; size: 80, 80 }
  }
  Shape b : Cell {
    onTap: glow.active <- self.id
    layout { position: 100, 0; size: 80, 80 }
  }
}
`;

describe('self.id bindings', () => {
  it('accepts self.id in shader bindings and element handlers', () => {
    expect(buildBindingGraph(parse(source)).diagnostics).toEqual([]);
  });

  it('evaluates a shared shader separately for every owner and writes the tapped id', () => {
    const runtime = createBindingRuntime(source);
    const glow = createDataSource({ active: 'a' });
    const parameters = new Map<string, number>();
    runtime.registerSource('glow', glow);
    runtime.attach({
      update: () => undefined,
      setShaderParameters(owner, values) {
        parameters.set(owner, values.emission);
      },
    });

    expect(Object.fromEntries(parameters)).toEqual({ a: 0.45, b: 0 });

    runtime.release('b', true);
    runtime.flush();

    expect(glow.get()).toEqual({ active: 'b' });
    expect(Object.fromEntries(parameters)).toEqual({ a: 0, b: 0.45 });
  });
});
