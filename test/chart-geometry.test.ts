import { describe, expect, it } from 'vitest';
import { sflToRenderInput } from '../src/index';
import { hasEditableGeometry } from '../src/interaction/geometryRoles';
import { applyMoveChange, applyResizeChange } from '../src/interaction/patchSfl';
import type { OwnerRef } from '../src/viewer';

const CHART = `sfl 1.4

Model board {
  Chart c {
    type: bar
    categories: ["Q1", "Q2"]
    Axis x { min: 0; max: 2; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series a { color: "#6d5ef0"; values: [60, 62] }
    layout { position: 20, 40; size: 480, 300 }
  }
}
`;

const chart: OwnerRef = { role: 'chart', id: 'c' };

const geometryOf = (sfl: string) => {
  const first = sflToRenderInput(sfl).charts?.[0];
  if (!first) {
    throw new Error('no chart');
  }
  return { x: first.x, y: first.y, width: first.width, height: first.height };
};

describe('charts take part in move and resize', () => {
  it('accepts a chart owner', () => {
    expect(hasEditableGeometry(chart)).toBe(true);
    expect(hasEditableGeometry({ role: 'entity', id: 'e' })).toBe(true);
  });

  it('still refuses the roles that have no editable geometry', () => {
    expect(hasEditableGeometry({ role: 'link', id: 'l' })).toBe(false);
    expect(hasEditableGeometry({ role: 'frame', id: 'f' })).toBe(false);
    expect(hasEditableGeometry(null)).toBe(false);
    expect(hasEditableGeometry(undefined)).toBe(false);
  });

  it('moves a chart by the dragged delta', () => {
    const next = applyMoveChange(CHART, { owner: chart, dx: 40, dy: -15 });
    expect(geometryOf(next)).toEqual({ x: 60, y: 25, width: 480, height: 300 });
  });

  it('resizes a chart to the committed box', () => {
    const next = applyResizeChange(CHART, {
      owner: chart,
      dx: 0,
      dy: 0,
      dWidth: 100,
      dHeight: 60,
      x: 20,
      y: 40,
      width: 580,
      height: 360,
    });
    expect(geometryOf(next)).toEqual({ x: 20, y: 40, width: 580, height: 360 });
  });

  it('leaves the chart content alone while moving it', () => {
    const next = applyMoveChange(CHART, { owner: chart, dx: 10, dy: 10 });
    expect(sflToRenderInput(next).charts?.[0].series[0].values).toEqual([60, 62]);
    expect(next).toContain('categories: ["Q1", "Q2"]');
  });
});
