import { describe, expect, it } from 'vitest';
import { CHART_TYPES, render } from '../src/index';

// An unrecognised Chart `type:` used to fall through to the generic series
// path and come out as a scatter plot — no error, no diagnostic, just a wrong
// picture that looked deliberate. This package now implements every chart
// type stickyflow-atlas draws, so there's no real type left to provoke this
// with - the tests below use a made-up one instead, purely to pin the
// fallback/diagnostic behavior itself. It still renders (a rough plot beats
// a blank box), but it now says so.

const chart = (type: string) => `sfl 1.2
Model M {
  Chart c {
    type: ${type}
    categories: ["A", "B", "C"]

    Axis x { min: 0; max: 3; step: 1 }
    Axis y { min: 0; max: 10; step: 5 }

    Series s { color: "#7c3aed"; values: [3, 7, 5] }

    layout {
      position: 0, 0
      size: 300, 200
    }
  }
}`;

describe('supported chart types', () => {
  it.each(CHART_TYPES)('renders "%s" without a diagnostic', type => {
    const { diagnostics } = render(chart(type));
    expect(diagnostics.filter(d => d.code === 'unsupported-chart-type')).toEqual([]);
  });

  it('exposes exactly the types the renderer actually branches on', () => {
    expect([...CHART_TYPES].sort()).toEqual([
      'bar',
      'boxplot',
      'custom',
      'field',
      'grid',
      'heatmap',
      'hexbin',
      'line',
      'matrix',
      'mekko',
      'pie',
      'radar',
      'radial',
      'sankey',
      'scatter',
      'treemap',
    ]);
  });
});

describe('unsupported chart types', () => {
  // No real Atlas type is left unsupported - these use made-up type names
  // purely to exercise the unrecognised-type fallback/diagnostic itself.
  const madeUp = ['pyramid', 'gantt'];

  it.each(madeUp)('reports a warning for "%s"', type => {
    const { diagnostics } = render(chart(type));
    const warning = diagnostics.find(d => d.code === 'unsupported-chart-type');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
    expect(warning!.entityId).toBe('c');
    expect(warning!.message).toContain(type);
  });

  it('names the supported alternatives in the message', () => {
    const { diagnostics } = render(chart('pyramid'));
    const warning = diagnostics.find(d => d.code === 'unsupported-chart-type')!;
    for (const supported of CHART_TYPES) expect(warning.message).toContain(supported);
  });

  it('still renders something rather than dropping the chart', () => {
    const { scene } = render(chart('pyramid'));
    expect(scene.nodes.filter(node => node.sfRole === 'chart').length).toBeGreaterThan(0);
  });

  it('reports one warning per offending chart, not one per board', () => {
    const two = `sfl 1.2
Model M {
  Chart a {
    type: pyramid
    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 1; step: 1 }
    layout { position: 0, 0; size: 100, 100 }
  }
  Chart b {
    type: gantt
    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 1; step: 1 }
    layout { position: 150, 0; size: 100, 100 }
  }
}`;
    const ids = render(two)
      .diagnostics.filter(d => d.code === 'unsupported-chart-type')
      .map(d => d.entityId);
    expect(ids).toEqual(['a', 'b']);
  });
});
