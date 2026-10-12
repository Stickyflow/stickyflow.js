import { type RenderOptions, render } from '../../render';
import { isContractCompatible, parseContractVersion } from '../dom';
import type { ViewerSource } from './types';

export function renderViewerSource(next: ViewerSource, defaultRenderOptions?: RenderOptions): string {
  const svg =
    next.svg ??
    (next.source != null
      ? render(next.source, { ...(next.renderOptions ?? defaultRenderOptions), linkHitAreas: true }).svg
      : null);
  if (svg == null) {
    throw new Error('createViewer: provide either `source` (SFL) or `svg`.');
  }
  return svg;
}

export function assertCreateViewerContract(svg: string): void {
  const version = parseContractVersion(svg);
  if (!isContractCompatible(version)) {
    throw new Error(`createViewer: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`);
  }
}

export function assertViewerUpdateContract(svg: string): void {
  const version = parseContractVersion(svg);
  if (!isContractCompatible(version)) {
    throw new Error(`viewer.update: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`);
  }
}
