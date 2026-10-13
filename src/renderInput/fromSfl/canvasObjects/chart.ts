import type {
  BarChartConfig,
  BoxplotChartConfig,
  Chart,
  ChartBase,
  CustomChartConfig,
  FieldChartConfig,
  HeatmapChartConfig,
  HexbinChartConfig,
  LineChartConfig,
  MekkoChartConfig,
  PieChartConfig,
  PolarAreaChartConfig,
  RadarChartConfig,
  RadialBarChartConfig,
  RadialChartConfig,
  SankeyChartConfig,
  ScatterChartConfig,
  TreemapChartConfig,
  TypedChart,
} from '../../../model/chart';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeRamp, decodeShadow } from '../../styleDecoding';
import { numOf, solidColor } from './values';

// image(url) or image(url, overlayColor), the url without commas or parentheses.
function decodeImageFill(source: string | undefined): { url: string; overlay?: string } | undefined {
  const match = source?.match(/^image\(\s*([^,)]+?)\s*(?:,\s*(.+?))?\s*\)$/);
  return match ? { url: match[1], overlay: match[2] } : undefined;
}

export function chartObject(e: SflCanvasObject): Chart {
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

  const source = e.chart;
  const chartType = source?.chartType ?? 'bar';
  switch (chartType) {
    case 'bar':
      return typedChart(base, chartType, {
        categories: source?.categories,
        barCornerRadius: source?.barCornerRadius,
        barBorderColor: decodeColor(source?.barBorderColor),
        barBorderWidth: source?.barBorderWidth,
        barGroupGap: source?.barGroupGap,
        barGap: source?.barGap,
        barGlow: source?.barGlow,
        barGlassBlur: numOf(p.barGlassBlur),
        barGlassSaturation: numOf(p.barGlassSaturation),
        barGlassTint: p.barGlassTint,
        barThickness: numOf(p.barThickness),
        orientation: source?.orientation,
        barTrack: p.barTrack === 'true',
        barRoundedBottom: p.barRoundedBottom === 'true',
        barLabelMaxOnly: p.barLabelMaxOnly === 'true',
        barTrackColor: p.barTrackColor,
        barTrackHatch: p.barTrackHatch === 'true',
        barTrackHatchColor: p.barTrackHatchColor,
        barTrackHatchAngle: numOf(p.barTrackHatchAngle),
        barTrackHatchSpacing: numOf(p.barTrackHatchSpacing),
        barTrackHatchWidth: numOf(p.barTrackHatchWidth),
        stacked: source?.stacked ?? 'true',
        showBarLabels: p.showBarLabels === 'true',
        barLabelPosition:
          p.barLabelPosition === 'inside' || p.barLabelPosition === 'center' || p.barLabelPosition === 'axis'
            ? p.barLabelPosition
            : undefined,
        barLabelFontSize: numOf(p.barLabelFontSize),
        barLabelFontFamily: p.barLabelFontFamily,
        barLabelFontWeight: p.barLabelFontWeight === 'bold' ? 'bold' : undefined,
        barLabelColor: p.barLabelColor,
        barLabelPill: p.barLabelPill === 'true',
        barLabelPillColor: p.barLabelPillColor,
        barLabelBorderColor: p.barLabelBorderColor,
        barLabelBorderWidth: numOf(p.barLabelBorderWidth),
        barLabelFormat: p.barLabelFormat,
      } satisfies BarChartConfig);
    case 'line':
      return typedChart(base, chartType, {
        categories: source?.categories,
        areaOpacity: source?.areaOpacity,
        lineTension: source?.lineTension,
      } satisfies LineChartConfig);
    case 'scatter':
      return typedChart(base, chartType, { categories: source?.categories } satisfies ScatterChartConfig);
    case 'boxplot':
      return typedChart(base, chartType, {
        boxWidth: source?.boxWidth,
        orientation: source?.orientation,
        barCornerRadius: source?.barCornerRadius,
        showBoxplotPoints: source?.showBoxplotPoints,
        barBorderColor: source?.barBorderColor,
        barBorderWidth: source?.barBorderWidth,
      } satisfies BoxplotChartConfig);
    case 'field':
      return typedChart(base, chartType, {
        scale: decodeRamp(source?.scale),
        interpolate: source?.interpolate,
        idwPower: source?.idwPower,
        isolines: source?.isolines,
      } satisfies FieldChartConfig);
    case 'heatmap':
      return typedChart(base, chartType, {
        categories: source?.categories,
        zones: source?.zones,
        cellGap: source?.cellGap,
        showValues: source?.showValues,
        squareCells: source?.squareCells,
        barCornerRadius: source?.barCornerRadius,
      } satisfies HeatmapChartConfig);
    case 'hexbin':
      return typedChart(base, chartType, { hexRadius: source?.hexRadius } satisfies HexbinChartConfig);
    case 'mekko':
      return typedChart(base, chartType, {
        categories: source?.categories,
        barCornerRadius: source?.barCornerRadius,
        mekkoVaryHeight: source?.mekkoVaryHeight,
        tileGradient: source?.tileGradient,
        showColumnBackdrop: source?.showColumnBackdrop,
      } satisfies MekkoChartConfig);
    case 'pie':
      return typedChart(base, chartType, {
        innerRadius: source?.innerRadius,
        pieCornerRadius: source?.pieCornerRadius,
        pieSliceGap: source?.pieSliceGap,
      } satisfies PieChartConfig);
    case 'polarArea':
      return typedChart(base, chartType, {
        innerRadius: source?.innerRadius,
        pieCornerRadius: source?.pieCornerRadius,
        pieSliceGap: source?.pieSliceGap,
      } satisfies PolarAreaChartConfig);
    case 'radar':
      return typedChart(base, chartType, {
        categories: source?.categories,
        areaOpacity: source?.areaOpacity,
      } satisfies RadarChartConfig);
    case 'radial':
      return typedChart(base, chartType, {
        categories: source?.categories,
        areaOpacity: source?.areaOpacity,
      } satisfies RadialChartConfig);
    case 'radialBar':
      return typedChart(base, chartType, {
        ringThickness: source?.ringThickness,
        ringGap: source?.ringGap,
      } satisfies RadialBarChartConfig);
    case 'sankey':
      return typedChart(base, chartType, {
        zones: source?.zones,
        barCornerRadius: source?.barCornerRadius,
        labelPosition: source?.labelPosition,
        labelOrientation: source?.labelOrientation,
        labelColor: source?.labelColor,
        linkGradient: source?.linkGradient,
      } satisfies SankeyChartConfig);
    case 'treemap':
      return typedChart(base, chartType, {
        zones: source?.zones,
        cellGap: source?.cellGap,
        barCornerRadius: source?.barCornerRadius,
        headerColor: source?.headerColor,
        tileGradient: source?.tileGradient,
      } satisfies TreemapChartConfig);
    case 'custom':
      return typedChart(base, chartType, {
        categories: source?.categories,
        zones: source?.zones,
        orientation: source?.orientation,
        connectPoints: source?.connectPoints,
        reverseComparison: source?.reverseComparison,
      } satisfies CustomChartConfig);
  }
}

function typedChart<TType extends Chart['chartType'], TConfig extends object>(
  base: ChartBase,
  chartType: TType,
  config: TConfig,
): TypedChart<TType, TConfig> {
  return { ...base, chartType, config };
}
