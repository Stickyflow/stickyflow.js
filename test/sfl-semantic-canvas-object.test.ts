import { describe, expect, it } from 'vitest';
import { sflToCanvasState } from '../src';

const SFL = `sfl 1.4

Model canvas {
  Entity source {
    id: "source-id"
    text: "Source"
    layout { position: 10, 20; size: 100, 50 }
  }

  Group grouped {
    Entity target {
      id: "target-id"
      layout { position: 200, 20; size: 100, 50 }
    }
  }

  Link connection { from: source; to: target }
}
`;

describe('SFL semantic Entity blocks', () => {
  it('resolves legacy Entity blocks into canvas objects', () => {
    const state = sflToCanvasState(SFL);

    expect(state.canvasObjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'source-id', objectType: 'shape', text: 'Source', x: 10, y: 20 }),
        expect.objectContaining({ id: 'target-id', objectType: 'shape', x: 200, y: 20 }),
      ]),
    );
  });

  it('includes Entity blocks in groups and resolves links by their SFL names', () => {
    const state = sflToCanvasState(SFL);

    expect(state.groups[0]?.canvasObjectIds).toEqual(['target-id']);
    expect(state.links[0]).toMatchObject({ fromId: 'source-id', toId: 'target-id' });
  });
});
