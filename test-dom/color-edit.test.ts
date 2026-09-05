import { beforeEach, describe, expect, it } from 'vitest';
import type { PropertyChangeEvent } from '../src/interaction/events';
import { bindEditing } from '../src/interaction/index';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

function swatch(svg: SVGSVGElement, fill: string | null): SVGGraphicsElement {
  const node = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  node.setAttribute('data-sf-role', 'chart');
  node.setAttribute('data-sf-id', 'c');
  node.setAttribute('data-sf-prop', 'Series[online].color');
  node.setAttribute('data-sf-prop-kind', 'color');
  if (fill) {
    node.setAttribute('fill', fill);
  }
  svg.appendChild(node);
  return node;
}

const click = (node: Element) => {
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const picker = (): HTMLInputElement | null => document.querySelector('input[type="color"]');

describe('clicking a legend swatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is not bound unless the host asks for property editing', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer);
    click(swatch(svg, '#6d5ef0'));
    expect(picker()).toBeNull();
  });

  it('opens a native color picker seeded with the series color', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    expect(picker()?.value).toBe('#6d5ef0');
  });

  it('falls back to a neutral seed for a gradient fill, rather than black', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, 'url(#chart-gradient-c-online)'));
    expect(picker()?.value).not.toBe('#000000');
  });

  it('emits the property path and the picked color on change', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    click(swatch(svg, '#6d5ef0'));
    const input = picker();
    if (!input) {
      throw new Error('no picker');
    }
    input.value = '#db2777';
    input.dispatchEvent(new Event('change'));

    expect(seen).toEqual([
      {
        owner: { role: 'chart', id: 'c', kind: undefined, label: undefined },
        path: 'Series[online].color',
        value: '#db2777',
      },
    ]);
  });

  it('removes the picker after it commits', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    picker()?.dispatchEvent(new Event('change'));
    expect(picker()).toBeNull();
  });

  it('removes the picker if dismissed without a choice', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    picker()?.dispatchEvent(new Event('blur'));
    expect(picker()).toBeNull();
  });

  it('honours the editable whitelist', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: { editable: { 'Series[*].label': true } } });
    click(swatch(svg, '#6d5ef0'));
    expect(picker()).toBeNull();
  });

  it('ignores a click on a node without the color prop kind', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const node = document.createElementNS(SVG_NS, 'rect');
    node.setAttribute('data-sf-role', 'chart');
    node.setAttribute('data-sf-id', 'c');
    node.setAttribute('data-sf-prop', 'Series[online].values[0]');
    node.setAttribute('data-sf-prop-kind', 'value');
    svg.appendChild(node);
    click(node);
    expect(picker()).toBeNull();
  });
});

describe('color edit — lifecycle', () => {
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

  it('stops opening pickers once destroyed', () => {
    document.body.innerHTML = '';
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} }).destroy();
    click(swatch(svg, '#6d5ef0'));
    expect(picker()).toBeNull();
  });
});
