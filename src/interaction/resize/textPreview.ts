import { SVG_NAMESPACE } from '../../domContract';
import type { Rect } from '../../model/geometry/router';
import { wrapText } from '../../model/geometry/text';
import { recenterRotation } from './rotation';

function replaceTextLines(textElement: SVGTextElement, lines: string[], x: number, lineHeight: number): void {
  while (textElement.firstChild) {
    textElement.removeChild(textElement.firstChild);
  }
  lines.forEach((line, index) => {
    const tspan = document.createElementNS(SVG_NAMESPACE, 'tspan');
    tspan.setAttribute('x', String(x));
    if (index > 0) {
      tspan.setAttribute('dy', `${lineHeight}px`);
    }
    tspan.textContent = line;
    textElement.appendChild(tspan);
  });
}

export function applyLiveText(textElement: SVGTextElement, rawText: string, bounds: Rect, strokeWidth: number): void {
  const fontSize = parseFloat(textElement.getAttribute('font-size') || '14');
  const anchor = textElement.getAttribute('text-anchor');
  const align: 'left' | 'center' | 'right' = anchor === 'start' ? 'left' : anchor === 'end' ? 'right' : 'center';
  const verticalAlign = (textElement.getAttribute('data-sf-valign') as 'top' | 'middle' | 'bottom' | null) ?? 'middle';
  const lineHeight = Number(textElement.getAttribute('data-sf-line-height')) || 1.3;
  const padding = Math.max(8, strokeWidth * 2);
  const width = Math.max(0, bounds.width - padding * 2);
  const height = Math.max(0, bounds.height - padding * 2);
  const boxX = bounds.x + padding;
  const boxY = bounds.y + padding;
  const lines = wrapText(rawText, width, fontSize);
  const linePixels = fontSize * lineHeight;
  const contentHeight = lines.length * linePixels;
  const firstY =
    verticalAlign === 'top'
      ? boxY + fontSize
      : verticalAlign === 'bottom'
        ? boxY + height - contentHeight + fontSize
        : boxY + (height - contentHeight) / 2 + fontSize;
  const x = align === 'left' ? boxX : align === 'right' ? boxX + width : boxX + width / 2;

  textElement.setAttribute('x', String(x));
  textElement.setAttribute('y', String(firstY));
  replaceTextLines(textElement, lines, x, linePixels);
  recenterRotation(textElement, bounds);
}
