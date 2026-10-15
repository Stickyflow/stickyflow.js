import type { ChartBase } from '../../../model/chart';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeShadow } from '../../styleDecoding';
import { numOf, solidColor } from './values';

function decodeImageFill(source: string | undefined): { url: string; overlay?: string } | undefined {
  const match = source?.match(/^image\(\s*([^,)]+?)\s*(?:,\s*(.+?))?\s*\)$/);
  return match ? { url: match[1], overlay: match[2] } : undefined;
}

export function chartBase(e: SflCanvasObject): ChartBase {
  const p = e.props;
  const gridShape: 'rect' | 'circle' = p.gridShape === 'circle' ? 'circle' : 'rect';
  const gridLineStyle: 'solid' | 'dashed' | 'dotted' =
    p.gridLineStyle === 'dashed' ? 'dashed' : p.gridLineStyle === 'dotted' ? 'dotted' : 'solid';
  const legendPosition: 'top' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'right' =
    p.legendPosition === 'bottom' ||
    p.legendPosition === 'bottomLeft' ||
    p.legendPosition === 'bottomRight' ||
    p.legendPosition === 'left' ||
    p.legendPosition === 'right'
      ? p.legendPosition
      : 'top';
  const base = {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    axisX: e.chart?.axisX ?? { min: 0, max: 4, step: 1 },
    axisY: e.chart?.axisY ?? { min: 0, max: 500, step: 100 },
    series: (e.chart?.series ?? []).map(s => ({
      ...s,
      color: decodeColor(s.color),
      colors: s.colors?.map(c => (c === null ? null : (decodeColor(c) ?? null))),
      strokeWidth: s.strokeWidth,
    })),
    rules: (e.chart?.rules ?? []).map(r => ({
      id: r.id,
      at: r.at,
      text: r.text,
      color: r.color,
      strokeWidth: r.strokeWidth,
      dash: r.dash,
    })),
    fillColor: decodeImageFill(p.fill) ? '#111418' : (decodeColor(p.fill) ?? '#ffffff'),
    fillImage: decodeImageFill(p.fill),
    strokeColor: solidColor(p.stroke) ?? '#475569',
    strokeWidth: numOf(p.strokeWidth) ?? 1,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    gridColor: p.gridColor ?? '#e2e8f0',
    gridWidth: numOf(p.gridWidth) ?? 1,
    gridShape,
    gridLineStyle,
    gridRoundedCorners: p.gridRoundedCorners === 'true',
    textColor: p.textColor ?? '#0f172a',
    axisLabelColor: p.axisLabelColor,
    legendColor: p.legendColor,
    axisLineWidth: numOf(p.axisLineWidth),
    axisLineColor: p.axisLineColor,
    axisLineStyle: p.axisLineStyle === 'dashed' || p.axisLineStyle === 'dotted' ? p.axisLineStyle : undefined,
    tickLength: numOf(p.tickLength),
    axisFontSize: numOf(p.axisFontSize),
    axisFontFamily: p.axisFontFamily,
    showValueAxis: p.showValueAxis !== 'false',
    categoryAlign: p.categoryAlign === 'left' || p.categoryAlign === 'inside' ? p.categoryAlign : undefined,
    titleSize: numOf(p.titleSize),
    titleWeight: p.titleWeight === 'normal' ? 'normal' : undefined,
    titleColor: p.titleColor,
    gridAxes: p.gridAxes === 'x' || p.gridAxes === 'y' ? p.gridAxes : undefined,
    fontSize: numOf(p.fontSize) ?? 12,
    fontFamily: p.fontFamily ?? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    showGrid: p.showGrid !== 'false',
    showAxisLabels: p.showAxisLabels !== 'false',
    showLegend: p.showLegend === 'true',
    legendPosition,
    shadowStyle: decodeShadow(p.shadow),
    order: e.order,
    sourceIndex: e.sourceIndex,
  } satisfies ChartBase;
  return base;
}
