import type {
  BarChartConfig,
  BoxplotChartConfig,
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
} from '../../../model/chart';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeRamp } from '../../styleDecoding';
import { numOf } from './values';

type ChartSource = SflCanvasObject['chart'];
type ChartProps = SflCanvasObject['props'];

export function barConfig(source: ChartSource, p: ChartProps): BarChartConfig {
  return {
    categories: source?.categories,
    barCornerRadius: source?.barCornerRadius,
    barBorderColor: decodeColor(source?.barBorderColor),
    barBorderWidth: source?.barBorderWidth,
    barGroupGap: source?.barGroupGap,
    barGap: source?.barGap,
    barGlow: source?.barGlow,
    barSegments: numOf(p.barSegments),
    barSegmentGap: numOf(p.barSegmentGap),
    barSegmentSnap: p.barSegmentSnap === 'false' ? false : undefined,
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
  };
}

export function lineConfig(source: ChartSource, p: ChartProps): LineChartConfig {
  return {
    categories: source?.categories,
    areaOpacity: source?.areaOpacity,
    lineTension: source?.lineTension,
    lineWidth: numOf(p.lineWidth),
    lineGlow: numOf(p.lineGlow),
    pointSize: numOf(p.pointSize),
    pointFill: p.pointFill,
    pointStrokeWidth: numOf(p.pointStrokeWidth),
    highlightPoints: source?.highlightPoints,
    highlightSize: numOf(p.highlightSize),
    highlightColor: p.highlightColor,
    highlightGuide: p.highlightGuide === 'true',
    highlightLabels: p.highlightLabels === 'true',
    highlightLabelColor: p.highlightLabelColor,
    highlightLabelFormat: p.highlightLabelFormat,
  };
}

export function scatterConfig(source: ChartSource, p: ChartProps): ScatterChartConfig {
  return {
    categories: source?.categories,
    pointSize: numOf(p.pointSize),
    pointOpacity: numOf(p.pointOpacity),
    pointStrokeWidth: numOf(p.pointStrokeWidth),
    pointStrokeColor: p.pointStrokeColor,
  };
}

export function boxplotConfig(source: ChartSource, p: ChartProps): BoxplotChartConfig {
  return {
    boxWidth: source?.boxWidth,
    orientation: source?.orientation,
    barCornerRadius: source?.barCornerRadius,
    showBoxplotPoints: source?.showBoxplotPoints,
    barBorderColor: source?.barBorderColor,
    barBorderWidth: source?.barBorderWidth,
    boxWhiskerWidth: numOf(p.boxWhiskerWidth),
    boxMedianWidth: numOf(p.boxMedianWidth),
    boxMedianColor: p.boxMedianColor,
    boxWhiskerColor: p.boxWhiskerColor,
    boxCapSize: numOf(p.boxCapSize),
    boxPointSize: numOf(p.boxPointSize),
    boxPointOpacity: numOf(p.boxPointOpacity),
    boxJitter: numOf(p.boxJitter),
  };
}

export function fieldConfig(source: ChartSource): FieldChartConfig {
  return {
    scale: decodeRamp(source?.scale),
    interpolate: source?.interpolate,
    idwPower: source?.idwPower,
    isolines: source?.isolines,
  };
}

export function heatmapConfig(source: ChartSource, p: ChartProps): HeatmapChartConfig {
  return {
    categories: source?.categories,
    zones: source?.zones,
    cellGap: source?.cellGap,
    showValues: source?.showValues,
    squareCells: source?.squareCells,
    barCornerRadius: source?.barCornerRadius,
    cellShape: p.cellShape === 'circle' ? 'circle' : p.cellShape === 'square' ? 'square' : undefined,
    cellStrokeColor: p.cellStrokeColor,
    cellStrokeWidth: numOf(p.cellStrokeWidth),
    cellValueSize: numOf(p.cellValueSize),
    cellValueColor: p.cellValueColor,
  };
}

