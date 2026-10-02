import { describe, expect, it } from 'vitest';
import { bindDeleteSelection } from '../src/runtime/interaction/deleteSelection';
import { Emitter } from '../src/runtime/interaction/events';
import { bindEditing } from '../src/runtime/interaction/index';
import { createFakeViewer } from './fakeViewer';

function counted(types: string[]): Record<string, number> {
  return types.reduce<Record<string, number>>((tally, type) => {
    tally[type] = (tally[type] ?? 0) + 1;
    return tally;
  }, {});
}

describe('interaction lifecycle', () => {
  it('bindEditing removes every listener it added on destroy', () => {
    const { viewer, log } = createFakeViewer();
    const interaction = bindEditing(viewer);
    expect(log.added.length).toBeGreaterThan(0);

    interaction.destroy();
    expect(counted(log.removed)).toEqual(counted(log.added));
  });

  it('binding and destroying repeatedly leaks no listeners', () => {
    const { viewer, log } = createFakeViewer();
    for (let i = 0; i < 3; i++) {
      bindEditing(viewer).destroy();
    }
    expect(counted(log.removed)).toEqual(counted(log.added));
  });

  it('a destroyed interaction stops emitting', () => {
    const { viewer, svg, setSelection } = createFakeViewer();
    setSelection([{ role: 'shape', id: 'a' }]);
    const interaction = bindEditing(viewer);

    const seen: unknown[] = [];
    interaction.on('delete', event => seen.push(event));
    interaction.destroy();

    svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(seen).toEqual([]);
  });
});

describe('bindDeleteSelection', () => {
  it('emits the current selection on Delete and Backspace', () => {
    const { viewer, svg, setSelection } = createFakeViewer();
    setSelection([{ role: 'shape', id: 'a' }]);
    const emitter = new Emitter();
    const seen: Array<{ owners: unknown[] }> = [];
    emitter.on('delete', event => seen.push(event));

    const handle = bindDeleteSelection(viewer, emitter);
    svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete' }));
    svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace' }));
    handle.destroy();

    expect(seen).toHaveLength(2);
    expect(seen[0].owners).toEqual([{ role: 'shape', id: 'a' }]);
  });

  it('ignores other keys and an empty selection', () => {
    const { viewer, svg, setSelection } = createFakeViewer();
    const emitter = new Emitter();
    const seen: unknown[] = [];
    emitter.on('delete', event => seen.push(event));
    const handle = bindDeleteSelection(viewer, emitter);

    svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a' }));
    expect(seen).toEqual([]);

    setSelection([]);
    svg.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Delete' }));
    expect(seen).toEqual([]);

    handle.destroy();
  });
});
