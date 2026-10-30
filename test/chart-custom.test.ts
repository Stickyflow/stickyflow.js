import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

const CUSTOM_SFL = `sfl 1.2

Model board {
  Chart marks {
    text: "Custom glyphs"
    type: custom

    Axis x { min: 0; max: 10; step: 2 }
    Axis y { min: 0; max: 10; step: 2 }

    Series triangle {
      label: "Milestones"
      color: "#4e3180"
      stroke: "#1e1b4b"
      strokeWidth: 2
      symbol: [[-4, -4], [4, -4], [0, 4]]
      values: [[2, 2], [8, 8]]
    }
    Series plain {
      label: "Plain points"
      values: [[5, 5]]
    }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Custom chart', () => {
  it('carries chartType and per-series symbol/stroke through sflToCanvasState', () => {
    const state = sflToCanvasState(CUSTOM_SFL);
    const chart = state.canvasObjects[0];
    expect(chart.chart?.chartType).toBe('custom');
    expect(chart.chart?.series[0].symbol?.points).toEqual([
      [-4, -4],
      [4, -4],
      [0, 4],
    ]);
    expect(chart.chart?.series[0].stroke).toBe('#1e1b4b');
    expect(chart.chart?.series[0].strokeWidth).toBe(2);
  });

  it('draws one polygon glyph per data point for a series with a symbol, without a diagnostic', () => {
    const { diagnostics, svg } = render(CUSTOM_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="custom"');
    expect(svg).toContain('chart-custom-mark-marks-triangle-0');
    expect(svg).toContain('chart-custom-mark-marks-triangle-1');
  });

  it('uses the series color and stroke for its glyph fill/outline', () => {
    const { scene } = render(CUSTOM_SFL);
    const mark = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-triangle-0');
    expect(mark && solidFill(mark)).toBe('#4e3180');
    expect(mark?.type === 'path' && mark.style?.stroke?.kind === 'solid' && mark.style.stroke.color).toBe('#1e1b4b');
  });

  it('falls back to a plain dot for a series without a symbol', () => {
    const { scene } = render(CUSTOM_SFL);
    const mark = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-plain-0');
    expect(mark?.type).toBe('ellipse');
  });

  it('sizes the plain-dot fallback by the series own size, defaulting to 3', () => {
    const { scene } = render(CUSTOM_SFL);
    const plain = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-plain-0');
    expect(plain?.type === 'ellipse' && plain.rx).toBe(3);

    const sized = CUSTOM_SFL.replace('Series plain {', 'Series plain {\n      size: 9;');
    const { scene: sizedScene } = render(sized);
    const sizedPlain = sizedScene.nodes.find(node => node.id === 'chart-custom-mark-marks-plain-0');
    expect(sizedPlain?.type === 'ellipse' && sizedPlain.rx).toBe(9);
  });
});

const NAMED_SYMBOL_SFL = `sfl 1.4

Symbol diamond {
  points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]
}
Symbol blob {
  points: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]
  tension: 0.6
}

