import { DEFAULT_ROLLING_NUMBER_STYLE, type RollingNumberWidgetStyle } from '../../../model/widget';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function copyAttributes(source: Element, target: Element): void {
  for (const attribute of source.attributes) {
    if (!attribute.name.startsWith('data-sf-shader')) {
      target.setAttribute(attribute.name, attribute.value);
    }
  }
}

function removeRuntimeOverlays(svg: SVGSVGElement): void {
  for (const overlay of svg.querySelectorAll(
    '[data-sf-selection-overlay], [data-sf-change-overlay], [id*="link-hit-"]',
  )) {
    overlay.remove();
  }
}

function svgElement(document: Document, name: string, attributes: Record<string, string | number>): SVGElement {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function readWidgetStyle(surface: Element): Required<RollingNumberWidgetStyle> {
  try {
    return {
      ...DEFAULT_ROLLING_NUMBER_STYLE,
      ...(JSON.parse(surface.getAttribute('data-sf-widget-style') ?? '{}') as RollingNumberWidgetStyle),
    };
  } catch {
    return DEFAULT_ROLLING_NUMBER_STYLE;
  }
}

interface Cells {
  size: number;
  plain: boolean;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function cellsOf(box: Box, plain: boolean): Cells {
  const size = Math.max(1, Math.min(box.width, box.height) * 0.28);
  return {
    size,
    plain,
    cellWidth: plain ? size * 0.62 : size * 0.72 + 2,
    cellHeight: plain ? size * 1.1 : size * 1.2 + 2,
    gap: size * (plain ? 0.02 : 0.1),
  };
}

function groupOf(document: Document, surface: Element, style: Required<RollingNumberWidgetStyle>): SVGElement {
  const group = svgElement(document, 'g', { 'font-family': style.fontFamily });
  for (const attribute of ['id', 'transform', 'data-sf-id', 'data-sf-role', 'data-sf-kind']) {
    const attributeValue = surface.getAttribute(attribute);
    if (attributeValue !== null) {
      group.setAttribute(attribute, attributeValue);
    }
  }
  return group;
}

function labelText(
  document: Document,
  label: string,
  box: Box,
  top: number,
  cells: Cells,
  style: Required<RollingNumberWidgetStyle>,
): SVGElement {
  const text = svgElement(document, 'text', {
    x: box.x + box.width / 2,
    y: top - cells.size * 0.14,
    'text-anchor': 'middle',
    'font-size': cells.size * 0.16,
    'font-weight': 600,
    'letter-spacing': cells.size * 0.04,
    fill: style.labelColor,
  });
  text.textContent = label;
  return text;
}

function digitCell(
  document: Document,
  character: string,
  cellX: number,
  top: number,
  cells: Cells,
  style: Required<RollingNumberWidgetStyle>,
): SVGElement[] {
  const { size, plain, cellWidth, cellHeight } = cells;
  const nodes: SVGElement[] = [];
  if (!plain) {
    nodes.push(
      svgElement(document, 'rect', {
        x: cellX + 0.5,
        y: top + 0.5,
        width: cellWidth - 1,
        height: cellHeight - 1,
        rx: size * 0.09,
        fill: style.surface,
        stroke: style.divider,
        'stroke-width': 1,
      }),
    );
  }
  const digit = svgElement(document, 'text', {
    x: cellX + cellWidth / 2,
    y: top + cellHeight / 2,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
    'font-size': size,
    'font-weight': style.fontWeight,
    fill: style.color,
  });
  digit.textContent = character;
  nodes.push(digit);
  if (!plain) {
    nodes.push(
      svgElement(document, 'line', {
        x1: cellX + 0.5,
        x2: cellX + cellWidth - 0.5,
        y1: top + cellHeight / 2,
        y2: top + cellHeight / 2,
        stroke: style.divider,
        'stroke-width': 1,
      }),
    );
  }
  return nodes;
}

function flattenRollingNumbers(svg: SVGSVGElement): void {
  const document = svg.ownerDocument;
  for (const surface of svg.querySelectorAll('foreignObject[data-sf-widget="rollingNumber"]')) {
    const box: Box = {
      x: Number(surface.getAttribute('x')),
      y: Number(surface.getAttribute('y')),
      width: Number(surface.getAttribute('width')),
      height: Number(surface.getAttribute('height')),
    };
    const value = surface.getAttribute('data-sf-widget-value') ?? '';
    const style = readWidgetStyle(surface);
    const label = surface.querySelector('div > span:not([data-sf-rolling-digit])')?.textContent ?? '';
    const cells = cellsOf(box, style.variant === 'plain');
    const labelBlock = label ? cells.size * 0.3 : 0;
    const rowWidth = value.length * cells.cellWidth + Math.max(0, value.length - 1) * cells.gap;
    const left = box.x + (box.width - rowWidth) / 2;
    const top = box.y + (box.height - (labelBlock + cells.cellHeight)) / 2 + labelBlock;
    const group = groupOf(document, surface, style);
    if (label) {
      group.appendChild(labelText(document, label, box, top, cells, style));
    }
    [...value].forEach((character, index) => {
      const cellX = left + index * (cells.cellWidth + cells.gap);
      for (const node of digitCell(document, character, cellX, top, cells, style)) {
        group.appendChild(node);
      }
    });
    surface.replaceWith(group);
  }
}

export function freezeShaderSurfaces(svg: SVGSVGElement, captures: readonly (string | undefined)[]): SVGSVGElement {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  removeRuntimeOverlays(clone);
  const surfaces = [...clone.querySelectorAll<SVGForeignObjectElement>('foreignObject[data-sf-shader]')];
  surfaces.forEach((surface, index) => {
    const capture = captures[index];
    if (!capture) {
      surface.remove();
      return;
    }
    const image = clone.ownerDocument.createElementNS(SVG_NAMESPACE, 'image');
    copyAttributes(surface, image);
    image.setAttribute('href', capture);
    image.setAttribute('preserveAspectRatio', 'none');
    surface.replaceWith(image);
  });
  flattenRollingNumbers(clone);
  const viewBox = (clone.getAttribute('viewBox') ?? '').split(/\s+/).map(Number);
  if (viewBox.length === 4 && viewBox.every(Number.isFinite)) {
    clone.setAttribute('width', String(viewBox[2]));
    clone.setAttribute('height', String(viewBox[3]));
  }
  clone.setAttribute('xmlns', SVG_NAMESPACE);
  return clone;
}

export function serializeSvgSnapshot(svg: SVGSVGElement, captures: readonly (string | undefined)[]): string {
  return new XMLSerializer().serializeToString(freezeShaderSurfaces(svg, captures));
}
