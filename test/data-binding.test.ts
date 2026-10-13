import { describe, expect, it } from 'vitest';
import { buildBindingGraph, createBindingRuntime, createDataSource } from '../src/binding';
import { canonicalize, parse } from '../src/sflLanguage';

const chartSfl = (bindings: string) => `sfl 1.4

Model board {
  DataSource sales {
    fields {
      month: string
      revenue: number
    }
  }

  Chart revenueChart {
    type: bar
    ${bindings}
    layout {
      position: 0, 0
      size: 320, 200
    }
  }
}
`;

const BOUND = chartSfl('category <- sales.month\n    value <- sales.revenue');

const rows = (revenue: number[]) => revenue.map((value, index) => ({ month: ['Jan', 'Feb', 'Mar'][index], revenue: value }));

const messages = (sfl: string) => buildBindingGraph(parse(sfl)).diagnostics.map(diagnostic => diagnostic.code);

describe('binding syntax', () => {
  it('round-trips DataSource, fields and all three operators through the canonical form', () => {
    const sfl = chartSfl('category <- sales.month\n    value <- sales.revenue * 2 + 1\n    text <-> sales.month\n    onClick -> sales.reload()');
    const text = canonicalize(sfl);
    expect(text).toContain('fields {');
    expect(text).toContain('value <- sales.revenue * 2 + 1');
    expect(text).toContain('text <-> sales.month');
    expect(text).toContain('onClick -> sales.reload()');
    expect(canonicalize(text)).toBe(text);
  });

  it('keeps negative numbers and the minus operator apart', () => {
    const text = canonicalize(chartSfl('value <- sales.revenue - 5\n    text <- when(sales.revenue > -3, "a", "b")'));
    expect(text).toContain('value <- sales.revenue - 5');
    expect(text).toContain('when(sales.revenue > -3, "a", "b")');
  });
});

describe('binding type check', () => {
  it('accepts a matching contract', () => {
    expect(messages(BOUND)).toEqual([]);
  });

  it('rejects a number column bound to a string list', () => {
    expect(messages(chartSfl('category <- sales.revenue'))).toEqual(['type-mismatch']);
  });

  it('rejects unknown fields, sources and properties', () => {
    expect(messages(chartSfl('value <- sales.profit'))).toEqual(['unknown-reference']);
    expect(messages(chartSfl('value <- cost.revenue'))).toEqual(['unknown-reference']);
    expect(messages(chartSfl('colour <- sales.month'))).toEqual(['unknown-bound-property']);
  });

  it('rejects functions beyond when()', () => {
    expect(messages(chartSfl('value <- round(sales.revenue)'))).toEqual(['unknown-function']);
  });

  it('warns that two-way and event bindings are parsed but not executed', () => {
    expect(messages(chartSfl('text <-> sales.month'))).toEqual(['binding-operator-unsupported']);
  });
});

describe('binding runtime', () => {
  it('changing the source updates the bound chart without rebuilding the SFL', () => {
    const runtime = createBindingRuntime(BOUND);
    const sales = createDataSource(rows([10, 20, 30]));
    runtime.registerSource('sales', sales);

    const first = runtime.flush();
    const chart = runtime.input.charts?.find(candidate => candidate.id === 'revenueChart');
    expect(chart?.series[0].values).toEqual([10, 20, 30]);
    expect((chart?.config as { categories?: string[] }).categories).toEqual(['Jan', 'Feb', 'Mar']);
    expect(first?.svg).toContain('sf-chart-bar-revenueChart-value-2');

    const renders: string[] = [];
    runtime.onRender(result => renders.push(result.svg));
    sales.set(rows([10, 20, 90]));
    const second = runtime.flush();

    expect(chart?.series[0].values).toEqual([10, 20, 90]);
    expect(runtime.input.charts?.[0]).toBe(chart);
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

  it('evaluates expressions over columns and scalars', () => {
    const sfl = chartSfl('category <- sales.month\n    value <- sales.revenue * 2 - 1\n    text <- "Revenue " + "x2"');
    const runtime = createBindingRuntime(sfl);
    runtime.registerSource('sales', createDataSource(rows([5, 6, 7])));
    runtime.flush();
    const chart = runtime.input.charts?.[0];
    expect(chart?.series[0].values).toEqual([9, 11, 13]);
    expect(chart?.title).toBe('Revenue x2');
  });

  it('binds scalar record sources and picks a branch with when()', () => {
    const sfl = `sfl 1.4

Model board {
  DataSource machine {
    mode: record
    fields {
      temp: number
    }
  }

  Shape state {
    type: rectangle
    text <- when(machine.temp > 80, "warning", "normal")
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
    expect(runtime.input.charts?.[0].series[0].values).toEqual([1, 2, 3]);
    expect(runtime.diagnostics.map(diagnostic => diagnostic.code)).toContain('data-type-mismatch');
  });

  it('refuses a source that is not declared in the SFL', () => {
    const runtime = createBindingRuntime(BOUND);
    expect(() => runtime.registerSource('costs', createDataSource([]))).toThrow(/No DataSource 'costs'/);
  });
});
