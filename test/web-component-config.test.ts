import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/runtime/webComponent/config';

// Pure attribute parsing for <stickyflow-diagram> — node-testable via a plain
// getter. The element's DOM lifecycle is browser-verified via the demo.
const from = (attrs: Record<string, string>) => (name: string) => attrs[name] ?? null;

describe('web-component config parsing', () => {
  it('reads source, defaults to static, no padding', () => {
    const cfg = readConfig(from({ source: 'sfl 1.2' }));
    expect(cfg).toEqual({ source: 'sfl 1.2', interactive: false, padding: undefined, diagramId: undefined });
  });

  it('treats interactive as a boolean attribute (presence = true)', () => {
    expect(readConfig(from({ interactive: '' })).interactive).toBe(true);
    expect(readConfig(from({ interactive: 'anything' })).interactive).toBe(true);
    expect(readConfig(from({ interactive: 'false' })).interactive).toBe(false);
    expect(readConfig(from({})).interactive).toBe(false);
  });

  it('parses numeric padding and ignores garbage', () => {
    expect(readConfig(from({ padding: '32' })).padding).toBe(32);
    expect(readConfig(from({ padding: '' })).padding).toBeUndefined();
    expect(readConfig(from({ padding: 'lots' })).padding).toBeUndefined();
  });

  it('maps diagram-id', () => {
    expect(readConfig(from({ 'diagram-id': 'checkout' })).diagramId).toBe('checkout');
  });

  it('null source when absent', () => {
    expect(readConfig(from({})).source).toBeNull();
  });
});
