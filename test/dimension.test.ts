import { describe, expect, it } from 'vitest';
import { isDimensionObject, render, sflToCanvasState } from '../src';
import { dimensionGeometry, dimensionText } from '../src/model/dimension';

const source = (body: string) => `sfl 1.5

Model m {
  ${body}
}
`;

const WIDTH = source(`Dimension width {
    start: 0, 0
    end: 140, 0
    offset: 30
  }`);

describe('Dimension', () => {
  it('reads start, end, offset and unit', () => {
    const [dimension] = sflToCanvasState(
      source(`Dimension h {
    start: 0, 0
    end: 0, 90
    offset: -20
    unit: "cm"
  }`),
    ).canvasObjects.filter(isDimensionObject);

    expect(dimension.dimension).toEqual({
      start: { x: 0, y: 0 },
      end: { x: 0, y: 90 },
      offset: -20,
      unit: 'cm',
    });
  });

  it('measures the length when no text is given', () => {
    const { scene } = render(WIDTH);
    const label = scene.nodes.find(node => node.id === 'dimension-width-label');

    expect(label && 'lines' in label ? label.lines : []).toEqual(['140']);
  });

  it('appends the unit to the measured length', () => {
    expect(dimensionText({ start: { x: 0, y: 0 }, end: { x: 0, y: 90 }, unit: 'cm' })).toBe('90 cm');
  });

  it('draws a double-arrow line and extension lines', () => {
    const { scene } = render(WIDTH);
    const line = scene.nodes.find(node => node.id === 'dimension-width-line');

    expect(line && 'markerStart' in line ? [line.markerStart, line.markerEnd] : []).toEqual([
      'filled_arrow',
      'filled_arrow',
    ]);
    expect(scene.nodes.some(node => node.id === 'dimension-width-extensions')).toBe(true);
  });

  it('puts a positive offset to the left of the direction', () => {
    const geometry = dimensionGeometry({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, offset: 30 });

    expect(geometry.line[0].y).toBe(-30);
  });

  it('omits extension lines when the offset is small', () => {
    const geometry = dimensionGeometry({ start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, offset: 2 });

    expect(geometry.extensions).toEqual([]);
  });
});
