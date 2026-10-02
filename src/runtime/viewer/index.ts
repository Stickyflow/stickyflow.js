import { ViewerSession } from './session';
import { assertCreateViewerContract, renderViewerSource } from './source';
import type { Viewer, ViewerOptions } from './types';

export function createViewer(options: ViewerOptions): Viewer {
  const diagramId = options.diagramId ?? 'diagram';
  const svg = renderViewerSource(options, options.renderOptions);
  assertCreateViewerContract(svg);
  const viewer = new ViewerSession(options, svg, diagramId);
  viewer.announceReady();
  return viewer;
}

export type { SceneDiff, ViewBox } from './display';
export type {
  Modifiers,
  OwnerPointerEvent,
  OwnerRef,
  SceneDiffEvent,
  SelectionChangeEvent,
  Unsubscribe,
  ViewerErrorEvent,
  ViewerEventHandler,
  ViewerEventMap,
  ViewerEventName,
} from './events';
export type { Viewer, ViewerOptions, ViewerSource } from './types';
