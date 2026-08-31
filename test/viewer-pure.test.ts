import { describe, expect, it } from 'vitest';
import { DOM_CONTRACT_VERSION, render } from '../src/index';
import {
  type AttrElement,
  isCameraGesture,
  isContractCompatible,
  parseContractVersion,
  resolveOwner,
} from '../src/viewer/contract';
import { Emitter } from '../src/viewer/events';
import { clickAction, selectionReducer } from '../src/viewer/selection';
import { SFL_SAMPLE } from './fixtures';

// The interaction tier's PURE core — no DOM. These run under environment:'node'.
// The DOM layers (display.ts / interaction.ts) are browser-verified separately.

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
  // Minimal fake element: the clicked node carries data-sf-* directly (flat SVG).
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
    expect(owner).toEqual({ role: 'entity', id: 'start', kind: 'rounded_rectangle', label: 'Start' });
  });

  it('returns null for chrome with no owner', () => {
    expect(resolveOwner(fake({}))).toBeNull();
    expect(resolveOwner(null)).toBeNull();
  });

  it('rejects an unknown role', () => {
    expect(resolveOwner(fake({ 'data-sf-role': 'bogus', 'data-sf-id': 'x' }))).toBeNull();
  });
});

describe('camera gesture modifier', () => {
  // Both tiers key off this one predicate: the viewer pans/zooms when it holds,
  // and every mutating gesture in stickyflow/interaction declines. Panning a
  // zoomed-in diagram depends on the two agreeing, which is why it is a shared
  // function rather than the same two keys tested in five places.
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
