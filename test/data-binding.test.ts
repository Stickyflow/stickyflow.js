import { describe, expect, it } from 'vitest';
import { buildBindingGraph, createBindingRuntime, createDataSource, renderBound } from '../src/binding';
import { canonicalize, parse } from '../src/sflLanguage';

const doc = (series: string, options: { revenue?: string } = {}) => `sfl 1.4

DataSource sales {
  fields {
    month: string
    revenue: ${options.revenue ?? 'number'}
  }
}

Model board {
  Chart revenueChart {
    type: bar
    stacked: none
    data {
      categories: <- sales.month
      revenue { label: "Revenue"; ${series} }
    }
    layout {
      position: 0, 0
      size: 320, 200
    }
  }
}
`;

const BOUND = doc('values: <- sales.revenue');

const rows = (revenue: number[]) => revenue.map((value, index) => ({ month: ['Jan', 'Feb', 'Mar'][index], revenue: value }));

const codes = (sfl: string) => buildBindingGraph(parse(sfl)).diagnostics.map(diagnostic => diagnostic.code);

const seriesValues = (runtime: ReturnType<typeof createBindingRuntime>) =>
  runtime.input.charts?.find(chart => chart.id === 'revenueChart')?.series.find(series => series.id === 'revenue')?.values;

describe('binding syntax', () => {
  it('round-trips a top-level DataSource, fields and all three operators', () => {
    const sfl = doc('values: <- sales.revenue * 2 + 1\n      label: <-> sales.month\n      onClick: -> sales.reload()');
    const text = canonicalize(sfl);
    expect(text).toContain('fields {');
    expect(text).toContain('values: <- sales.revenue * 2 + 1');
    expect(text).toContain('label: <-> sales.month');
    expect(text).toContain('onClick: -> sales.reload()');
    expect(canonicalize(text)).toBe(text);
  });

  it('keeps negative numbers and the minus operator apart', () => {
    const text = canonicalize(doc('values: <- sales.revenue - 5\n      label: <- when(sales.revenue > -3, "a", "b")'));
    expect(text).toContain('values: <- sales.revenue - 5');
    expect(text).toContain('when(sales.revenue > -3, "a", "b")');
  });

  it('still reads a plain colon as a literal, not a binding', () => {
    expect(codes(doc('values: [1, 2, 3]'))).toEqual([]);
    expect(buildBindingGraph(parse(doc('values: [1, 2, 3]'))).bindings.map(binding => binding.property)).toEqual(['categories']);
  });
});

describe('binding type check', () => {
  it('accepts a matching contract', () => {
    expect(codes(BOUND)).toEqual([]);
    expect(codes(doc('values: <- sales.revenue'))).toEqual([]);
  });

  it('rejects a number column bound to a string list', () => {
    expect(codes(doc('values: <- sales.month'))).toEqual(['type-mismatch']);
  });

  it('rejects unknown fields, sources and properties', () => {
    expect(codes(doc('values: <- sales.profit'))).toEqual(['unknown-reference']);
    expect(codes(doc('values: <- cost.revenue'))).toEqual(['unknown-reference']);
    expect(codes(doc('colour: <- sales.month'))).toEqual(['unknown-bound-property']);
  });

  it('rejects functions beyond when()', () => {
    expect(codes(doc('values: <- round(sales.revenue)'))).toEqual(['unknown-function']);
  });

  it('warns that two-way and event bindings are parsed but not executed', () => {
    expect(codes(doc('label: <-> sales.month'))).toEqual(['binding-operator-unsupported']);
  });

  it('accepts int, float and bool next to number and boolean, and rejects unknown field types', () => {
    expect(codes(doc('values: <- sales.revenue', { revenue: 'int' }))).toEqual([]);
    expect(codes(doc('values: <- sales.revenue', { revenue: 'float' }))).toEqual([]);
    expect(codes(doc('values: <- sales.revenue', { revenue: 'decimal' }))).toContain('unknown-field-type');
  });

  it('finds a DataSource declared inside the Model block as well', () => {
    const nested = `sfl 1.4

Model board {
  DataSource sales {
    fields {
      month: string
      revenue: number
    }
  }

  Chart revenueChart {
    type: bar
    data {
      revenue { values: <- sales.revenue }
    }
  }
}
`;
    expect(codes(nested)).toEqual([]);
  });
});

