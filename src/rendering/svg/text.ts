import type { SceneText } from '../scene';
import { transform } from './attributes';
import { contractAttrs } from './contract';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';

function richLineTspans(
  words: Array<{ text: string; bold: boolean }>,
  x: number,
  dy: string,
  fontSize: string,
): string {
  if (!words.length) {
    return `<tspan x="${num(x)}"${dy} font-size="${fontSize}"></tspan>`;
  }
  const groups: Array<{ text: string; bold: boolean }> = [];
  for (const word of words) {
    const prev = groups[groups.length - 1];
    if (prev && prev.bold === word.bold) {
      prev.text += ` ${word.text}`;
    } else {
      if (prev) {
        prev.text += ' ';
      }
      groups.push({ text: word.text, bold: word.bold });
    }
  }
  return groups
    .map(
      (group, i) =>
        `<tspan${i === 0 ? ` x="${num(x)}"${dy}` : ''} font-size="${fontSize}" font-weight="${group.bold ? 'bold' : 'normal'}">${xml(group.text)}</tspan>`,
    )
    .join('');
}

export function textSvg(node: SceneText, defs: SvgDefinitionRegistry): string {
  const linePx = node.fontSize * node.lineHeight;
  const lineCount = node.richLines ? node.richLines.length : node.lines.length;
  const contentHeight = lineCount * linePx;
  const firstY =
    node.verticalAlign === 'top'
      ? node.y + node.fontSize
      : node.verticalAlign === 'bottom'
        ? node.y + node.height - contentHeight + node.fontSize
        : node.y + (node.height - contentHeight) / 2 + node.fontSize;
  const x = node.align === 'left' ? node.x : node.align === 'right' ? node.x + node.width : node.x + node.width / 2;
  const anchor = node.align === 'left' ? 'start' : node.align === 'right' ? 'end' : 'middle';
  const fontSize = `${num(node.fontSize)}px`;
  const preserve = node.richLines ? ' xml:space="preserve"' : '';
  const body = node.richLines
    ? node.richLines.map((words, i) => richLineTspans(words, x, i ? ` dy="${num(linePx)}px"` : '', fontSize)).join('')
    : node.lines
        .map(
          (line, i) =>
            `<tspan x="${num(x)}" font-size="${fontSize}"${i ? ` dy="${num(linePx)}px"` : ''}>${xml(line)}</tspan>`,
        )
        .join('');
  return `<text id="${defs.elementId(node.id)}"${contractAttrs(node)} x="${num(x)}" y="${num(firstY)}" font-family="${xml(node.fontFamily)}" font-size="${fontSize}" font-weight="${node.fontWeight}" fill="${xml(node.color)}" text-anchor="${anchor}" data-sf-valign="${node.verticalAlign}" data-sf-line-height="${num(node.lineHeight)}"${preserve}${transform(node.rotation, node.rotationCenter)}>${body}</text>`;
}
