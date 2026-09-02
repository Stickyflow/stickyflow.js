import { DOM_CONTRACT_VERSION } from '../domContractVersion';
import type { RenderScene } from '../scene';
import { SvgDefinitionRegistry } from './definitions';
import { num } from './format';
import { nodeSvg } from './nodes';
import type { SvgRenderOptions, SvgRenderResult } from './types';

export function renderSvgDocument(scene: RenderScene, options: SvgRenderOptions = {}): SvgRenderResult {
  const padding = options.padding ?? 16;
  const width = Math.max(1, scene.bounds.maxX - scene.bounds.minX + padding * 2);
  const height = Math.max(1, scene.bounds.maxY - scene.bounds.minY + padding * 2);
  const viewBox = `${num(scene.bounds.minX - padding)} ${num(scene.bounds.minY - padding)} ${num(width)} ${num(height)}`;
  const defs = new SvgDefinitionRegistry(options.idPrefix ? `${options.idPrefix}-` : '');
  const body = scene.nodes.map(node => nodeSvg(node, defs)).join('\n  ');
  const declaration = options.includeXmlDeclaration === false ? '' : '<?xml version="1.0" encoding="UTF-8"?>\n';
  const svg = `${declaration}<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}px" height="${num(height)}px" viewBox="${viewBox}" role="img" data-sf-contract="${DOM_CONTRACT_VERSION}">\n  <defs>${defs.entries.join('')}</defs>\n  ${body}\n</svg>`;
  return { svg, width, height, diagnostics: scene.diagnostics };
}
