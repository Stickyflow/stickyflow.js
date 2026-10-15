import { describe, expect, it } from 'vitest';
import { DOM_CONTRACT_VERSION, render } from '../src/index';
import {
  type AttrElement,
  isCameraGesture,
  isContractCompatible,
  parseContractVersion,
  resolveOwner,
} from '../src/runtime/dom';
import { classifySceneDiff } from '../src/runtime/viewer/display';
import { Emitter } from '../src/runtime/viewer/events';
import { clickAction, selectionReducer } from '../src/runtime/viewer/interaction/selection';
import { SFL_SAMPLE } from './fixtures';

describe('contract helpers', () => {
  it('parses the contract version a real render stamps', () => {
    const { svg } = render(SFL_SAMPLE);
    expect(parseContractVersion(svg)).toBe(DOM_CONTRACT_VERSION);
    expect(isContractCompatible(parseContractVersion(svg))).toBe(true);
  });

  it('rejects a missing or mismatched contract', () => {
    expect(parseContractVersion('<svg></svg>')).toBeNull();
    expect(isContractCompatible(null)).toBe(false);
    expect(isContractCompatible(DOM_CONTRACT_VERSION + 1)).toBe(false);
  });
});

describe('owner resolution (DOM-agnostic)', () => {
  const fake = (attrs: Record<string, string>): AttrElement => ({
    getAttribute: n => attrs[n] ?? null,
    closest: sel => (sel === '[data-sf-id]' && attrs['data-sf-id'] ? fake(attrs) : null),
  });

  it('resolves role/id/kind/label of an owner', () => {
    const owner = resolveOwner(
      fake({
        'data-sf-role': 'entity',
        'data-sf-id': 'start',
        'data-sf-kind': 'rounded_rectangle',
        'aria-label': 'Start',
      }),
    );
    expect(owner).toEqual({ role: 'shape', id: 'start', kind: 'rounded_rectangle', label: 'Start' });
  });

  it('returns null for chrome with no owner', () => {
    expect(resolveOwner(fake({}))).toBeNull();
    expect(resolveOwner(null)).toBeNull();
  });

  it('rejects an unknown role', () => {
    expect(resolveOwner(fake({ 'data-sf-role': 'bogus', 'data-sf-id': 'x' }))).toBeNull();
  });

  it('resolves native widgets as semantic owners', () => {
    const owner = resolveOwner(
      fake({ 'data-sf-role': 'widget', 'data-sf-id': 'speed', 'data-sf-kind': 'rollingNumber' }),
    );
    expect(owner).toEqual({ role: 'widget', id: 'speed', kind: 'rollingNumber', label: undefined });
  });
});

describe('camera gesture modifier', () => {
  it('is Ctrl or Cmd, and nothing else', () => {
    expect(isCameraGesture({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isCameraGesture({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isCameraGesture({ ctrlKey: true, metaKey: true })).toBe(true);
    expect(isCameraGesture({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});

describe('selection reducer', () => {
  it('select replaces, toggle adds/removes, clear empties', () => {
    let s = selectionReducer(new Set(), { type: 'select', id: 'a' });
    expect([...s]).toEqual(['a']);
    s = selectionReducer(s, { type: 'select', id: 'b' });
    expect([...s]).toEqual(['b']);
    s = selectionReducer(s, { type: 'toggle', id: 'c' });
    expect([...s].sort()).toEqual(['b', 'c']);
    s = selectionReducer(s, { type: 'toggle', id: 'b' });
    expect([...s]).toEqual(['c']);
    expect([...selectionReducer(s, { type: 'clear' })]).toEqual([]);
  });

  it('maps modifiers to replace vs multi-select', () => {
    expect(clickAction('a', { shift: false, ctrl: false, meta: false })).toEqual({ type: 'select', id: 'a' });
    expect(clickAction('a', { shift: false, ctrl: true, meta: false })).toEqual({ type: 'toggle', id: 'a' });
  });
});

describe('scene diff classification (change-highlighting)', () => {
  it('an id only present after the update is added', () => {
    expect(classifySceneDiff(new Set(), new Set(['a']), new Set(['a']))).toEqual({
      added: ['a'],
      removed: [],
      changed: [],
    });
  });

  it('an id whose every piece is gone is removed', () => {
    expect(classifySceneDiff(new Set(['a']), new Set(), new Set(['a']))).toEqual({
      added: [],
      removed: ['a'],
      changed: [],
    });
  });

  it('an id present before and after, with a touched piece, is changed', () => {
    expect(classifySceneDiff(new Set(['a']), new Set(['a']), new Set(['a']))).toEqual({
      added: [],
      removed: [],
      changed: ['a'],
    });
  });

  it('an id present before and after but never touched is absent from all three', () => {
    expect(classifySceneDiff(new Set(['a']), new Set(['a']), new Set())).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });
});

describe('emitter', () => {
  it('delivers to handlers and stops after unsubscribe', () => {
    const e = new Emitter();
    const seen: string[] = [];
    const off = e.on('ready', ev => seen.push(ev.diagramId));
    e.emit('ready', { diagramId: 'd1' });
    off();
    e.emit('ready', { diagramId: 'd2' });
    expect(seen).toEqual(['d1']);
  });
});