Model board {
  Chart marks {
    type: custom

    Axis x { min: 0; max: 10; step: 2 }
    Axis y { min: 0; max: 10; step: 2 }

    Series a { color: "#4e3180"; symbol: diamond; size: 5; values: [[2, 2]] }
    Series b { color: "#0ea5e9"; symbol: blob; size: 5; values: [[6, 6]] }
    Series c { color: "#16a34a"; symbol: [[-4, -4], [4, -4], [0, 4]]; values: [[8, 2]] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

const DUMBBELL_SFL = `sfl 1.4

Model board {
  Chart marks {
    text: "Perception vs reality"
    type: custom
    orientation: horizontal
    connectPoints: true
    reverseComparison: true
    categories: ["Retail", "Consumer Goods", "Healthcare"]
    zones: [["Better", "#10b981"], ["Worse", "#ec4899"], ["Tie", "#94a3b8"]]

    Axis x { min: 15; max: 1; step: 1 }
    Axis y { min: 0; max: 2; step: 1 }

    Series perception { values: [10, 12, 8] }
    Series reality { values: [6, 14, 8] }

    layout {
      position: 0, 0
      size: 500, 300
    }
  }
}`;

describe('Custom chart — connectPoints (dumbbell) mode', () => {
  it('renders one connector line, one hollow before-point, and one filled after-point per row, without a diagnostic', () => {
    const { diagnostics, svg } = render(DUMBBELL_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('chart-custom-connector-marks-0');
    expect(svg).toContain('chart-custom-mark-marks-perception-0');
    expect(svg).toContain('chart-custom-mark-marks-reality-0');
  });

  it('colors the after-point and connector green when reality is better (lower rank, reverseComparison on)', () => {
    const { scene } = render(DUMBBELL_SFL);
    const line = scene.nodes.find(node => node.id === 'chart-custom-connector-marks-0');
    const afterPoint = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-reality-0');
    expect(line?.type === 'path' && line.style?.stroke?.kind === 'solid' && line.style.stroke.color).toBe('#10b981');
    expect(afterPoint && solidFill(afterPoint)).toBe('#10b981');
  });

  it('colors the after-point and connector pink when reality is worse', () => {
    const { scene } = render(DUMBBELL_SFL);
    const line = scene.nodes.find(node => node.id === 'chart-custom-connector-marks-1');
    const afterPoint = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-reality-1');
    expect(line?.type === 'path' && line.style?.stroke?.kind === 'solid' && line.style.stroke.color).toBe('#ec4899');
    expect(afterPoint && solidFill(afterPoint)).toBe('#ec4899');
  });

  it('falls back to the tie zone color when both values are equal', () => {
    const { scene } = render(DUMBBELL_SFL);
    const afterPoint = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-reality-2');
    expect(afterPoint && solidFill(afterPoint)).toBe('#94a3b8');
  });

  it('keeps the before-point hollow (grid-colored fill, neutral stroke) regardless of comparison', () => {
    const { scene } = render(DUMBBELL_SFL);
    const beforePoint = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-perception-0');
    expect(beforePoint?.type === 'ellipse' && beforePoint.style?.stroke?.kind === 'solid').toBe(true);
    expect(beforePoint && solidFill(beforePoint)).not.toBe('#10b981');
  });

  it('flips better/worse when reverseComparison is off, for the same data', () => {
    const normal = DUMBBELL_SFL.replace('reverseComparison: true\n    ', '');
    const { scene } = render(normal);
    const line = scene.nodes.find(node => node.id === 'chart-custom-connector-marks-0');
    expect(line?.type === 'path' && line.style?.stroke?.kind === 'solid' && line.style.stroke.color).toBe('#ec4899');
  });

  it('places the auto-generated row index on the y-axis when orientation is horizontal, leaving explicit [x,y] tuples untouched', () => {
    const { scene } = render(DUMBBELL_SFL);
    const first = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-perception-0');
    const second = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-perception-1');
    expect(first?.type === 'ellipse' && second?.type === 'ellipse').toBe(true);
    if (first?.type === 'ellipse' && second?.type === 'ellipse') {
      expect(first.cy).not.toBe(second.cy);
      expect(first.cx).not.toBe(second.cx);
    }
  });

  it('draws a category label per row when categories and showAxisLabels are both present', () => {
    const { svg } = render(DUMBBELL_SFL);
    expect(svg).toContain('>Retail<');
    expect(svg).toContain('>Healthcare<');
  });

  it('draws no connector marks and no labels when connectPoints is left off, even with the same two-series data', () => {
    const plain = DUMBBELL_SFL.replace('connectPoints: true\n    ', '');
    const { svg } = render(plain);
    expect(svg).not.toContain('chart-custom-connector-');
    expect(svg).toContain('chart-custom-mark-marks-perception-0');
  });

  it('suppresses the generic per-series legend, since its palette colors would not match the comparison coloring', () => {
    const withLegend = DUMBBELL_SFL.replace('type: custom', 'type: custom\n    style { showLegend: true }');
    const { svg } = render(withLegend);
    expect(svg).not.toContain('chart-legend-marks-perception');
    expect(svg).not.toContain('chart-legend-marks-reality');
  });

  it('still draws x-axis ticks and gridlines for a reversed axis (min > max), matching a ranking scale', () => {
    const { svg } = render(DUMBBELL_SFL);
    expect(svg).toContain('chart-x-tick-marks-15');
    expect(svg).toContain('chart-x-tick-marks-1');
    expect(svg).toContain('chart-grid-x-marks-');
  });
});

describe('Custom chart — named Symbol reference on Series.symbol', () => {
  it('resolves a bare Symbol name against the document Symbol definitions, normalized', () => {
    const state = sflToCanvasState(NAMED_SYMBOL_SFL);
    const symbol = state.canvasObjects.find(e => e.id === 'marks')?.chart?.series[0].symbol;
    expect(symbol?.normalized).toBe(true);
    expect(symbol?.points).toEqual([
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ]);
  });

  it('scales a named symbol by size*2, centered on the point — unlike an inline symbol, which stays raw pixel offsets', () => {
    const { diagnostics, scene } = render(NAMED_SYMBOL_SFL);
    expect(diagnostics).toEqual([]);
    const namedMark = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-a-0');
    expect(namedMark?.type === 'path' && namedMark.d).toContain('M ');
    const rightVertexX = namedMark?.type === 'path' ? namedMark.d.match(/M ([\d.-]+)/)?.[1] : undefined;
    expect(rightVertexX).toBeDefined();
  });

  it('renders a named symbol with tension as a curved path, distinct from the same points without tension', () => {
    const { scene } = render(NAMED_SYMBOL_SFL);
    const straight = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-a-0');
    const curved = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-b-0');
    expect(straight?.type === 'path' && straight.d).not.toContain('C ');
    expect(curved?.type === 'path' && curved.d).toContain('C ');
  });

  it('keeps an inline symbol list rendering exactly as raw pixel offsets, unaffected by the named-symbol path', () => {
    const { scene } = render(NAMED_SYMBOL_SFL);
    const inline = scene.nodes.find(node => node.id === 'chart-custom-mark-marks-c-0');
    expect(inline?.type === 'path' && inline.d).not.toContain('C ');
    expect(inline?.type === 'path' && inline.d).toContain('Z');
  });
});