describe('binding runtime', () => {
  it('changing the source updates the bound chart without rebuilding the SFL', () => {
    const runtime = createBindingRuntime(BOUND);
    const sales = createDataSource(rows([10, 20, 30]));
    runtime.registerSource('sales', sales);

    const first = runtime.flush();
    expect(seriesValues(runtime)).toEqual([10, 20, 30]);
    const chart = runtime.input.charts?.find(candidate => candidate.id === 'revenueChart');
    expect((chart?.config as { categories?: string[] }).categories).toEqual(['Jan', 'Feb', 'Mar']);
    expect(first?.svg).toContain('sf-chart-bar-revenueChart-revenue-2');

    const renders: string[] = [];
    runtime.onRender(result => renders.push(result.svg));
    sales.set(rows([10, 20, 90]));
    const second = runtime.flush();

    expect(seriesValues(runtime)).toEqual([10, 20, 90]);
    expect(runtime.input.charts?.find(candidate => candidate.id === 'revenueChart')).toBe(chart);
    expect(renders).toHaveLength(1);
    expect(second?.svg).not.toBe(first?.svg);
  });

  it('only re-renders when a bound value actually changed', () => {
    const runtime = createBindingRuntime(BOUND);
    const sales = createDataSource(rows([1, 2, 3]));
    runtime.registerSource('sales', sales);
    runtime.flush();

    sales.set(rows([1, 2, 3]));
    expect(runtime.flush()).toBeNull();
  });

  it('keeps the last values after a source is unregistered', () => {
    const runtime = createBindingRuntime(BOUND);
    const sales = createDataSource(rows([7, 8, 9]));
    const unregister = runtime.registerSource('sales', sales);
    runtime.flush();
    expect(seriesValues(runtime)).toEqual([7, 8, 9]);

    unregister();
    sales.set(rows([1, 1, 1]));
    runtime.flush();
    expect(seriesValues(runtime)).toEqual([7, 8, 9]);
  });

  it('renderBound draws the rows it is given without a runtime', () => {
    const withData = renderBound(BOUND, { data: { sales: rows([10, 20, 30]) } });
    const without = renderBound(BOUND);
    expect(withData.svg).toContain('sf-chart-bar-revenueChart-revenue-2');
    expect(without.svg).not.toContain('sf-chart-bar-revenueChart-revenue-0');
  });

  it('evaluates expressions over columns and scalars', () => {
    const sfl = doc('values: <- sales.revenue * 2 - 1\n      label: <- "Revenue " + "x2"');
    const runtime = createBindingRuntime(sfl);
    runtime.registerSource('sales', createDataSource(rows([5, 6, 7])));
    runtime.flush();
    expect(seriesValues(runtime)).toEqual([9, 11, 13]);
    expect(runtime.input.charts?.[0].series[0].label).toBe('Revenue x2');
  });

  it('binds scalar record sources and picks a branch with when()', () => {
    const sfl = `sfl 1.4

DataSource machine {
  mode: record
  fields {
    temp: float
  }
}

Model board {
  Shape state {
    type: rectangle
    text: <- when(machine.temp > 80, "warning", "normal")
    layout {
      position: 0, 0
      size: 120, 60
    }
  }
}
`;
    const runtime = createBindingRuntime(sfl);
    const machine = createDataSource({ temp: 20 });
    runtime.registerSource('machine', machine);
    runtime.flush();
    expect(runtime.input.shapes.find(shape => shape.id === 'state')?.text).toBe('normal');

    machine.set({ temp: 95 });
    runtime.flush();
    expect(runtime.input.shapes.find(shape => shape.id === 'state')?.text).toBe('warning');
  });

  it('refuses data that breaks the contract and keeps the last good value', () => {
    const runtime = createBindingRuntime(BOUND);
    const sales = createDataSource(rows([1, 2, 3]));
    runtime.registerSource('sales', sales);
    runtime.flush();

    sales.set([{ month: 'Jan', revenue: 'oops' }]);
    expect(runtime.flush()).toBeNull();
    expect(seriesValues(runtime)).toEqual([1, 2, 3]);
    expect(runtime.diagnostics.map(diagnostic => diagnostic.code)).toContain('data-type-mismatch');
  });

  it('checks that an int field really is whole', () => {
    const runtime = createBindingRuntime(doc('values: <- sales.revenue', { revenue: 'int' }));
    const sales = createDataSource(rows([1, 2, 3]));
    runtime.registerSource('sales', sales);
    runtime.flush();

    sales.set(rows([1, 2.5, 3]));
    expect(runtime.flush()).toBeNull();
    expect(runtime.diagnostics.find(diagnostic => diagnostic.code === 'data-type-mismatch')?.message).toContain('whole number');
  });

  it('warns once when a bound DataSource has no registered source', () => {
    const runtime = createBindingRuntime(BOUND);
    runtime.attach({ update: () => undefined });
    runtime.attach({ update: () => undefined });
    expect(runtime.diagnostics.filter(diagnostic => diagnostic.code === 'source-not-registered')).toHaveLength(1);
  });

  it('refuses a source that is not declared in the SFL', () => {
    const runtime = createBindingRuntime(BOUND);
    expect(() => runtime.registerSource('costs', createDataSource([]))).toThrow(/No DataSource 'costs'/);
  });
});

