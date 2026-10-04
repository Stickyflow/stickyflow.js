import { describe, expect, it } from 'vitest';
import { selectedMoveGroup } from '../src/runtime/interaction/move/selection';
import type { OwnerRef, Viewer } from '../src/runtime/viewer';

// selection.ts calls the browser's CSS.escape, absent in this suite's node
// test environment — a minimal stand-in, good enough for the plain ids used here.
(globalThis as { CSS?: { escape(value: string): string } }).CSS ??= { escape: value => value };

interface FakeElement {
  getAttribute(name: string): string | null;
  closest(selector: string): FakeElement | null;
}

function fakeNode(attrs: Record<string, string>): FakeElement {
  const self: FakeElement = {
    getAttribute: name => attrs[name] ?? null,
    closest: selector => (selector === '[data-sf-id]' ? self : null),
  };
  return self;
}

function fakeViewer(matches: FakeElement[], selection: OwnerRef[] = []): Viewer {
  const svg = { querySelectorAll: () => matches as unknown as NodeListOf<Element> };
  return { svg, getSelection: () => selection } as unknown as Viewer;
}

describe('selecting a frame or swimlane and dragging it moves its contained entities too', () => {
  const frame: OwnerRef = { role: 'frame', id: 'f' };

  it('expands a lone frame owner to itself plus every entity tagged with its id', () => {
    const child1 = fakeNode({ 'data-sf-id': 'a', 'data-sf-role': 'entity', 'data-sf-parent-frame': 'f' });
    const child2 = fakeNode({ 'data-sf-id': 'b', 'data-sf-role': 'entity', 'data-sf-parent-frame': 'f' });
    const viewer = fakeViewer([child1, child2]);

    const group = selectedMoveGroup(viewer, frame);

    expect(group).toEqual([frame, { role: 'shape', id: 'a' }, { role: 'shape', id: 'b' }]);
  });

  it('still cascades when the frame is already the sole selection (select-then-drag, not just click-and-drag)', () => {
    const child = fakeNode({ 'data-sf-id': 'a', 'data-sf-role': 'entity', 'data-sf-parent-frame': 'f' });
    const viewer = fakeViewer([child], [frame]);

    expect(selectedMoveGroup(viewer, frame)).toEqual([frame, { role: 'shape', id: 'a' }]);
  });

  it('does not expand a plain entity owner', () => {
    const viewer = fakeViewer([]);
    const owner: OwnerRef = { role: 'shape', id: 'e' };

    expect(selectedMoveGroup(viewer, owner)).toEqual([owner]);
  });

  it("leaves an existing multi-select alone instead of also pulling in the frame's children", () => {
    const selection: OwnerRef[] = [frame, { role: 'shape', id: 'x' }];
    const viewer = fakeViewer(
      [fakeNode({ 'data-sf-id': 'a', 'data-sf-role': 'entity', 'data-sf-parent-frame': 'f' })],
      selection,
    );

    expect(selectedMoveGroup(viewer, frame)).toEqual(selection);
  });

  it('works the same way for a swimlane owner', () => {
    const lane: OwnerRef = { role: 'swimlane', id: 's' };
    const child = fakeNode({ 'data-sf-id': 'c', 'data-sf-role': 'entity', 'data-sf-parent-frame': 's' });
    const viewer = fakeViewer([child]);

    expect(selectedMoveGroup(viewer, lane)).toEqual([lane, { role: 'shape', id: 'c' }]);
  });
});
