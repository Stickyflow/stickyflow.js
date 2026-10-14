import { describe, expect, it } from 'vitest';
import { buildBindingGraph, createBindingRuntime, createDataSource, renderBound } from '../src/binding';
import { canonicalize, parse } from '../src/sflLanguage';

const SAMPLE = `sample {
    month: ["Jan", "Feb", "Mar"]
    revenue: [10, 20, 30]
  }`;

const doc = (series: string, options: { sample?: boolean; revenue?: string } = {}) => `sfl 1.4

DataSource sales {
  fields {
    month: string
    revenue: ${options.revenue ?? 'number'}
  }
  ${options.sample ? SAMPLE : ''}
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
  it('round-trips a top-level DataSource, fields, sample and all three operators', () => {
    const sfl = doc('values: <- sales.revenue * 2 + 1\n      label: <-> sales.month\n      onClick: -> sales.reload()', { sample: true });
    const text = canonicalize(sfl);
    expect(text).toContain('fields {');
    expect(text).toContain('sample {');
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
    expect(codes(doc('values: [1, 2, 3]'))).toEqual(['no-sample-data']);
    expect(buildBindingGraph(parse(doc('values: [1, 2, 3]'))).bindings.map(binding => binding.property)).toEqual(['categories']);
  });
});

describe('binding type check', () => {
  it('accepts a matching contract and warns about missing sample data', () => {
    expect(codes(BOUND)).toEqual(['no-sample-data', 'no-sample-data']);
    expect(codes(doc('values: <- sales.revenue', { sample: true }))).toEqual([]);
  });

  it('rejects a number column bound to a string list', () => {
    expect(codes(doc('values: <- sales.month', { sample: true }))).toEqual(['type-mismatch']);
  });

  it('rejects unknown fields, sources and properties', () => {
    expect(codes(doc('values: <- sales.profit', { sample: true }))).toEqual(['unknown-reference']);
    expect(codes(doc('values: <- cost.revenue', { sample: true }))).toEqual(['unknown-reference']);
    expect(codes(doc('colour: <- sales.month', { sample: true }))).toEqual(['unknown-bound-property']);
  });

  it('rejects functions beyond when()', () => {
    expect(codes(doc('values: <- round(sales.revenue)', { sample: true }))).toEqual(['unknown-function']);
  });

  it('warns that two-way and event bindings are parsed but not executed', () => {
    expect(codes(doc('label: <-> sales.month', { sample: true }))).toEqual(['binding-operator-unsupported']);
  });

  it('accepts int, float and bool next to number and boolean, and rejects unknown field types', () => {
    expect(codes(doc('values: <- sales.revenue', { sample: true, revenue: 'int' }))).toEqual([]);
    expect(codes(doc('values: <- sales.revenue', { sample: true, revenue: 'float' }))).toEqual([]);
    expect(codes(doc('values: <- sales.revenue', { sample: true, revenue: 'decimal' }))).toContain('unknown-field-type');
  });

  it('finds a DataSource declared inside the Model block as well', () => {
    const nested = `sfl 1.4

Model board {
  DataSource sales {
    fields {
      month: string
      revenue: number
    }
    sample {
      month: ["Jan"]
      revenue: [5]
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

  it('shows the sample data until a real source is registered, then follows the source', () => {
    const runtime = createBindingRuntime(doc('values: <- sales.revenue', { sample: true }));
    runtime.flush();
    expect(seriesValues(runtime)).toEqual([10, 20, 30]);

    const sales = createDataSource(rows([7, 8, 9]));
    const unregister = runtime.registerSource('sales', sales);
    runtime.flush();
    expect(seriesValues(runtime)).toEqual([7, 8, 9]);

    unregister();
    runtime.flush();
    sales.set(rows([1, 1, 1]));
    expect(seriesValues(runtime)).toEqual([7, 8, 9]);
  });

  it('renderBound draws the sample data without a runtime', () => {
    const withSample = renderBound(doc('values: <- sales.revenue', { sample: true }));
    const without = renderBound(BOUND);
    expect(withSample.svg).toContain('sf-chart-bar-revenueChart-revenue-2');
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

  it('warns once when a bound DataSource has neither a source nor sample data', () => {
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