describe('style bindings and text joins', () => {
  const board = `sfl 1.4

DataSource machine {
  mode: record
  fields {
    temp: float
  }
}

Model board {
  Shape light {
    type: circle
    text: <- "Temp " + machine.temp + " C"
    style {
      stroke: "#000000"
      fill: <- when(machine.temp > 80, "#ef4444", "#22c55e")
    }
    layout {
      position: 0, 0
      size: 120, 60
    }
  }
}
`;

  it('round-trips a binding inside a style block', () => {
    const text = canonicalize(board);
    expect(text).toContain('fill: <- when(machine.temp > 80, "#ef4444", "#22c55e")');
    expect(canonicalize(text)).toBe(text);
    expect(codes(board)).toEqual([]);
  });

  it('applies a bound fill and a text with a number in it', () => {
    const runtime = createBindingRuntime(board);
    const machine = createDataSource({ temp: 20.04 });
    runtime.registerSource('machine', machine);
    runtime.flush();
    const light = () => runtime.input.shapes.find(shape => shape.id === 'light');
    expect(light()?.fillColor).toBe('#22c55e');
    expect(light()?.text).toBe('Temp 20 C');

    machine.set({ temp: 91.26 });
    runtime.flush();
    expect(light()?.fillColor).toBe('#ef4444');
    expect(light()?.text).toBe('Temp 91.3 C');
  });
});

describe('live bindings', () => {
  const gauge = `sfl 1.4

DataSource car {
  mode: record
  fields {
    speed: int
  }
}

Shader Halo {
  program: halo
  progress: <- car.speed / 240
}

Style Face {
  shape: circle
  shader: Halo
}

Model dash {
  Shape dial : Face {
    layout {
      position: 0, 0
      size: 200, 200
    }
  }

  Widget display {
    type: rollingNumber
    value: <- car.speed
    layout {
      position: 40, 60
      size: 120, 80
    }
  }
}
`;

  it('sends shader parameters and widget values to the target without redrawing', () => {
    const runtime = createBindingRuntime(gauge);
    const car = createDataSource({ speed: 120 });
    runtime.registerSource('car', car);
    const shader: Array<[string, Record<string, number>]> = [];
    const widgets: Array<[string, string | number]> = [];
    let renders = 0;
    runtime.attach({
      update: () => (renders += 1),
      setShaderParameters: (id, parameters) => shader.push([id, parameters]),
      setWidgetValue: (id, value) => widgets.push([id, value]),
    });
    runtime.flush();
    expect(shader).toContainEqual(['dial', { progress: 0.5 }]);
    expect(widgets).toContainEqual(['display', 120]);

    car.set({ speed: 240 });
    runtime.flush();
    expect(shader.at(-1)).toEqual(['dial', { progress: 1 }]);
    expect(widgets.at(-1)).toEqual(['display', 240]);
    expect(renders).toBe(0);
    expect(runtime.input.shapes.find(shape => shape.id === 'dial')?.shader?.parameters.progress).toBe(1);
  });
});
