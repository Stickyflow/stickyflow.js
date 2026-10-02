import type { RenderScene } from '../../renderScene/scene';

export interface SvgRenderOptions {
  padding?: number;
  includeXmlDeclaration?: boolean;
  idPrefix?: string;
}

export interface SvgRenderResult {
  svg: string;
  width: number;
  height: number;
  diagnostics: RenderScene['diagnostics'];
}
