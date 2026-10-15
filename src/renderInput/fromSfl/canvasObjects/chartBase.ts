import type { ChartBase } from '../../../model/chart';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeShadow } from '../../styleDecoding';
import { numOf, solidColor } from './values';

type Props = SflCanvasObject['props'];

function decodeImageFill(source: string | undefined): { url: string; overlay?: string } | undefined {
  const match = source?.match(/^image\(\s*([^,)]+?)\s*(?:,\s*(.+?))?\s*\)$/);
  return match ? { url: match[1], overlay: match[2] } : undefined;
}

function legendPositionOf(value: string | undefined): ChartBase['legendPosition'] {
  return value === 'bottom' ||
    value === 'bottomLeft' ||
    value === 'bottomRight' ||
    value === 'left' ||
    value === 'right'
    ? value
    : 'top';
}

function lineStyleOf(value: string | undefined): 'solid' | 'dashed' | 'dotted' {
  return value === 'dashed' || value === 'dotted' ? value : 'solid';
}

function dataOf(e: SflCanvasObject): Pick<ChartBase, 'axisX' | 'axisY' | 'series' | 'rules'> {
  return {
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
  };
}

function frameOf(
  p: Props,
): Pick<ChartBase, 'fillColor' | 'fillImage' | 'strokeColor' | 'strokeWidth' | 'cornerRadius' | 'shadowStyle'> {
  const image = decodeImageFill(p.fill);
  return {
    fillColor: image ? '#111418' : (decodeColor(p.fill) ?? '#ffffff'),
    fillImage: image,
    strokeColor: solidColor(p.stroke) ?? '#475569',
    strokeWidth: numOf(p.strokeWidth) ?? 1,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    shadowStyle: decodeShadow(p.shadow),
  };
}

function gridOf(
  p: Props,
): Pick<
  ChartBase,
  'gridColor' | 'gridWidth' | 'gridShape' | 'gridLineStyle' | 'gridRoundedCorners' | 'gridAxes' | 'showGrid'
> {
  return {
    gridColor: p.gridColor ?? '#e2e8f0',
    gridWidth: numOf(p.gridWidth) ?? 1,
    gridShape: p.gridShape === 'circle' ? ('circle' as const) : ('rect' as const),
    gridLineStyle: lineStyleOf(p.gridLineStyle),
    gridRoundedCorners: p.gridRoundedCorners === 'true',
    gridAxes: p.gridAxes === 'x' || p.gridAxes === 'y' ? p.gridAxes : undefined,
    showGrid: p.showGrid !== 'false',
  };
}

function axesOf(
  p: Props,
): Pick<
  ChartBase,
  | 'axisLabelColor'
  | 'axisLineWidth'
  | 'axisLineColor'
  | 'axisLineStyle'
  | 'tickLength'
  | 'axisFontSize'
  | 'axisFontFamily'
  | 'showValueAxis'
  | 'categoryAlign'
  | 'showAxisLabels'
> {
  return {
    axisLabelColor: p.axisLabelColor,
    axisLineWidth: numOf(p.axisLineWidth),
    axisLineColor: p.axisLineColor,
    axisLineStyle: p.axisLineStyle === 'dashed' || p.axisLineStyle === 'dotted' ? p.axisLineStyle : undefined,
    tickLength: numOf(p.tickLength),
    axisFontSize: numOf(p.axisFontSize),
    axisFontFamily: p.axisFontFamily,
    showValueAxis: p.showValueAxis !== 'false',
    categoryAlign: p.categoryAlign === 'left' || p.categoryAlign === 'inside' ? p.categoryAlign : undefined,
    showAxisLabels: p.showAxisLabels !== 'false',
  };
}

function textOf(
  p: Props,
): Pick<ChartBase, 'textColor' | 'titleSize' | 'titleWeight' | 'titleColor' | 'fontSize' | 'fontFamily'> {
  return {
    textColor: p.textColor ?? '#0f172a',
    titleSize: numOf(p.titleSize),
    titleWeight: p.titleWeight === 'normal' ? ('normal' as const) : undefined,
    titleColor: p.titleColor,
    fontSize: numOf(p.fontSize) ?? 12,
    fontFamily: p.fontFamily ?? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };
}

function legendOf(p: Props): Pick<ChartBase, 'legendColor' | 'showLegend' | 'legendPosition'> {
  return {
    legendColor: p.legendColor,
    showLegend: p.showLegend === 'true',
    legendPosition: legendPositionOf(p.legendPosition),
  };
}

export function chartBase(e: SflCanvasObject): ChartBase {
  const p = e.props;
  return {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    ...dataOf(e),
    ...frameOf(p),
    ...gridOf(p),
    ...axesOf(p),
    ...textOf(p),
    ...legendOf(p),
    order: e.order,
    sourceIndex: e.sourceIndex,
  };
}
