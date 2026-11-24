import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src';

const scene = (body: string, before = '') =>
  `sfl 1.12\n\n${before}Model M {\n  Scene world {\n    layout {\n      position: 0, 0\n      size: 400, 300\n    }\n${body}  }\n}\n`;

const placeOf = (source: string, id: string) => {
  const found = sflToCanvasState(source).canvasObjects.find(object => object.id === id);
  if (!found?.mesh) {
    throw new Error(`no mesh ${id}`);
  }
  return {
    position: found.mesh.position.map(v => Math.round(v * 1e6) / 1e6),
    rotation: found.mesh.rotation,
    scale: found.mesh.scale,
  };
};

const mesh = (name: string, position: string) =>
  `      Mesh ${name} {\n        asset: "${name}.glb"\n        layout {\n          position: ${position}\n        }\n      }\n`;

describe('A Group in a Scene', () => {
  it('moves, turns and scales what it holds as a whole', () => {
    const source = scene(
      `    Group shelf {\n      layout {\n        position: 2, 0, 0\n        rotation: 0, 90, 0\n        scale: 2\n      }\n${mesh('board', '1, 0, 0')}    }\n`,
    );
    expect(placeOf(source, 'board')).toEqual({ position: [2, 0, -2], rotation: [0, 90, 0], scale: [2, 2, 2] });
  });

  it('places within the Use that made it, and a Use inside it within the Group', () => {
    const lamp =
      'Template lamp {\n  Mesh bulb {\n    asset: "bulb.glb"\n    layout {\n      position: 0, 1, 0\n    }\n  }\n}\n\n';
    const stand = `Template stand {\n  Group top {\n    layout {\n      position: 0, 2, 0\n    }\n    Use light : lamp {\n      layout {\n        position: 1, 0, 0\n      }\n    }\n  }\n}\n\n`;
    const source = scene(
      '    Use s : stand {\n      layout {\n        position: 10, 0, 0\n      }\n    }\n',
      lamp + stand,
    );
    expect(placeOf(source, 's_light_bulb').position).toEqual([11, 3, 0]);
  });

  it('is an error when its layout in a Scene says a size', () => {
    const source = scene(
      `    Group shelf {\n      layout {\n        size: 1, 1, 1\n      }\n${mesh('board', '0, 0, 0')}    }\n`,
    );
    expect(() => sflToCanvasState(source)).toThrow('not size');
  });
});

describe('A Repeat in a Scene', () => {
  it('lays its rows along z, and keeps y for a Repeat written before', () => {
    const source = scene(
      `    Repeat row {\n      columns: 2\n      rows: 2\n      step: 3, 5\n      Mesh seat {\n        asset: "seat.glb"\n        layout {\n          position: x, 0, z\n        }\n      }\n      Mesh old {\n        asset: "old.glb"\n        layout {\n          position: x, 0, y\n        }\n      }\n    }\n`,
    );
    expect(placeOf(source, 'seat_1_1').position).toEqual([3, 0, 5]);
    expect(placeOf(source, 'old_1_1').position).toEqual([3, 0, 5]);
  });

  it('places all its cells together by its layout', () => {
    const source = scene(
      `    Repeat row {\n      count: 2\n      step: 1\n      layout {\n        position: 0, 0, 4\n        rotation: 0, 180, 0\n      }\n      Mesh seat {\n        asset: "seat.glb"\n        layout {\n          position: x, 0, 0\n        }\n      }\n    }\n`,
    );
    expect(placeOf(source, 'seat_1').position).toEqual([-1, 0, 4]);
  });
});

describe('A mirror', () => {
  const twin = (solid: string, kind = 'Solid') =>
    scene(
      `    ${kind} wing {\n      ${kind === 'Mesh' ? 'asset: "wing.glb"\n      ' : ''}${solid}\n      layout {\n        position: 1, 0, 0\n      }\n    }\n`,
    );
  const codes = (source: string) => render(source).diagnostics.map(found => found.code);

  it('makes the twin of a Solid on the other side, as flip written by hand did, with a word about flip', () => {
    const mirrored = sflToCanvasState(twin('mirror: x')).canvasObjects.find(object => object.id === 'wing_mirror');
    const flipped = sflToCanvasState(twin('flip: x')).canvasObjects.find(object => object.id === 'wing');
    expect(mirrored?.mesh?.position).toEqual([-1, 0, 0]);
    expect(mirrored?.mesh).toEqual(flipped?.mesh);
    expect(codes(twin('mirror: x'))).toEqual([]);
    expect(codes(twin('flip: x'))).toEqual(['flip-written']);
  });

  it('says that it does nothing on a block that is not a Solid', () => {
    expect(codes(twin('mirror: x', 'Mesh'))).toEqual(['mirror-not-solid']);
  });
});
