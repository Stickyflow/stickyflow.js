import { describe, expect, it } from 'vitest';
import { symbolDeclaredBounds } from '../src/domContract';

function fakeElement(attrs: Record<string, string>) {
  return { getAttribute: (name: string) => attrs[name] ?? null };
}

describe('symbolDeclaredBounds', () => {
  it('parses the declared entity box from data-sf-symbol-bounds', () => {
    const el = fakeElement({ 'data-sf-symbol-bounds': '10,20,100,60' });
    expect(symbolDeclaredBounds(el)).toEqual({ x: 10, y: 20, width: 100, height: 60 });
  });

  it('returns null when the attribute is absent (a built-in shape, not a Symbol)', () => {
    const el = fakeElement({});
    expect(symbolDeclaredBounds(el)).toBeNull();
  });

  it('returns null for a malformed value rather than a partially-NaN box', () => {
    const el = fakeElement({ 'data-sf-symbol-bounds': '10,20,oops,60' });
    expect(symbolDeclaredBounds(el)).toBeNull();
  });
});
