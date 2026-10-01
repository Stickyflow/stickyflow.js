import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

// Segments render as a barShapePath, not a rect - with barCornerRadius: 0 below it's a plain M x y H.. V.. H.. Z square.
function rect(node: RenderNode | undefined): { x: number; y: number; width: number; height: number } | undefined {
  if (node?.type !== 'path') {
    return undefined;
  }
  const match = node.d.match(/M ([-\d.]+) ([-\d.]+) H ([-\d.]+) V ([-\d.]+) H [-\d.]+ Z/);
  if (!match) {
    return undefined;
  }
  const [, x, y, right, bottom] = match.map(Number);
  return { x, y, width: right - x, height: bottom - y };
}

const MEKKO_SFL = `sfl 1.2

Model board {
  Chart revenue {
    text: "Revenue by region and product"
    type: mekko
    categories: ["East", "West"]
    barCornerRadius: 0

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series hardware { label: "Hardware"; color: "#4e3180"; values: [60, 20] }
    Series software { label: "Software"; values: [40, 40] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Mekko chart', () => {
  it('carries chartType and per-column values through sflToCanvasState', () => {
    const state = sflToCanvasState(MEKKO_SFL);
    expect(state.entities[0].chart?.chartType).toBe('mekko');
    expect(state.entities[0].chart?.series.map(s => s.values)).toEqual([
      [60, 20],
      [40, 40],
    ]);
  });

  it('renders one segment per row per column without a diagnostic', () => {
    const { diagnostics, svg } = render(MEKKO_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="mekko"');
    expect(svg).toContain('chart-mekko-seg-revenue-0-hardware');
    expect(svg).toContain('chart-mekko-seg-revenue-1-software');
  });

  it('makes column width proportional to that columns total (East 100 vs West 60)', () => {
    const { scene } = render(MEKKO_SFL);
    const eastHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-hardware'));
    const westHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-1-hardware'));
    expect(eastHw?.width).toBeGreaterThan(0);
    expect(westHw?.width).toBeGreaterThan(0);
    expect((eastHw?.width ?? 0) / (westHw?.width ?? 1)).toBeCloseTo(100 / 60, 1);
  });

  it('stacks a column to exactly its own height (segments sum to columnHeight)', () => {
    const { scene } = render(MEKKO_SFL);
    const eastHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-hardware'));
    const eastSw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-software'));
    expect(
      eastHw &&
        eastSw &&
        Math.abs(
          eastHw.height +
            eastSw.height -
            (eastHw.y < eastSw.y ? eastSw.y + eastSw.height - eastHw.y : eastHw.y + eastHw.height - eastSw.y),
        ),
    ).toBeLessThan(0.01);
  });

  it('uses uniform column height when mekkoVaryHeight is unset', () => {
    const { scene } = render(MEKKO_SFL);
    const eastHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-hardware'));
    const eastSw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-software'));
    const westHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-1-hardware'));
    const westSw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-1-software'));
    const eastTotal = (eastHw?.height ?? 0) + (eastSw?.height ?? 0);
    const westTotal = (westHw?.height ?? 0) + (westSw?.height ?? 0);
    expect(Math.abs(eastTotal - westTotal)).toBeLessThan(0.01);
  });

  it('scales column height to its share of the tallest column when mekkoVaryHeight is true', () => {
    const varied = MEKKO_SFL.replace('type: mekko', 'type: mekko\n    mekkoVaryHeight: true');
    const { scene } = render(varied);
    const eastHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-hardware'));
    const eastSw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-0-software'));
    const westHw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-1-hardware'));
    const westSw = rect(scene.nodes.find(n => n.id === 'chart-mekko-seg-revenue-1-software'));
    const eastTotal = (eastHw?.height ?? 0) + (eastSw?.height ?? 0);
    const westTotal = (westHw?.height ?? 0) + (westSw?.height ?? 0);
    expect(eastTotal).toBeGreaterThan(westTotal);
    expect(eastTotal / westTotal).toBeCloseTo(100 / 60, 1);
  });

  it('suppresses the generic per-series legend', () => {
    const { svg } = render(MEKKO_SFL);
    expect(svg).not.toContain('chart-legend-swatch-');
  });

  it('segment borders use the theme grid color, not a hardcoded white', () => {
    const themed = MEKKO_SFL.replace('type: mekko', 'type: mekko\n    style { gridColor: "#475569" }');
    const { svg } = render(themed);
    const segment = svg.match(/<path id="[^"]*chart-mekko-seg-revenue-0-hardware"[^>]*>/)?.[0];
    expect(segment).toContain('stroke="#475569"');
  });
});
