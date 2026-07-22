import { describe, expect, it } from 'vitest';
import { render, renderCanvas, DOM_CONTRACT_VERSION } from '../src/index';
import { fixtures, SFL_SAMPLE } from './fixtures';

// The interactive DOM contract (§9, ADR-03) is what a viewer binds to. It is
// fully assertable on the SVG string — no browser needed.

describe('interactive DOM contract', () => {
  it('stamps the versioned contract on the root svg', () => {
    const { svg } = renderCanvas(fixtures['shapes-all']);
    expect(svg).toContain(`data-sf-contract="${DOM_CONTRACT_VERSION}"`);
  });

  it('tags entities with role, id and kind, and makes the primary node focusable', () => {
    const { svg } = render(SFL_SAMPLE);
    // start is a rounded_rectangle entity in the sample.
    expect(svg).toMatch(/data-sf-role="entity"[^>]*data-sf-id="start"/);
    expect(svg).toContain('data-sf-kind="rounded_rectangle"');
    expect(svg).toMatch(/tabindex="0"[^>]*aria-label="Start"/);
  });

  it('maps every sub-node of an owner back to the same data-sf-id', () => {
    // A cylinder emits body + two ellipse caps; all must share the owner id so a
    // click on any part resolves to the entity via closest('[data-sf-id]').
    const { svg } = renderCanvas({
      shapes: [{
        id: 'tank', boardId: 'b', shapeType: 'cylinder', x: 0, y: 0, width: 100, height: 120,
        text: 'Tank', fillColor: '#fff', strokeColor: '#000', strokeWidth: 2,
        layer_group: 'default', order_key: 'a', is_visible: true, is_locked: false, createdAt: '',
      }],
      frames: [], swimlanes: [], links: [],
    } as unknown as Parameters<typeof renderCanvas>[0]);
    const ids = svg.match(/data-sf-id="tank"/g) ?? [];
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('tags links with role="link" and their id', () => {
    const { svg } = render(SFL_SAMPLE);
    expect(svg).toMatch(/data-sf-role="link"[^>]*data-sf-id="go"/);
  });

  it('escapes owner ids and labels in data attributes', () => {
    const { svg } = renderCanvas({
      shapes: [{
        id: 'a"b', boardId: 'b', shapeType: 'rectangle', x: 0, y: 0, width: 80, height: 40,
        text: '<x>', fillColor: '#fff', strokeColor: '#000', strokeWidth: 1,
        layer_group: 'default', order_key: 'a', is_visible: true, is_locked: false, createdAt: '',
      }],
      frames: [], swimlanes: [], links: [],
    } as unknown as Parameters<typeof renderCanvas>[0]);
    expect(svg).not.toContain('data-sf-id="a"b"');
    expect(svg).toContain('&quot;');
    expect(svg).toContain('aria-label="&lt;x&gt;"');
  });
});
