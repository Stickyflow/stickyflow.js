import type { OwnerRef } from '../src/runtime/dom';
import type { Viewer, ViewerSource } from '../src/runtime/viewer';

export interface ListenerLog {
  added: string[];
  removed: string[];
}

export interface FakeViewer {
  viewer: Viewer;
  svg: SVGSVGElement;
  log: ListenerLog;
  setSelection(owners: OwnerRef[]): void;
}

export function createFakeViewer(): FakeViewer {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.appendChild(svg);

  const log: ListenerLog = { added: [], removed: [] };
  const nativeAdd = svg.addEventListener.bind(svg);
  const nativeRemove = svg.removeEventListener.bind(svg);
  svg.addEventListener = ((type: string, handler: EventListener, options?: unknown) => {
    log.added.push(type);
    nativeAdd(type, handler, options as AddEventListenerOptions);
  }) as typeof svg.addEventListener;
  svg.removeEventListener = ((type: string, handler: EventListener, options?: unknown) => {
    log.removed.push(type);
    nativeRemove(type, handler, options as EventListenerOptions);
  }) as typeof svg.removeEventListener;

  let selection: OwnerRef[] = [];

  const viewer: Viewer = {
    svg,
    on: () => () => undefined,
    getSelection: () => selection,
    select: () => undefined,
    fit: () => undefined,
    getViewport: () => ({ x: 0, y: 0, w: 100, h: 100 }),
    exportSvg: () => '<svg xmlns="http://www.w3.org/2000/svg"/>',
    exportImage: async () => new Blob(),
    setShaderParameters: () => false,
    setWidgetValue: () => false,
    update: (_next: ViewerSource) => undefined,
    destroy: () => undefined,
  };

  return {
    viewer,
    svg,
    log,
    setSelection(owners: OwnerRef[]) {
      selection = owners;
    },
  };
}
