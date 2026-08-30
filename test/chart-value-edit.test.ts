import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { applyChartValueChange, applyMoveChange } from '../src/interaction';

// Round-trip editing of a chart's own data: the DOM contract that addresses a
// single mark (data-sf-series / data-sf-value-index / data-sf-value-scale)
// and the patcher that writes the dragged value back into `Series { values }`.

const BAR_SFL = `sfl 1.4

Model M {
  Chart c {
    type: bar
    categories: ["Q1", "Q2", "Q3", "Q4"]
    Axis x { min: 0; max: 4; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series online { color: "#7c3aed"; values: [60, 62, 58, 65] }
    Series retail { color: "#ec4899"; values: [40, 38, 42, 35] }
    layout { position: 0, 0; size: 340, 220 }
  }
}
`;

const owner = { role: 'chart' as const, id: 'c', kind: 'bar' };
const seriesLine = (sfl: string, id: string) => sfl.split('\n').find(l => l.includes(`Series ${id}`))!;

describe('chart mark addressing (DOM contract)', () => {
  it('tags every bar with its series and value index', () => {
    const { svg } = render(BAR_SFL);
    expect(svg).toContain('data-sf-series="online" data-sf-value-index="0"');
    expect(svg).toContain('data-sf-series="retail" data-sf-value-index="3"');
    expect([...svg.matchAll(/data-sf-value-index=/g)]).toHaveLength(8);
  });

  it('tags line and scatter points too', () => {
    const points = render(BAR_SFL.replace('type: bar', 'type: line')).svg;
    expect(points).toContain('data-sf-series="online" data-sf-value-index="2"');
  });

  it('tags an error whisker with the datum it annotates', () => {
    // The whisker is drawn over its own bar's top edge — the one spot a
    // reader grabs to change that value — so it has to address the same datum
    // rather than swallow the gesture.
    const withError = BAR_SFL.replace('values: [40, 38, 42, 35]', 'values: [40, 38, 42, 35]; error: [3, 4, 2, 5]');
    const { svg } = render(withError);
    const whisker = svg.match(/<path id="sf-chart-bar-error-c-retail-1"[^>]*>/)![0];
    expect(whisker).toContain('data-sf-series="retail"');
    expect(whisker).toContain('data-sf-value-index="1"');
  });

  it('carries the axis_y pixel mapping on the chart primary node', () => {
    const { svg } = render(BAR_SFL);
    const scale = svg.match(/data-sf-value-scale="([^"]+)"/);
    expect(scale).not.toBeNull();
    const [plotY, plotHeight, min, max] = scale![1].split(',').map(Number);
    expect(min).toBe(0);
    expect(max).toBe(100);
    expect(plotHeight).toBeGreaterThan(0);
    // A bar's own top edge must land where that mapping says its value is.
    const bar = svg.match(/<rect id="sf-chart-bar-c-online-0"[^>]*y="([\d.]+)"/);
    const value = min + ((plotY + plotHeight - Number(bar![1])) / plotHeight) * (max - min);
    expect(value).toBeCloseTo(60, 5);
  });

  it('omits the mapping on types whose axis_y is not a linear pixel scale', () => {
    for (const type of ['heatmap', 'pie', 'treemap', 'sankey', 'matrix', 'mekko']) {
      expect(render(BAR_SFL.replace('type: bar', `type: ${type}`)).svg).not.toContain('data-sf-value-scale');
    }
  });
});

describe('applyChartValueChange', () => {
  it('replaces exactly one element, leaving the rest of the line intact', () => {
    const out = applyChartValueChange(BAR_SFL, { owner, series: 'online', index: 1, value: 91 });
    expect(seriesLine(out, 'online')).toBe('    Series online { color: "#7c3aed"; values: [60, 91, 58, 65] }');
    expect(seriesLine(out, 'retail')).toBe(seriesLine(BAR_SFL, 'retail'));
  });

  it('handles the first and last element', () => {
    expect(seriesLine(applyChartValueChange(BAR_SFL, { owner, series: 'online', index: 0, value: 5 }), 'online'))
      .toContain('[5, 62, 58, 65]');
    expect(seriesLine(applyChartValueChange(BAR_SFL, { owner, series: 'online', index: 3, value: 7 }), 'online'))
      .toContain('[60, 62, 58, 7]');
  });

  it('rounds to one decimal, the same as every other patcher', () => {
    const out = applyChartValueChange(BAR_SFL, { owner, series: 'online', index: 0, value: 12.3456 });
    expect(seriesLine(out, 'online')).toContain('[12.3,');
  });

  it('keeps x and takes the new y on an [x, y] pair', () => {
    const scatter = BAR_SFL
      .replace('type: bar', 'type: scatter')
      .replace('values: [60, 62, 58, 65]', 'values: [[10, 20], [40, 55]]');
    const out = applyChartValueChange(scatter, { owner, series: 'online', index: 1, value: 88 });
    expect(seriesLine(out, 'online')).toContain('[[10, 20], [40, 88]]');
  });

  it('produces source that still parses clean', () => {
    const out = applyChartValueChange(BAR_SFL, { owner, series: 'retail', index: 2, value: 77 });
    expect(render(out).diagnostics).toEqual([]);
  });

  it('is a no-op for an unknown chart, series, or index', () => {
    expect(applyChartValueChange(BAR_SFL, { owner: { ...owner, id: 'nope' }, series: 'online', index: 0, value: 1 })).toBe(BAR_SFL);
    expect(applyChartValueChange(BAR_SFL, { owner, series: 'nope', index: 0, value: 1 })).toBe(BAR_SFL);
    expect(applyChartValueChange(BAR_SFL, { owner, series: 'online', index: 9, value: 1 })).toBe(BAR_SFL);
  });
});

describe('Chart as a patchable owner', () => {
  // Chart was missing from patchSfl's OWNER_HEADER, so every apply*Change
  // silently no-op'd on one — the same gap Table had.
  it('moves a chart through applyMoveChange', () => {
    const out = applyMoveChange(BAR_SFL, { owner, dx: 40, dy: 20 });
    expect(out).not.toBe(BAR_SFL);
    expect(out).toContain('position: 40, 20');
  });
});
