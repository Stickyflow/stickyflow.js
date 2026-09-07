import { findOwnerNode, isCameraGesture, isPrimary, resolveOwner } from '../../domContract';
import { parseValueScale } from './scale';
import type { ChartValueDragState, ValueScale } from './types';

type ChartValueTarget = Pick<ChartValueDragState, 'owner' | 'series' | 'index'>;

type ChartValueGeometry = Pick<ChartValueDragState, 'element' | 'baseY' | 'isBar' | 'barX' | 'barWidth' | 'barRadius'>;

function chartGeometry(svg: SVGSVGElement, target: ChartValueTarget): SVGGraphicsElement | null {
  const selector =
    `[data-sf-id="${CSS.escape(target.owner.id)}"]` +
    `[data-sf-series="${CSS.escape(target.series)}"]` +
    `[data-sf-value-index="${target.index}"]`;
  return (
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].find(element => {
      const tag = element.tagName.toLowerCase();
      return tag === 'rect' || tag === 'ellipse' || tag === 'path';
    }) ?? null
  );
}

export function resolveChartValueDrag(svg: SVGSVGElement, event: PointerEvent): ChartValueDragState | null {
  if (!isChartValuePointer(event)) {
    return null;
  }
  const mark = findChartValueMark(event);
  if (!mark) {
    return null;
  }
  const target = readChartValueTarget(mark);
  if (!target) {
    return null;
  }
  const scale = parseValueScale(findOwnerNode(svg, target.owner.id, isPrimary));
  const geometry = scale ? resolveChartValueGeometry(svg, target, scale) : null;
  if (!scale || !geometry) {
    return null;
  }
  mark.setPointerCapture?.(event.pointerId);
  return createChartValueDragState(target, scale, geometry, event.pointerId);
}

function createChartValueDragState(
  target: ChartValueTarget,
  scale: ValueScale,
  geometry: ChartValueGeometry,
  pointerId: number,
): ChartValueDragState {
  return {
    owner: target.owner,
    series: target.series,
    index: target.index,
    scale,
    ...geometry,
    pointerId,
    moved: false,
  };
}

function isChartValuePointer(event: PointerEvent): boolean {
  return event.button === 0 && !isCameraGesture(event);
}

function findChartValueMark(event: PointerEvent): SVGGraphicsElement | null {
  return (event.target as Element | null)?.closest?.('[data-sf-value-index]') as SVGGraphicsElement | null;
}

function readChartValueTarget(mark: SVGGraphicsElement): ChartValueTarget | null {
  const owner = resolveOwner(mark);
  if (owner?.role !== 'chart') {
    return null;
  }
  const series = mark.getAttribute('data-sf-series');
  const index = Number(mark.getAttribute('data-sf-value-index'));
  if (!series || !Number.isInteger(index)) {
    return null;
  }
  return { owner, series, index };
}

function resolveChartValueGeometry(
  svg: SVGSVGElement,
  target: ChartValueTarget,
  scale: ValueScale,
): ChartValueGeometry | null {
  const element = chartGeometry(svg, target);
  if (!element) {
    return null;
  }
  const isBar = element.getAttribute('data-sf-mark') === 'bar';
  // A bar's rest geometry lives in its rendered path, not in x/y/width/height
  // attributes a path doesn't have - getBBox() reads the same numbers back,
  // since barShapePath's rounded corners never extend past that box.
  const bbox = isBar ? element.getBBox() : null;
  const baseY = bbox ? bbox.y + bbox.height : scale.plotY + scale.plotHeight;
  if (!Number.isFinite(baseY)) {
    return null;
  }
  return {
    element,
    baseY,
    isBar,
    barX: bbox?.x ?? 0,
    barWidth: bbox?.width ?? 0,
    barRadius: isBar ? Number(element.getAttribute('data-sf-bar-radius')) || 0 : 0,
  };
}
