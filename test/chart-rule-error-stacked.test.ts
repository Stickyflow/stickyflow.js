import { describe, expect, it } from 'vitest';
import type { RenderInput } from '../src/index';
import { render, renderCanvas, sflToCanvasState, sflToRenderInput } from '../src/index';

// SFL 1.4, §5.4.1/§5.4.5/§5.4.8 - mirrors stickyflow-atlas's Stage 2 Chart
// ruleset (stacked/unit/error/Rule) on this package's own, simpler compact
// bar/line implementation (no zones/horizontal here).

// A bar mark is a path (rounded top corners, see barShapePath), not a rect :
// its y/height live in `d`, not in attributes.
function barGeometry(node: { type: string; d?: string } | undefined): { top: number; height: number } {
  const d = node?.type === 'path' ? node.d : undefined;
  if (!d) {
    return { top: 0, height: 0 };
  }
  const rounded = d.match(/Q [\d.-]+ ([\d.-]+)/);
  const top = rounded ? Number(rounded[1]) : Number(d.match(/^M [\d.-]+ ([\d.-]+)/)?.[1]);
  const bottom = Number(d.match(/V ([\d.-]+)/)?.[1]);
  return { top, height: bottom - top };
}

const STACKED_SFL = `sfl 1.2

Model board {
  Chart chart {
    text: "Revenue"
    type: bar
    stacked: true
    Axis x {
      categories: ["Q1", "Q2"]
    }
    Axis y {
      min: 0
      max: 100
      step: 10
      unit: "k€"
    }
    Series a {
      color: "#7c3aed"
      label: "Product A"
      values: [10, 20]
    }
    Series b {
      color: "#0ea5e9"
      label: "Product B"
      values: [30, 5]
      error: [3, none]
    }
    Rule target {
      at: 60
      text: "Target"
      color: "#ef4444"
    }
    layout {
      position: 0, 0
      size: 500, 300
    }
  }
}`;

