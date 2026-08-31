import type { RenderNode, SceneImage } from '../renderScene';
import { styleAttrs, transform } from './attributes';
import { contractAttrs } from './contract';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';
import { textSvg } from './text';

export function imageSvg(node: SceneImage, defs: SvgDefinitionRegistry): string {
  const opacity = node.opacity !== undefined ? ` opacity="${num(node.opacity)}"` : '';
  const rotationCenter = node.rotationCenter ?? { x: node.x + node.width / 2, y: node.y + node.height / 2 };
  return `<image id="${defs.elementId(node.id)}"${contractAttrs(node)} href="${xml(node.href)}" x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}" preserveAspectRatio="${xml(node.preserveAspectRatio)}"${opacity}${transform(node.rotation, rotationCenter)}/>`;
}

export function nodeSvg(node: RenderNode, defs: SvgDefinitionRegistry): string {
  if (node.type === 'text') {
    return textSvg(node, defs);
  }
  if (node.type === 'image') {
    return imageSvg(node, defs);
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