export function hexbinConfig(source: ChartSource, p: ChartProps): HexbinChartConfig {
  return {
    hexRadius: source?.hexRadius,
    scale: decodeRamp(source?.scale),
    hexGap: numOf(p.hexGap),
    hexStrokeWidth: numOf(p.hexStrokeWidth),
    hexStrokeColor: p.hexStrokeColor,
    hexMinOpacity: numOf(p.hexMinOpacity),
  };
}

export function mekkoConfig(source: ChartSource, p: ChartProps): MekkoChartConfig {
  return {
    categories: source?.categories,
    barCornerRadius: source?.barCornerRadius,
    mekkoVaryHeight: source?.mekkoVaryHeight,
    tileGradient: source?.tileGradient,
    showColumnBackdrop: source?.showColumnBackdrop,
    mekkoColumnGap: numOf(p.mekkoColumnGap),
    mekkoSegmentGap: numOf(p.mekkoSegmentGap),
    mekkoRoundAll: p.mekkoRoundAll === undefined ? undefined : String(p.mekkoRoundAll) !== 'false',
    mekkoSegmentStrokeColor: p.mekkoSegmentStrokeColor,
    mekkoSegmentStrokeWidth: numOf(p.mekkoSegmentStrokeWidth),
    mekkoLabelSize: numOf(p.mekkoLabelSize),
    mekkoValueSize: numOf(p.mekkoValueSize),
    mekkoTextColor: p.mekkoTextColor,
    showMekkoTotals: p.showMekkoTotals === undefined ? undefined : String(p.showMekkoTotals) !== 'false',
    mekkoValueFormat: p.mekkoValueFormat === 'percent' ? 'percent' : p.mekkoValueFormat === 'value' ? 'value' : undefined,
  };
}

export function pieConfig(source: ChartSource, p: ChartProps): PieChartConfig {
  return {
    innerRadius: source?.innerRadius,
    pieCornerRadius: source?.pieCornerRadius,
    pieSliceGap: source?.pieSliceGap,
    pieStartAngle: numOf(p.pieStartAngle),
    pieSweep: numOf(p.pieSweep),
    pieExplode: numOf(p.pieExplode),
    pieGlow: numOf(p.pieGlow),
    pieStroke: p.pieStroke,
    pieStrokeWidth: numOf(p.pieStrokeWidth),
    pieLabelPosition:
      p.pieLabelPosition === 'inside' || p.pieLabelPosition === 'outside' ? p.pieLabelPosition : undefined,
    pieLabelContent:
      p.pieLabelContent === 'percent' || p.pieLabelContent === 'name' || p.pieLabelContent === 'inline'
        ? p.pieLabelContent
        : undefined,
    pieLabelColor: p.pieLabelColor,
    pieCenterText: p.pieCenterText,
    pieCenterSize: numOf(p.pieCenterSize),
    pieCenterColor: p.pieCenterColor,
  };
}

export function polarAreaConfig(source: ChartSource, p: ChartProps): PolarAreaChartConfig {
  return {
    innerRadius: source?.innerRadius,
    pieCornerRadius: source?.pieCornerRadius,
    pieSliceGap: source?.pieSliceGap,
    pieStartAngle: numOf(p.pieStartAngle),
    pieStroke: p.pieStroke,
    pieStrokeWidth: numOf(p.pieStrokeWidth),
    polarTrackOpacity: numOf(p.polarTrackOpacity),
    polarRings: p.polarRings === undefined ? undefined : String(p.polarRings) !== 'false',
    polarTrackStroke: p.polarTrackStroke,
    polarTrackStrokeWidth: numOf(p.polarTrackStrokeWidth),
    polarTrackDash: p.polarTrackDash,
    polarValueSize: numOf(p.polarValueSize),
    polarNameSize: numOf(p.polarNameSize),
    polarValueFirst: p.polarValueFirst === undefined ? undefined : String(p.polarValueFirst) !== 'false',
    polarOutsideLabels: p.polarOutsideLabels === undefined ? undefined : String(p.polarOutsideLabels) !== 'false',
  };
}

