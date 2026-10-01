import { describe, expect, it } from 'vitest';
import { DOM_CONTRACT_VERSION, render, renderCanvas } from '../src/index';
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
    // A double-stroked shape emits an outer ring, an inner ring and a label; all
    // must share the owner id so a click on any part resolves to the entity via
    // closest('[data-sf-id]').
    const { svg } = renderCanvas({
      shapes: [
        {
          id: 'tank',
          shapeType: 'rectangle',
          strokeStyle: 'double',
          x: 0,
          y: 0,
          width: 100,
          height: 120,
          text: 'Tank',
          fillColor: '#fff',
          strokeColor: '#000',
          strokeWidth: 2,
          layerGroup: 'default',
          orderKey: 'a',
          isVisible: true,
          isLocked: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as Parameters<typeof renderCanvas>[0]);
    const ids = svg.match(/data-sf-id="tank"/g) ?? [];
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('tags links with role="link" and their id', () => {
    const { svg } = render(SFL_SAMPLE);
    expect(svg).toMatch(/data-sf-role="link"[^>]*data-sf-id="go"/);
  });

  it('marks exactly one node per owner as sf-primary — the shape/link itself, never its text label', () => {
    // The viewer paints a selection indicator only onto data-sf-primary nodes
    // (see interaction.ts's paintSelection). Marking every sub-node sharing an
    // owner's id — the previous behavior — applied the selection style to text
    // labels too, and a stroke isn't a meaningful thing to put on glyphs: a
    // selected entity's own label rendered as a disfigured blob instead of a
    // clean highlight on the shape. This must hold for every owner type, not
    // just shapes with text — a title-less frame/table or a swimlane never
    // gets an aria-label, but still needs exactly one primary node.
    const { svg } = render(SFL_SAMPLE);
    // "start" is a rounded_rectangle entity with a text label in the sample.
    const startPrimaryCount = (svg.match(/data-sf-id="start"[^>]*data-sf-primary="true"/g) ?? []).length;
    expect(startPrimaryCount).toBe(1);
    expect(svg).toMatch(/<rect id="sf-shape-start"[^>]*data-sf-primary="true"/);
    expect(svg).not.toMatch(/<text id="sf-shape-text-start"[^>]*data-sf-primary/);
    // "go" is the link with a text label in the sample.
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-primary="true"/);
    expect(svg).not.toMatch(/<text id="sf-link-text-go"[^>]*data-sf-primary/);
  });

  it('tags links with their connected entity ids and route type', () => {
    // A DOM-only interaction layer (e.g. a drag handler moving "start") has no
    // other way to find which links are attached to it — the DOM never
    // otherwise records link connectivity, only each owner's own id/role/kind.
    const { svg } = render(SFL_SAMPLE);
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-from="start"/);
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-to="finish"/);
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-route="orthogonal"/);
  });

  it('tags links with their pinned connection sides, when the source sets one', () => {
    // A live drag preview needs the real pinned side to anchor its preview at
    // the same point the static renderer used — without it, the preview would
    // fall back to guessing a side from the shapes' current relative position.
    const { svg } = render(SFL_SAMPLE);
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-from-side="bottom"/);
    expect(svg).toMatch(/<path id="sf-link-go"[^>]*data-sf-to-side="top"/);
  });

  it('tags text nodes with vertical alignment and line height', () => {
    // A live resize preview needs both to re-wrap a label at the new width
    // using the exact formula textSvg() does — text-anchor already recovers
    // horizontal align, but nothing else in the rendered SVG encodes these.
    const { svg } = render(SFL_SAMPLE);
    expect(svg).toMatch(/<text id="sf-shape-text-start"[^>]*data-sf-valign="middle"/);
    expect(svg).toMatch(/<text id="sf-shape-text-start"[^>]*data-sf-line-height="1.3"/);
  });

  it('escapes owner ids and labels in data attributes', () => {
    const { svg } = renderCanvas({
      shapes: [
        {
          id: 'a"b',
          shapeType: 'rectangle',
          x: 0,
          y: 0,
          width: 80,
          height: 40,
          text: '<x>',
          fillColor: '#fff',
          strokeColor: '#000',
          strokeWidth: 1,
          layerGroup: 'default',
          orderKey: 'a',
          isVisible: true,
          isLocked: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as Parameters<typeof renderCanvas>[0]);
    expect(svg).not.toContain('data-sf-id="a"b"');
    expect(svg).toContain('&quot;');
    expect(svg).toContain('aria-label="&lt;x&gt;"');
  });

  it('never emits a literal <script>, a live event-handler attribute, or an unescaped tag break-out from user-supplied text — output is safe to insert via innerHTML', () => {
    // A hostile label attempting to break out of an attribute AND inject a
    // new element — the two classic SVG/HTML injection shapes in one string.
    // The payload text is EXPECTED to appear in the output — as escaped,
    // inert, on-screen diagram text (e.g. 'onerror=&quot;...&quot;' is just a
    // visible label, not a live attribute) — these assertions check for the
    // raw, unescaped constructs specifically, not the substrings in general.
    const payload = '"><script>alert(1)</script><image href="javascript:alert(2)" onerror="alert(3)"/>';
    const { svg } = renderCanvas({
      shapes: [
        {
          id: 'a',
          shapeType: 'rectangle',
          x: 0,
          y: 0,
          width: 80,
          height: 40,
          text: payload,
          fillColor: '#fff',
          strokeColor: '#000',
          strokeWidth: 1,
          layerGroup: 'default',
          orderKey: 'a',
          isVisible: true,
          isLocked: false,
        },
      ],
      frames: [],
      swimlanes: [],
      links: [],
    } as unknown as Parameters<typeof renderCanvas>[0]);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<image ');
    expect(svg).not.toContain('onerror="'); // a real attribute, not the escaped 'onerror=&quot;'
    expect(svg).not.toContain('href="javascript:');
    expect(svg).toContain('&quot;&gt;&lt;script&gt;'); // confirms it round-tripped as inert text, not silently dropped
  });

  it("tags an entity nested in a frame with the frame's id, so dragging the frame can find its children", () => {
    const { svg } = render(`sfl 1.2

Model M {
  Container f {
    kind: frame
    text: "Group"
    layout { position: 0, 0; size: 300, 200 }

    Shape child {
      text: "Inside"
      layout { position: 20, 40; size: 100, 60 }
    }
  }

  Shape outside {
    text: "Outside"
    layout { position: 400, 0; size: 100, 60 }
  }
}
`);
    expect(svg).toMatch(/<rect id="sf-shape-child"[^>]*data-sf-parent-frame="f"/);
    expect(svg).not.toMatch(/<rect id="sf-shape-outside"[^>]*data-sf-parent-frame/);
  });

  it('marks the frame boundary with its corner radius and which corner the title tab squares off', () => {
    const { svg } = render(`sfl 1.2

Model M {
  Container f {
    kind: frame
    text: "Group"
    labelPosition: right
    cornerRadius: 18
    layout { position: 0, 0; size: 300, 200 }
  }
}
`);
    expect(svg).toMatch(/<path id="sf-frame-f"[^>]*data-sf-corner-radius="18"/);
    expect(svg).toMatch(/<path id="sf-frame-f"[^>]*data-sf-square-corner="topRight"/);
  });
});