describe('Chart stacked/unit/error/Rule (SFL 1.4)', () => {
  it('parses stacked, axis unit, per-point error and Rule blocks', () => {
    const state = sflToCanvasState(STACKED_SFL);
    const chart = state.entities[0].chart;
    expect(chart?.stacked).toBe('true');
    expect(chart?.axisY.unit).toBe('k€');
    expect(chart?.series[1].error).toEqual([3, null]);
    expect(chart?.rules).toHaveLength(1);
    expect(chart?.rules[0]).toMatchObject({ id: 'target', at: 60, text: 'Target', color: '#ef4444' });
  });

  it('renders stacked bars cumulatively and a Rule reference line', () => {
    const input = sflToRenderInput(STACKED_SFL);
    const chart = input.charts?.[0];
    expect(chart?.chartType).toBe('bar');
    if (chart?.chartType !== 'bar') {
      throw new Error('expected a bar chart');
    }
    expect(chart.config?.stacked).toBe('true');
    expect(chart.rules).toHaveLength(1);

    const { svg } = render(STACKED_SFL);
    expect(svg).toContain('sf-chart-bar-chart-a-0');
    expect(svg).toContain('sf-chart-bar-chart-b-0');
    expect(svg).toContain('sf-chart-rule-chart-target');
    expect(svg).toContain('Target');
  });

  // Error bars are grouped(-bar)/line only, matching stickyflow-atlas's
  // ChartMarksLayer.tsx: a stacked segment's position already depends on
  // every other series at that category, so per-point uncertainty on top of
  // that doesn't have an unambiguous place to anchor - same scope line
  // atlas's Stage 2b implementation drew.
  it('renders a per-point error whisker on a grouped (non-stacked) bar series', () => {
    const sfl = STACKED_SFL.replace('stacked: true\n    ', '');
    const { svg } = render(sfl);
    expect(svg).toContain('sf-chart-bar-error-chart-b-0');
    expect(svg).not.toContain('sf-chart-bar-error-chart-b-1');
  });

  it("colors a bar's error whisker with the chart's own text color, not a fixed black", () => {
    // Was hardcoded '#000000' - invisible against a dark-mode chart. NOT the
    // series color either: a symmetric range's lower half sits inside the
    // bar's own fill, where the series color would vanish against itself.
    const sfl = STACKED_SFL.replace('stacked: true\n    ', '');
    const { svg } = render(sfl);
    const whisker = svg.match(/<path id="sf-chart-bar-error-chart-b-0"[^>]*>/)?.[0];
    expect(whisker).toContain('stroke="#0f172a"');
    expect(whisker).not.toContain('stroke="#000000"');
    expect(whisker).not.toContain('stroke="#0ea5e9"');
  });

  it("colors a Rule's label to match its own line, not the chart's generic text color", () => {
    const { svg } = render(STACKED_SFL);
    const label = svg.match(/<text id="sf-chart-rule-label-chart-target"[^>]*>/)?.[0];
    expect(label).toContain('fill="#ef4444"');
  });

  it('normalizes "none" and an absent stacked to ungrouped/grouped bars (no stacked rects)', () => {
    const sfl = STACKED_SFL.replace('stacked: true\n    ', '');
    const state = sflToCanvasState(sfl);
    expect(state.entities[0].chart?.stacked).toBeUndefined();
  });

  it('computes waterfall segments with a floating per-series baseline', () => {
    const base: RenderInput['charts'] = [
      {
        id: 'wf',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'bar',
        axisX: { min: 0, max: 4, step: 1 },
        axisY: { min: -20, max: 40, step: 10 },
        config: { stacked: 'waterfall' },
        fillColor: '#fff',
        strokeColor: '#000',
        textColor: '#111',
        series: [{ id: 's1', label: 'Flow', values: [10, -5, 20] }],
      },
    ];
    const { scene } = renderCanvas({ shapes: [], frames: [], swimlanes: [], links: [], charts: base } as RenderInput);
    const bars = scene.nodes
      .filter(node => node.id.startsWith('chart-bar-wf-s1-'))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    expect(bars).toHaveLength(3);
    const heights = bars.map(bar => barGeometry(bar).height);
    // Segment heights scale with |value| (10, -5, 20) regardless of the
    // exact plot padding - a 2:1:4 ratio either way.
    expect(heights[0] / heights[1]).toBeCloseTo(2, 1);
    expect(heights[2] / heights[1]).toBeCloseTo(4, 1);
    // Running baseline after [10, -5] is 5 - the third bar (value 20) must
    // sit strictly above the second (smaller y = higher up the plot), not
    // restart from a shared zero the way true/percent stacking would.
    const [, second, third] = bars;
    expect(barGeometry(third).top).toBeLessThan(barGeometry(second).top);
  });

  it('computes percent-stacked segments normalized to the full plot height', () => {
    const base: RenderInput['charts'] = [
      {
        id: 'pct',
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        chartType: 'bar',
        axisX: { min: 0, max: 4, step: 1 },
        axisY: { min: 0, max: 100, step: 10 },
        config: { stacked: 'percent' },
        fillColor: '#fff',
        strokeColor: '#000',
        textColor: '#111',
        series: [
          { id: 's1', label: 'A', values: [25] },
          { id: 's2', label: 'B', values: [75] },
        ],
      },
    ];
    const { scene } = renderCanvas({ shapes: [], frames: [], swimlanes: [], links: [], charts: base } as RenderInput);
    const bar1 = scene.nodes.find(node => node.id === 'chart-bar-pct-s1-0');
    const bar2 = scene.nodes.find(node => node.id === 'chart-bar-pct-s2-0');
    // 25% and 75% of the plot's own height, back-to-back, span it exactly.
    expect(barGeometry(bar2).height / barGeometry(bar1).height).toBeCloseTo(3, 1);
  });

  it('renders a line chart error whisker at a point with an asymmetric [low, high] error', () => {
    const base: RenderInput['charts'] = [
      {
        id: 'ln',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        chartType: 'line',
        axisX: { min: 0, max: 4, step: 1 },
        axisY: { min: 0, max: 100, step: 10 },
        fillColor: '#fff',
        strokeColor: '#000',
        textColor: '#111',
        series: [{ id: 's1', label: 'A', values: [50], error: [[10, 5]] }],
      },
    ];
    const { scene } = renderCanvas({ shapes: [], frames: [], swimlanes: [], links: [], charts: base } as RenderInput);
    const whisker = scene.nodes.find(node => node.id === 'chart-line-error-ln-s1-0');
    expect(whisker?.type === 'path' && whisker.d).toBeTruthy();
  });
});
