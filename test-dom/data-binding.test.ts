import { describe, expect, it } from 'vitest';
import { createBindingRuntime, createDataSource } from '../src/binding';
import { createViewer } from '../src/runtime/viewer';

const sfl = `sfl 1.4

Model board {
  DataSource sales {
    fields {
      month: string
      revenue: number
    }
  }

  Chart revenueChart {
    type: bar
    stacked: none
    category <- sales.month
    value <- sales.revenue
    data {
      Axis y { min: 0; max: 100; step: 25 }
    }
    layout {
      position: 0, 0
      size: 320, 200
    }
  }
}
`;

const rows = (revenue: number[]) => revenue.map((value, index) => ({ month: `M${index}`, revenue: value }));

describe('a viewer attached to a binding runtime', () => {
  it('patches the existing SVG in place when the data changes', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const runtime = createBindingRuntime(sfl);
    const viewer = createViewer({ container, source: sfl, interactive: false });
    const svgBefore = viewer.svg;

    const sales = createDataSource(rows([20, 40, 60]));
    runtime.registerSource('sales', sales);
    runtime.attach(viewer);
    const bar = () => viewer.svg.querySelector('[id$="chart-bar-revenueChart-value-2"]')?.getAttribute('d');
    const before = bar();
    expect(before).toBeTruthy();

    sales.set(rows([20, 40, 95]));
    runtime.flush();

    expect(viewer.svg).toBe(svgBefore);
    expect(bar()).not.toBe(before);
    viewer.destroy();
  });
});
