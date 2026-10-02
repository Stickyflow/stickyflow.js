import { describe, expect, it } from 'vitest';
import { render } from '../src';
import { sflToCanvasState } from '../src/sflSemantic/sflToCanvasState';

const chart = (body: string) => `sfl 1.2

Model M {
  Chart c {
    layout { position: 0, 0; size: 300, 200 }
    Axis x { min: 0; max: 10; step: 1 }
    Axis y { min: 0; max: 10; step: 1 }
${body}
  }
}
`;

const chartOf = (sfl: string) => sflToCanvasState(sfl).canvasObjects.find(entity => entity.id === 'c')?.chart;

describe('chart type validation', () => {
  it('keeps a supported type', () => {
    expect(chartOf(chart('    type: scatter'))?.chartType).toBe('scatter');
  });

  it('falls back to bar for an unsupported type', () => {
    expect(chartOf(chart('    type: pyramid'))?.chartType).toBe('bar');
  });

  it('reports the unsupported type once, from the parse stage', () => {
    const warnings = sflToCanvasState(chart('    type: pyramid')).diagnostics.filter(
      diagnostic => diagnostic.code === 'unsupported-chart-type',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].entityId).toBe('c');
    expect(warnings[0].message).toContain('pyramid');
  });

  it('reports nothing for a supported type', () => {
    const diagnostics = sflToCanvasState(chart('    type: line')).diagnostics;
    expect(diagnostics.filter(d => d.code === 'unsupported-chart-type')).toEqual([]);
  });
});

describe('stacked mode validation', () => {
  it('keeps the three supported modes', () => {
    for (const mode of ['true', 'percent', 'waterfall']) {
      expect(chartOf(chart(`    type: bar\n    stacked: ${mode}`))?.stacked).toBe(mode);
    }
  });

  it('drops an unknown mode instead of passing it through', () => {
    expect(chartOf(chart('    type: bar\n    stacked: sideways'))?.stacked).toBeUndefined();
  });

  it('treats none as absent', () => {
    expect(chartOf(chart('    type: bar\n    stacked: none'))?.stacked).toBeUndefined();
  });
});

describe('series values', () => {
  const values = (literal: string) =>
    chartOf(chart(`    type: line\n    Series s { label: "S"; values: ${literal} }`))?.series[0]?.values;

  it('reads a plain number list', () => {
    expect(values('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('reads a list of pairs', () => {
    expect(values('[[1, 2], [3, 4]]')).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('does not mix scalars and tuples in one series', () => {
    expect(values('[1, [2, 3], 4]')).toEqual([1, 4]);
  });

  it('lets the first usable entry decide the shape', () => {
    expect(values('[[2, 3], 1, [4, 5]]')).toEqual([
      [2, 3],
      [4, 5],
    ]);
  });

  it('renders mixed input without NaN coordinates', () => {
    const svg = render(chart('    type: line\n    Series s { label: "S"; values: [1, [2, 3], 4] }')).svg;
    expect(svg).not.toContain('NaN');
  });
});
