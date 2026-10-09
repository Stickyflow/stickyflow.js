import { describe, expect, it } from 'vitest';
import { isChartObject, isPathObject, isSwimlaneObject, sflToCanvasState } from '../src/index';

const SFL = `sfl 1.4

Model M {
  Chart c {
    type: bar
    Axis x { min: 0; max: 4; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }
    Series a { color: "#6d5ef0"; values: [10, 20] }
    layout { position: 0, 0; size: 200, 150 }
  }
  Shape s {
    text: "plain"
    layout { position: 0, 320; size: 100, 50 }
  }
}
`;

describe('canvas object type guards', () => {
  it('isChartObject narrows to the canvas object carrying .chart', () => {
    const chart = sflToCanvasState(SFL).canvasObjects.find(isChartObject);
    expect(chart?.id).toBe('c');
    expect(chart?.chart.chartType).toBe('bar');
  });

  it('rejects canvas objects of another type even when they happen to carry the field', () => {
    const canvasObjects = sflToCanvasState(SFL).canvasObjects;
    expect(canvasObjects.filter(isChartObject)).toHaveLength(1);
    expect(canvasObjects.filter(isSwimlaneObject)).toHaveLength(0);
    expect(canvasObjects.filter(isPathObject)).toHaveLength(0);
  });
});
