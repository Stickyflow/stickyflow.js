import type { SceneText } from '../../renderScene/scene';
import { transform } from './attributes';
import { contractAttrs } from './contract';
import type { SvgDefinitionRegistry } from './definitions';
import { num, xml } from './format';

type TextPosition = {
  x: number;
  firstY: number;
  linePx: number;
  anchor: 'start' | 'middle' | 'end';
};

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
  const position = textPosition(node);
  const fontSize = `${num(node.fontSize)}px`;
  const content = textContent(node, position, fontSize);
  const preserve = node.richLines ? ' xml:space="preserve"' : '';
  return `<text id="${defs.elementId(node.id)}"${contractAttrs(node)} x="${num(position.x)}" y="${num(position.firstY)}" font-family="${xml(node.fontFamily)}" font-size="${fontSize}" font-weight="${node.fontWeight}" fill="${xml(node.color)}" text-anchor="${position.anchor}" data-sf-valign="${node.verticalAlign}" data-sf-line-height="${num(node.lineHeight)}"${preserve}${transform(node.rotation, node.rotationCenter)}>${content}</text>`;
}

function textPosition(node: SceneText): TextPosition {
  const linePx = node.fontSize * node.lineHeight;
  const lineCount = node.richLines ? node.richLines.length : node.lines.length;
  const contentHeight = lineCount * linePx;
  const x = node.align === 'left' ? node.x : node.align === 'right' ? node.x + node.width : node.x + node.width / 2;
  const anchor = node.align === 'left' ? 'start' : node.align === 'right' ? 'end' : 'middle';
  return { x, firstY: firstTextBaseline(node, contentHeight), linePx, anchor };
}

function firstTextBaseline(node: SceneText, contentHeight: number): number {
  if (node.verticalAlign === 'top') {
    return node.y + node.fontSize;
  }
  if (node.verticalAlign === 'bottom') {
    return node.y + node.height - contentHeight + node.fontSize;
  }
  return node.y + (node.height - contentHeight) / 2 + node.fontSize;
}

function textContent(node: SceneText, position: TextPosition, fontSize: string): string {
  if (node.richLines) {
    return node.richLines
      .map((words, index) => richLineTspans(words, position.x, lineOffset(index, position.linePx), fontSize))
      .join('');
  }
  return node.lines.map((line, index) => lineTspan(line, index, position, fontSize)).join('');
}

function lineTspan(line: string, index: number, position: TextPosition, fontSize: string): string {
  return `<tspan x="${num(position.x)}" font-size="${fontSize}"${lineOffset(index, position.linePx)}>${xml(line)}</tspan>`;
}

function lineOffset(index: number, linePx: number): string {
  return index ? ` dy="${num(linePx)}px"` : '';
}