function radarStyle(p: ChartProps): Pick<RadarChartConfig, 'radarStrokeWidth' | 'radarPointSize' | 'radarSpokes' | 'radarTension'> {
  return {
    radarStrokeWidth: numOf(p.radarStrokeWidth),
    radarPointSize: numOf(p.radarPointSize),
    radarTension: numOf(p.radarTension),
    radarSpokes: p.radarSpokes === undefined ? undefined : String(p.radarSpokes) !== 'false',
  };
}

export function radarConfig(source: ChartSource, p: ChartProps): RadarChartConfig {
  return {
    categories: source?.categories,
    areaOpacity: source?.areaOpacity,
    ...radarStyle(p),
  };
}

export function radialConfig(source: ChartSource, p: ChartProps): RadialChartConfig {
  return {
    categories: source?.categories,
    areaOpacity: source?.areaOpacity,
    ...radarStyle(p),
  };
}

export function radialBarConfig(source: ChartSource, p: ChartProps): RadialBarChartConfig {
  return {
    ringThickness: source?.ringThickness,
    ringGap: source?.ringGap,
    ringTrackOpacity: numOf(p.ringTrackOpacity),
    ringCap: p.ringCap === 'butt' ? 'butt' : p.ringCap === 'round' ? 'round' : undefined,
    ringStartAngle: numOf(p.ringStartAngle),
    ringSweep: numOf(p.ringSweep),
  };
}

export function sankeyConfig(source: ChartSource, p: ChartProps): SankeyChartConfig {
  return {
    zones: source?.zones,
    barCornerRadius: source?.barCornerRadius,
    labelPosition: source?.labelPosition,
    labelOrientation: source?.labelOrientation,
    labelColor: source?.labelColor,
    linkGradient: source?.linkGradient,
    sankeyNodeWidth: numOf(p.sankeyNodeWidth),
    sankeyNodeGap: numOf(p.sankeyNodeGap),
    sankeyLinkOpacity: numOf(p.sankeyLinkOpacity),
    sankeyLinkCurve: numOf(p.sankeyLinkCurve),
    sankeyLabelSize: numOf(p.sankeyLabelSize),
  };
}

export function treemapConfig(source: ChartSource, p: ChartProps): TreemapChartConfig {
  return {
    zones: source?.zones,
    cellGap: source?.cellGap,
    barCornerRadius: source?.barCornerRadius,
    headerColor: source?.headerColor,
    tileGradient: source?.tileGradient,
    tileStrokeColor: p.tileStrokeColor,
    tileStrokeWidth: numOf(p.tileStrokeWidth),
    tileLabelSize: numOf(p.tileLabelSize),
    tileValueSize: numOf(p.tileValueSize),
    tileTextColor: p.tileTextColor,
    tileLabelPadding: numOf(p.tileLabelPadding),
    showTileValues: p.showTileValues === undefined ? undefined : String(p.showTileValues) !== 'false',
    headerHeight: numOf(p.headerHeight),
  };
}

export function customConfig(source: ChartSource, p: ChartProps): CustomChartConfig {
  return {
    categories: source?.categories,
    zones: source?.zones,
    orientation: source?.orientation,
    connectPoints: source?.connectPoints,
    reverseComparison: source?.reverseComparison,
    customConnectorWidth: numOf(p.customConnectorWidth),
    customConnectorOpacity: numOf(p.customConnectorOpacity),
    customConnectorDash: p.customConnectorDash,
    customBeforeFill: p.customBeforeFill,
    customBeforeStroke: p.customBeforeStroke,
    customBeforeStrokeWidth: numOf(p.customBeforeStrokeWidth),
    customLabelSize: numOf(p.customLabelSize),
    customLabelColor: p.customLabelColor,
  };
}
