import { beforeEach, describe, expect, it } from 'vitest';
import type { PropertyChangeEvent } from '../src/runtime/interaction/events';
import { bindEditing } from '../src/runtime/interaction/index';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

function stubGeometry(node: SVGGraphicsElement): void {
  Object.defineProperty(node, 'getBBox', {
    value: () => ({ x: 0, y: 0, width: 60, height: 14 }),
  });
  Object.defineProperty(node, 'getScreenCTM', { value: () => null });
}

function chartNode(svg: SVGSVGElement, tag: string, prop: string, text: string): SVGGraphicsElement {
  const node = document.createElementNS(SVG_NS, tag) as SVGGraphicsElement;
  node.setAttribute('data-sf-role', 'chart');
  node.setAttribute('data-sf-id', 'c');
  node.setAttribute('data-sf-prop', prop);
  node.setAttribute('font-size', '12');
  node.textContent = text;
  stubGeometry(node);
  svg.appendChild(node);
  return node;
}

const dblclick = (node: Element): void => {
  node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
};

const editor = (): HTMLTextAreaElement | null => document.querySelector('textarea');

describe('bindPropertyEditing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is not bound unless the host asks for it', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer);
    dblclick(chartNode(svg, 'text', 'Series[online].label', 'Online'));
    expect(editor()).toBeNull();
  });

  it('opens an editor seeded with the current text', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    dblclick(chartNode(svg, 'text', 'Series[online].label', 'Online'));
    expect(editor()?.value).toBe('Online');
  });

  it('emits the path and the new value on commit', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    dblclick(chartNode(svg, 'text', 'Series[online].label', 'Online'));
    const textarea = editor();
    if (!textarea) {
      throw new Error('no editor');
    }
    textarea.value = 'Web';
    textarea.dispatchEvent(new Event('blur'));

    expect(seen).toEqual([
      {
        owner: { role: 'chart', id: 'c', kind: undefined, label: undefined },
        path: 'Series[online].label',
        value: 'Web',
      },
    ]);
    expect(editor()).toBeNull();
  });

  it('stays silent when the text is unchanged', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    dblclick(chartNode(svg, 'text', 'text', 'Revenue'));
    editor()?.dispatchEvent(new Event('blur'));
    expect(seen).toEqual([]);
  });

  it('discards the edit on Escape', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    dblclick(chartNode(svg, 'text', 'text', 'Revenue'));
    const textarea = editor();
    if (!textarea) {
      throw new Error('no editor');
    }
    textarea.value = 'Umsatz';
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(seen).toEqual([]);
    expect(editor()).toBeNull();
  });

  it('commits on Enter', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    dblclick(chartNode(svg, 'text', 'Axis[y].label', 'k€'));
    const textarea = editor();
    if (!textarea) {
      throw new Error('no editor');
    }
    textarea.value = 'Umsatz';
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(seen.map(event => event.value)).toEqual(['Umsatz']);
  });

  it('ignores nodes that are not text, even when they carry a path', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    dblclick(chartNode(svg, 'rect', 'Series[online].color', ''));
    expect(editor()).toBeNull();
  });

  it('ignores nodes without a path', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const node = document.createElementNS(SVG_NS, 'text');
    node.setAttribute('data-sf-role', 'chart');
    node.setAttribute('data-sf-id', 'c');
    svg.appendChild(node);
    dblclick(node);
    expect(editor()).toBeNull();
  });
});

describe('bindPropertyEditing — the editable whitelist', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const open = (editable: NonNullable<Parameters<typeof bindEditing>[1]>['properties'], prop: string) => {
    document.body.innerHTML = '';
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: editable });
    dblclick(chartNode(svg, 'text', prop, 'x'));
    return editor();
  };

  it('allows a matching wildcard pattern', () => {
    expect(open({ editable: { 'Series[*].label': true } }, 'Series[online].label')).not.toBeNull();
  });

  it('refuses a path no pattern allows', () => {
    expect(open({ editable: { 'Series[*].label': true } }, 'text')).toBeNull();
  });

  it('lets a false pattern veto a broader true one', () => {
    expect(open({ editable: { '**': true, text: false } }, 'text')).toBeNull();
  });

  it('keeps the rest editable when one path is vetoed', () => {
    expect(open({ editable: { '**': true, text: false } }, 'Axis[y].label')).not.toBeNull();
  });

  it('matches every path with a double wildcard', () => {
    expect(open({ editable: { '**': true } }, 'Series[a].values[2]')).not.toBeNull();
  });

  it('matches an index wildcard', () => {
    expect(open({ editable: { 'Series[*].values[*]': true } }, 'Series[a].values[2]')).not.toBeNull();
  });

  it('does not let a wildcard span a separator', () => {
    expect(open({ editable: { 'Series[*]': true } }, 'Series[a].label')).toBeNull();
  });

  it('accepts a predicate', () => {
    expect(open({ editable: path => path.startsWith('Axis') }, 'Axis[x].label')).not.toBeNull();
    expect(open({ editable: path => path.startsWith('Axis') }, 'text')).toBeNull();
  });
});

describe('bindPropertyEditing — lifecycle', () => {
  it('removes its listener on destroy', () => {
    const { viewer, log } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    interaction.destroy();

    const tally = (types: string[]) =>
      types.reduce<Record<string, number>>((counts, type) => {
        counts[type] = (counts[type] ?? 0) + 1;
        return counts;
      }, {});
    expect(tally(log.removed)).toEqual(tally(log.added));
  });

  it('stops opening editors once destroyed', () => {
    document.body.innerHTML = '';
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} }).destroy();
    dblclick(chartNode(svg, 'text', 'text', 'Revenue'));
    expect(editor()).toBeNull();
  });
});
