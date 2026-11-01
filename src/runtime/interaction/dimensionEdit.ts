import { dimensionGeometry } from '../../model/dimension';
import type { Point } from '../../model/geometry/types';
import { DIMENSION_HANDLE_ATTR } from '../../svg/domContract/attributes';
import {
  dimensionGeometryOf,
  findOwnerNode,
  isCameraGesture,
  isPrimary,
  pointerUserPoint,
  pxPerUnit,
  resolveOwner,
  SVG_NAMESPACE,
} from '../dom';
import type { OwnerRef, Viewer } from '../viewer';
import { offsetOf, snapMeasurePoint } from './dimensionSnap';
import type { Emitter } from './events';
import { readSquareSnapStep } from './snapGrid';

export interface DimensionEditHandle {
  destroy(): void;
}

interface Drag {
  owner: OwnerRef;
  node: SVGPathElement;
  overlay: Element;
  handle: Element;
  which: 'start' | 'end' | 'offset';
  start: Point;
  end: Point;
  offset: number;
  label: SVGTextElement;
  pointerId: number;
  moved: boolean;
}

function show(svg: SVGSVGElement, drag: Drag): void {
  const geometry = dimensionGeometry(drag);
  const id = drag.owner.id;
  drag.node.setAttribute(
    'd',
    `M ${geometry.line[0].x} ${geometry.line[0].y} L ${geometry.line[1].x} ${geometry.line[1].y}`,
  );
  svg
    .querySelector(`[data-sf-id="${id}"][id$="-extensions"]`)
    ?.setAttribute('d', geometry.extensions.map(([a, b]) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`).join(' '));
  svg.querySelector(`text[data-sf-id="${id}"]`)?.setAttribute('display', 'none');
  const place = (name: string, point: Point) => {
    const handle = drag.overlay.querySelector(`[${DIMENSION_HANDLE_ATTR}="${name}"]`);
    handle?.setAttribute('cx', String(point.x));
    handle?.setAttribute('cy', String(point.y));
  };
  place('start', drag.start);
  place('end', drag.end);
  place('offset', {
    x: geometry.line[0].x * 0.75 + geometry.line[1].x * 0.25,
    y: geometry.line[0].y * 0.75 + geometry.line[1].y * 0.25,
  });
  const { center, angle } = geometry.label;
  drag.label.setAttribute('x', String(center.x));
  drag.label.setAttribute('y', String(center.y));
  drag.label.setAttribute('transform', `rotate(${angle} ${center.x} ${center.y})`);
  drag.label.textContent = String(Math.round(geometry.length * 10) / 10);
}

// The handles of a selected dimension: its two measured points, and its line, which sets how far it sits from them.
export function bindDimensionEdit(viewer: Viewer, emitter: Emitter): DimensionEditHandle {
  const svg = viewer.svg;
  let drag: Drag | null = null;

  const pointerDown = (event: PointerEvent) => {
    const handle = (event.target as Element | null)?.closest?.(`[${DIMENSION_HANDLE_ATTR}]`);
    const overlay = handle?.closest('[data-sf-selection-overlay]');
    const id = overlay?.getAttribute('data-sf-selection-overlay');
    if (!handle || !overlay || !id || event.button !== 0 || isCameraGesture(event)) {
      return;
    }
    const node = findOwnerNode<SVGPathElement>(svg, id, isPrimary);
    const owner = node && resolveOwner(node);
    const geometry = node && dimensionGeometryOf(node);
    if (!node || !owner || !geometry) {
      return;
    }
    const unit = 1 / pxPerUnit(svg);
    const label = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'text');
    label.setAttribute('fill', '#9b42df');
    label.setAttribute('font-size', String(12 * unit));
    label.setAttribute('font-weight', '600');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    overlay.appendChild(label);
    (handle as SVGGraphicsElement).setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    drag = {
      ...geometry,
      owner,
      node,
      overlay,
      handle,
      which: handle.getAttribute(DIMENSION_HANDLE_ATTR) as Drag['which'],
      label,
      pointerId: event.pointerId,
      moved: false,
    };
  };

  const pointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const raw = pointerUserPoint(svg, event);
    if (!raw) {
      return;
    }
    drag.moved = true;
    if (drag.which === 'offset') {
      const step = readSquareSnapStep(svg) ?? 1;
      drag.offset = Math.round(offsetOf(drag.start, drag.end, raw) / step) * step;
    } else {
      drag[drag.which] = snapMeasurePoint(svg, raw, drag.owner.id).point;
    }
    show(svg, drag);
  };

  const pointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const { owner, start, end, offset, moved, label } = drag;
    drag = null;
    label.remove();
    if (moved) {
      emitter.emit('dimensionChange', { owner, start, end, offset });
    }
  };

  svg.addEventListener('pointerdown', pointerDown, { capture: true });
  svg.addEventListener('pointermove', pointerMove);
  svg.addEventListener('pointerup', pointerUp);
  return {
    destroy() {
      drag = null;
      svg.removeEventListener('pointerdown', pointerDown, { capture: true });
      svg.removeEventListener('pointermove', pointerMove);
      svg.removeEventListener('pointerup', pointerUp);
    },
  };
}
