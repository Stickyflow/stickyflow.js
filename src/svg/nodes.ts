import type { RenderNode } from '../renderScene/scene';
import { styleAttrs, transform } from './attributes';
import { contractAttrs } from './contract';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';
import { textSvg } from './text';

function shaderSurfaceSvg(node: Extract<RenderNode, { type: 'shader-surface' }>, defs: SvgDefinitionRegistry): string {
  const rotation = transform(node.rotation, { x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const parameters = xml(JSON.stringify(node.shader.parameters));
  return `<foreignObject id="${defs.elementId(node.id)}"${contractAttrs(node)} data-sf-shader="${xml(node.shader.program)}" data-sf-shader-name="${xml(node.shader.name)}" data-sf-shader-params="${parameters}" data-sf-shader-mask="${node.mask}" x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}"${rotation} pointer-events="none"><canvas xmlns="http://www.w3.org/1999/xhtml" data-sf-shader-canvas="true" style="display:block;width:100%;height:100%;pointer-events:none"></canvas></foreignObject>`;
}

export function nodeSvg(node: RenderNode, defs: SvgDefinitionRegistry): string {
  if (node.type === 'text') {
    return textSvg(node, defs);
  }
  if (node.type === 'shader-surface') {
    return shaderSurfaceSvg(node, defs);
  }
  const attrs = `id="${defs.elementId(node.id)}"${contractAttrs(node)} ${styleAttrs(node, defs)}`;
  if (node.type === 'rect') {
    return `<rect ${attrs} x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}"${node.rx ? ` rx="${num(node.rx)}"` : ''}${transform(node.rotation, { x: node.x + node.width / 2, y: node.y + node.height / 2 })}/>`;
  }
  if (node.type === 'ellipse') {
    return `<ellipse ${attrs} cx="${num(node.cx)}" cy="${num(node.cy)}" rx="${num(node.rx)}" ry="${num(node.ry)}"${transform(node.rotation, { x: node.cx, y: node.cy })}/>`;
  }
  return `<path ${attrs} d="${xml(node.d)}"${transform(node.rotation, node.rotationCenter)}/>`;
}
