import type { RenderNode } from '../renderScene/scene';
import { imageAttrs, styleAttrs, transform } from './attributes';
import { contractAttrs } from './contract';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';
import { textSvg } from './text';

function shaderSurfaceSvg(node: Extract<RenderNode, { type: 'shader-surface' }>, defs: SvgDefinitionRegistry): string {
  const rotation = transform(node.rotation, { x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const parameters = xml(JSON.stringify(node.shader.parameters));
  const fillColor = node.fillColor ? ` data-sf-shader-fill="${xml(node.fillColor)}"` : '';
  return `<foreignObject id="${defs.elementId(node.id)}"${contractAttrs(node)} data-sf-shader="${xml(node.shader.program)}" data-sf-shader-name="${xml(node.shader.name)}" data-sf-shader-params="${parameters}" data-sf-shader-mask="${node.mask}"${fillColor} x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}"${rotation} pointer-events="none"><canvas xmlns="http://www.w3.org/1999/xhtml" data-sf-shader-canvas="true" style="display:block;width:100%;height:100%;pointer-events:none"></canvas></foreignObject>`;
}

function rollingDigitSvg(character: string, node: Extract<RenderNode, { type: 'rolling-number' }>): string {
  const style = node.widgetStyle;
  if (style.variant === 'plain') {
    return `<span xmlns="http://www.w3.org/1999/xhtml" data-sf-rolling-digit="true" style="position:relative;display:inline-block;width:.62em;height:1.1em;overflow:hidden"><span data-sf-rolling-current="true" style="position:absolute;inset:0;display:grid;place-items:center;color:${xml(style.color)};font-weight:${xml(style.fontWeight)};line-height:1">${xml(character)}</span></span>`;
  }
  return `<span xmlns="http://www.w3.org/1999/xhtml" data-sf-rolling-digit="true" style="position:relative;display:inline-block;width:.72em;height:1.2em;overflow:hidden;border:1px solid ${xml(style.divider)};border-radius:.09em;background:${xml(style.surface)};box-shadow:inset 0 1px 0 rgba(255,255,255,.7),inset 0 -.16em .38em rgba(0,0,0,.12)"><span data-sf-rolling-current="true" style="position:absolute;inset:0;display:grid;place-items:center;color:${xml(style.color)};font-weight:300;line-height:1">${xml(character)}</span><span style="position:absolute;z-index:2;left:0;right:0;top:50%;height:1px;background:${xml(style.divider)};pointer-events:none"></span></span>`;
}

function rollingNumberSvg(node: Extract<RenderNode, { type: 'rolling-number' }>, defs: SvgDefinitionRegistry): string {
  const rotation = transform(node.rotation, { x: node.x + node.width / 2, y: node.y + node.height / 2 });
  const fontSize = Math.max(1, Math.min(node.width, node.height) * 0.28);
  const label = node.label
    ? `<span xmlns="http://www.w3.org/1999/xhtml" style="margin-bottom:.14em;color:${xml(node.widgetStyle.labelColor)};font-size:.16em;font-weight:600;letter-spacing:.24em;line-height:1">${xml(node.label)}</span>`
    : '';
  const digits = [...node.value].map(character => rollingDigitSvg(character, node)).join('');
  const widgetStyle = xml(JSON.stringify(node.widgetStyle));
  return `<foreignObject id="${defs.elementId(node.id)}"${contractAttrs(node)} data-sf-widget="rollingNumber" data-sf-widget-value="${xml(node.value)}" data-sf-widget-digits="${node.digits ?? ''}" data-sf-widget-duration="${num(node.duration)}" data-sf-widget-style="${widgetStyle}" x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}"${rotation}><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${xml(node.widgetStyle.fontFamily)};font-size:${num(fontSize)}px">${label}<div data-sf-rolling-digits="true" aria-label="${xml(node.value)}" style="display:flex;gap:${node.widgetStyle.variant === 'plain' ? '.02em' : '.1em'};font-size:1em">${digits}</div></div></foreignObject>`;
}

export function nodeSvg(node: RenderNode, defs: SvgDefinitionRegistry): string {
  if (node.type === 'text') {
    return textSvg(node, defs);
  }
  if (node.type === 'shader-surface') {
    return shaderSurfaceSvg(node, defs);
  }
  if (node.type === 'rolling-number') {
    return rollingNumberSvg(node, defs);
  }
  if (node.type === 'image') {
    return `<image id="${defs.elementId(node.id)}"${contractAttrs(node)} ${imageAttrs(node, defs)} href="${xml(node.href)}" x="${num(node.x)}" y="${num(node.y)}" width="${num(node.width)}" height="${num(node.height)}" preserveAspectRatio="xMidYMid slice"/>`;
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
