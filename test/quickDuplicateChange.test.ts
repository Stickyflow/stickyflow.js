import { describe, expect, it } from 'vitest';
import { applyQuickDuplicateChange } from '../src/runtime/interaction/patchSfl';
import { isIsometricObject, sflToCanvasState } from '../src/sflSemantic/sflToCanvasState';

const owner = (id: string) => ({ role: 'shape' as const, id });

const BOARD = `sfl 1.4

Style Hot { stroke: "#d97706"; strokeWidth: 3; markerEnd: arrow; route: curved }

Model board {
  Shape a {
    text: "A"
    layout { position: 0, 0; size: 100, 50 }
    style { fill: "#fef3c7"; stroke: "#92400e"; textColor: "#451a03" }
  }
  Shape b {
    text: "B"
    layout { position: 400, 0; size: 100, 50 }
  }
  Link ab : Hot { from: a, right; to: b, left }
}
`;

describe('applyQuickDuplicateChange', () => {
  it('places the copy beyond the dragged edge, with the gap of a shape', () => {
    const next = applyQuickDuplicateChange(
      BOARD,
      { owner: owner('a'), direction: 'bottom' },
      { shapeId: 'c', linkId: 'ac' },
    );
    const copy = sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'c');
    expect(copy?.x).toBe(0);
    expect(copy?.y).toBe(250);
    expect(copy?.width).toBe(100);
  });

  it('uses the gap that is passed', () => {
    const next = applyQuickDuplicateChange(
      BOARD,
      { owner: owner('a'), direction: 'right' },
      { shapeId: 'c', linkId: 'ac', gap: 20 },
    );
    expect(sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'c')?.x).toBe(120);
  });

  it('copies the look of the object', () => {
    const next = applyQuickDuplicateChange(
      BOARD,
      { owner: owner('a'), direction: 'bottom' },
      { shapeId: 'c', linkId: 'ac' },
    );
    const copy = sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'c');
    expect(copy?.props.fill).toBe('#fef3c7');
    expect(copy?.props.textColor).toBe('#451a03');
  });

  it('gives the link the look of a link that leaves the same object', () => {
    const next = applyQuickDuplicateChange(
      BOARD,
      { owner: owner('a'), direction: 'bottom' },
      { shapeId: 'c', linkId: 'ac' },
    );
    const link = sflToCanvasState(next).links.find(candidate => candidate.id === 'ac');
    expect(link?.fromId).toBe('a');
    expect(link?.toId).toBe('c');
    expect(link?.fromSide).toBe('bottom');
    expect(link?.toSide).toBe('top');
    expect(link?.props.stroke).toBe('#d97706');
    expect(link?.props.strokeWidth).toBe('3');
    expect(link?.props.markerEnd).toBe('arrow');
    expect(link?.props.route).toBe('curved');
  });

  it('falls back to the first link of the document when the object has none', () => {
    const next = applyQuickDuplicateChange(
      BOARD,
      { owner: owner('b'), direction: 'bottom' },
      { shapeId: 'c', linkId: 'bc' },
    );
    expect(sflToCanvasState(next).links.find(candidate => candidate.id === 'bc')?.props.stroke).toBe('#d97706');
  });

  it('leaves the link unstyled when the document has no link', () => {
    const bare = `sfl 1.4\n\nModel board {\n  Shape a {\n    text: "A"\n    layout { position: 0, 0; size: 100, 50 }\n  }\n}\n`;
    const next = applyQuickDuplicateChange(
      bare,
      { owner: owner('a'), direction: 'right' },
      { shapeId: 'c', linkId: 'ac' },
    );
    const link = sflToCanvasState(next).links.find(candidate => candidate.id === 'ac');
    expect(link?.props.stroke).toBeUndefined();
  });

  it('returns the text unchanged for an unknown object', () => {
    expect(
      applyQuickDuplicateChange(BOARD, { owner: owner('nope'), direction: 'right' }, { shapeId: 'c', linkId: 'x' }),
    ).toBe(BOARD);
  });
});

describe('applyQuickDuplicateChange on an isometric object', () => {
  const ISO = `sfl 1.4

Model scene {
  Isometric relay {
    text: "Relay"
    layout {
      position: 320, 180
      size: 120, 130, 28
    }
    style { fill: "#e2e8f0"; shadow: "shadow(opacity:0.3, blur:8)" }
  }
}
`;

  it('adds a copy and a connection between the touching faces', () => {
    const next = applyQuickDuplicateChange(
      ISO,
      { owner: owner('relay'), direction: 'iso-width-pos' },
      { shapeId: 'copy', linkId: 'conn' },
    );
    const state = sflToCanvasState(next);
    const copy = state.canvasObjects.find(candidate => candidate.id === 'copy');
    expect(copy && isIsometricObject(copy)).toBe(true);
    expect(next).toContain('Connection conn');
    expect(next).toContain('fromFace');
  });

  it('switches off the shadow of a copy that is stacked on the object', () => {
    const next = applyQuickDuplicateChange(
      ISO,
      { owner: owner('relay'), direction: 'iso-height-pos' },
      { shapeId: 'copy', linkId: 'conn' },
    );
    const copy = sflToCanvasState(next).canvasObjects.find(candidate => candidate.id === 'copy');
    expect(copy?.props.shadow).toBe('off');
  });

  it('ignores a flat direction on an isometric object', () => {
    expect(
      applyQuickDuplicateChange(
        ISO,
        { owner: owner('relay'), direction: 'right' },
        { shapeId: 'copy', linkId: 'conn' },
      ),
    ).toBe(ISO);
  });
});
