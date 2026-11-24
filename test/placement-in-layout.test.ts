import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src';

const scene = (body: string, before = '') =>
  `sfl 1.12\n\n${before}Model M {\n  Scene world {\n    layout {\n      position: 0, 0\n      size: 400, 300\n    }\n${body}  }\n}\n`;

const objectOf = (source: string, id: string) =>
  sflToCanvasState(source).canvasObjects.find(object => object.id === id);
const warnings = (source: string) =>
  render(source)
    .diagnostics.filter(found => found.code === 'placement-outside-layout')
    .map(found => found.ownerId);

const sketch = (shape: string) =>
  `    Sketch plan {\n${shape}    }\n    Solid board {\n      sketch: plan\n      height: 0.1\n    }\n`;

describe('A placement in the layout', () => {
  it('places a Light, and its position on itself is still read with a warning', () => {
    const now = scene('    Light lamp {\n      layout {\n        position: 0, 3, 0\n      }\n    }\n');
    const before = scene('    Light lamp {\n      position: 0, 3, 0\n    }\n');
    expect(objectOf(now, 'lamp')?.meshLight?.position).toEqual([0, 3, 0]);
    expect(objectOf(before, 'lamp')?.meshLight?.position).toEqual([0, 3, 0]);
    expect(warnings(now)).toEqual([]);
    expect(warnings(before)).toEqual(['lamp']);
  });

  it('places a Rect of a Sketch, as at and size on itself did before', () => {
    const now = scene(
      sketch(
        '      Rect top {\n        layout {\n          position: 1, 2\n          size: 3, 4\n        }\n      }\n',
      ),
    );
    const before = scene(sketch('      Rect top {\n        at: 1, 2\n        size: 3, 4\n      }\n'));
    expect(objectOf(now, 'board')?.mesh).toEqual(objectOf(before, 'board')?.mesh);
    expect(warnings(now)).toEqual([]);
    expect(warnings(before)).toEqual(['top', 'top']);
  });

  it('places a Cut of a Symbol by its layout', () => {
    const symbol = (cut: string) =>
      `Symbol Hole {\n  points: [[0, 0], [1, 0], [1, 1], [0, 1]]\n}\n\nSymbol plate {\n  points: [[0, 0], [1, 0], [1, 1], [0, 1]]\n  Cut hole {\n    symbol: Hole\n${cut}  }\n}\n\n`;
    const body = '    Solid base {\n      symbol: plate\n    }\n';
    const now = scene(body, symbol('    layout {\n      position: 0.4, 0.4\n      size: 0.2, 0.2\n    }\n'));
    const before = scene(body, symbol('    at: 0.4, 0.4\n    size: 0.2, 0.2\n'));
    expect(objectOf(now, 'base')?.mesh?.asset).toEqual(objectOf(before, 'base')?.mesh?.asset);
    expect(warnings(now)).toEqual([]);
  });

  it('says that a place on a body itself does nothing', () => {
    const source = scene('    Solid box {\n      position: 1, 0, 0\n    }\n');
    const [found] = render(source).diagnostics.filter(item => item.code === 'placement-outside-layout');
    expect(found?.message).toContain('does nothing');
    expect(objectOf(source, 'box')?.mesh?.position).toEqual([0, 0, 0]);
  });
});

describe('A Solid made from a Sketch', () => {
  const made = (solid: string) =>
    scene(
      `    Sketch plan {\n      Rect top {\n        layout {\n          position: 0, 0\n          size: 2, 1\n        }\n      }\n    }\n    Solid board {\n      sketch: plan\n${solid}    }\n`,
    );
  const sizeWarnings = (source: string) =>
    render(source)
      .diagnostics.filter(found => found.code === 'sketch-solid-size')
      .map(found => found.message);

  it('is turned by its own rotation on the plane of the Sketch', () => {
    const turned = made('      height: 0.1\n      layout {\n        rotation: 0, 45, 0\n      }\n');
    const plain = made('      height: 0.1\n');
    expect(objectOf(turned, 'board')?.mesh?.rotation[1]).toBeCloseTo(
      (objectOf(plain, 'board')?.mesh?.rotation[1] ?? 0) + 45,
    );
  });

  it('says that a size in its layout does nothing beside its height, and reads its height from there before', () => {
    expect(sizeWarnings(made('      height: 0.1\n      layout {\n        size: 5, 0.2, 5\n      }\n'))[0]).toContain(
      'does nothing',
    );
    const before = made('      layout {\n        size: 5, 0.2, 5\n      }\n');
    expect(sizeWarnings(before)[0]).toContain('written as height');
    expect(objectOf(before, 'board')?.mesh?.asset).toEqual(objectOf(made('      height: 0.2\n'), 'board')?.mesh?.asset);
  });
});
