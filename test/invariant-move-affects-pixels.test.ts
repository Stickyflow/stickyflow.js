import { describe, expect, it } from 'vitest';
import { sflToRenderInput } from '../src/index';
import { applyMoveChange, applyResizeChange } from '../src/interaction';

// The Path move bug (fixed this session) was a diff applier writing a
// textually valid change that had zero visual effect: layout.position
// changed, nothing moved, because the renderer never reads a Path's own
// position. Swept here across every owner role a diff applier handles, so
// the same silent-no-op shape can't reappear for a role nobody thought to
// check by hand. Checked against the render input the renderer actually
// consumes (x/y/width/height per role), not by re-parsing rendered SVG path
// syntax : arc/line commands don't reduce to simple coordinate pairs.

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function boxOf(sfl: string, role: 'entity' | 'frame' | 'chart', id: string): Box {
  const input = sflToRenderInput(sfl);
  const found =
    role === 'frame'
      ? input.frames.find(f => f.id === id)
      : role === 'chart'
        ? input.charts?.find(c => c.id === id)
        : input.shapes.find(s => s.id === id);
  if (!found) {
    throw new Error(`no ${role} named ${id} in render input`);
  }
  return { x: found.x, y: found.y, width: found.width, height: found.height };
}

const CASES: Array<{ label: string; owner: { role: 'entity' | 'frame' | 'chart'; id: string }; sfl: string }> = [
  {
    label: 'entity',
    owner: { role: 'entity', id: 'e' },
    sfl: `sfl 1.4

Model M {
  Entity e { text: "E"; layout { position: 0, 0; size: 100, 60 } }
}`,
  },
  {
    label: 'frame',
    owner: { role: 'frame', id: 'f' },
    sfl: `sfl 1.4

Model M {
  Container f { kind: frame; text: "F"; layout { position: 0, 0; size: 200, 150 } }
}`,
  },
  {
    label: 'chart',
    owner: { role: 'chart', id: 'c' },
    sfl: `sfl 1.4

Model M {
  Chart c {
    type: bar
    Series a { color: "#6d5ef0"; values: [40] }
    layout { position: 0, 0; size: 200, 150 }
  }
}`,
  },
];

describe('a committed move actually shifts the geometry the renderer will draw', () => {
  for (const { label, owner, sfl } of CASES) {
    it(label, () => {
      const before = boxOf(sfl, owner.role, owner.id);
      expect(before).toEqual({ x: 0, y: 0, width: before.width, height: before.height });

      const moved = applyMoveChange(sfl, { owner, dx: 40, dy: 25 });
      const after = boxOf(moved, owner.role, owner.id);
      expect(after).toEqual({ x: 40, y: 25, width: before.width, height: before.height });
    });
  }
});

describe('a committed resize actually resizes the geometry the renderer will draw', () => {
  for (const { label, owner, sfl } of CASES) {
    it(label, () => {
      const resized = applyResizeChange(sfl, {
        owner,
        x: 10,
        y: 5,
        width: 260,
        height: 90,
        dx: 10,
        dy: 5,
        dWidth: 60,
        dHeight: -60,
      });
      const after = boxOf(resized, owner.role, owner.id);
      expect(after).toEqual({ x: 10, y: 5, width: 260, height: 90 });
    });
  }
});
