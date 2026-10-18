import { describe, expect, it, vi } from 'vitest';
import { createDataSource } from '../src/binding';
import { defineStickyflowDiagram, type StickyflowDiagram } from '../src/runtime/webComponent';

const sfl = `sfl 1.5

DataSource lamp {
  mode: record
  fields {
    on: boolean
  }
}

Model demo {
  Text state {
    text: <- when(lamp.on, "On", "Off")
    layout {
      position: 0, 0
      size: 100, 24
    }
  }
}
`;

const textOf = (element: StickyflowDiagram) => element.shadowRoot?.querySelector('svg')?.textContent ?? '';

describe('<stickyflow-diagram> with data sources', () => {
  it('follows a data source and stops following after it is removed', async () => {
    defineStickyflowDiagram();
    const element = document.createElement('stickyflow-diagram') as StickyflowDiagram;
    element.setAttribute('interactive', '');
    const lamp = createDataSource({ on: false });
    element.source = sfl;
    element.dataSources = { lamp };
    document.body.appendChild(element);
    expect(textOf(element)).toContain('Off');

    lamp.set({ on: true });
    await vi.waitFor(() => expect(textOf(element)).toContain('On'));

    element.remove();
    lamp.set({ on: false });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(textOf(element)).toBe('');
  });
});
