import type { RenderScene } from '../renderScene/scene';

export interface SvgRenderOptions {
  padding?: number;
  includeXmlDeclaration?: boolean;
  idPrefix?: string;
  /** Adds invisible wide strokes under links so they are easy to hit. Meant for the interactive viewer. */
  linkHitAreas?: boolean;
}

export interface SvgRenderResult {
  svg: string;
  width: number;
  height: number;
  diagnostics: RenderScene['diagnostics'];
}
