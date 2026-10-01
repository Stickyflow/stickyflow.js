import type { Chart, TypedChart } from '../../../model/chart';
import { decodeColor, decodeRamp, decodeShadow } from '../../../sfl/decodeStyles';
import type { SflEntityOut } from '../../../sfl/sflToCanvasState';
import { numOf, solidColor } from './values';

export function chartObject(e: SflEntityOut): Chart {
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
  const chart = {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    chartType: e.chart?.chartType ?? 'bar',
    axisX: e.chart?.axisX ?? { min: 0, max: 4, step: 1 },
    axisY: e.chart?.axisY ?? { min: 0, max: 500, step: 100 },
    config: {
      categories: e.chart?.categories,
      areaOpacity: e.chart?.areaOpacity,
      stacked: e.chart?.stacked,
      scale: decodeRamp(e.chart?.scale),
      interpolate: e.chart?.interpolate,
      idwPower: e.chart?.idwPower,
      isolines: e.chart?.isolines,
      zones: e.chart?.zones,
      boxWidth: e.chart?.boxWidth,
      orientation: e.chart?.orientation,
      lineTension: e.chart?.lineTension,
      barCornerRadius: e.chart?.barCornerRadius,
      showBoxplotPoints: e.chart?.showBoxplotPoints,
      barBorderColor: e.chart?.barBorderColor,
      barBorderWidth: e.chart?.barBorderWidth,
      mekkoVaryHeight: e.chart?.mekkoVaryHeight,
      hexRadius: e.chart?.hexRadius,
      innerRadius: e.chart?.innerRadius,
      pieCornerRadius: e.chart?.pieCornerRadius,
      pieSliceGap: e.chart?.pieSliceGap,
      ringThickness: e.chart?.ringThickness,
      ringGap: e.chart?.ringGap,
      cellGap: e.chart?.cellGap,
      showValues: e.chart?.showValues,
      squareCells: e.chart?.squareCells,
      headerColor: e.chart?.headerColor,
      tileGradient: e.chart?.tileGradient,
      showColumnBackdrop: e.chart?.showColumnBackdrop,
      labelPosition: e.chart?.labelPosition,
      labelOrientation: e.chart?.labelOrientation,
      labelColor: e.chart?.labelColor,
      linkGradient: e.chart?.linkGradient,
      connectPoints: e.chart?.connectPoints,
      reverseComparison: e.chart?.reverseComparison,
    },
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
    fillColor: solidColor(p.fill) ?? '#ffffff',
    strokeColor: solidColor(p.stroke) ?? '#475569',
    strokeWidth: numOf(p.strokeWidth) ?? 1,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    gridColor: p.gridColor ?? '#e2e8f0',
    gridWidth: numOf(p.gridWidth) ?? 1,
    gridShape,
    gridLineStyle,
    gridRoundedCorners: p.gridRoundedCorners === 'true',
    textColor: p.textColor ?? '#0f172a',
    fontSize: numOf(p.fontSize) ?? 12,
    fontFamily: p.fontFamily ?? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    showGrid: p.showGrid !== 'false',
    showAxisLabels: p.showAxisLabels !== 'false',
    showLegend: p.showLegend !== 'false',
    legendPosition,
    shadowStyle: decodeShadow(p.shadow),
    order: e.order,
  } satisfies TypedChart;
  return chart as Chart;
}
