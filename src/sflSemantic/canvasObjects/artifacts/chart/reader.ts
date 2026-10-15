import { isChartType } from '../../../../model/chart';
import type { SflBlock } from '../../../../sflLanguage/ast';
import { contentChildren, contentProperty } from '../../../ast/blockEntries';
import { asNumber, asString } from '../../../ast/valueAccess';
import { readAxis } from './axis';
import { readChartRules } from './rules';
import { readSeries } from './series';
import type { ChartData, ChartProperties } from './types';
import { numberList, readBoolean, stringList } from './values';
import { readChartZones } from './zones';

const STACKED_MODES: ReadonlyArray<NonNullable<ChartData['stacked']>> = ['none', 'true', 'percent', 'waterfall'];

function asChartType(value: string | undefined): ChartData['chartType'] {
  return isChartType(value) ? value : 'bar';
}

function asStackedMode(value: string | undefined): ChartData['stacked'] {
  return STACKED_MODES.find(mode => mode === value);
}

type SymbolDefinitions = Map<string, { points: Array<[number, number]>; tension?: number }>;

export function readChart(
  block: SflBlock,
  properties: ChartProperties,
  symbolDefs: SymbolDefinitions,
  mergedProps: (block: SflBlock) => ChartProperties,
): ChartData {
  const children = contentChildren(block);
  const axes = children.filter(child => child.kind === 'Axis');
  const stacked = asString(properties.get('stacked'));
  return {
    chartType: asChartType(asString(properties.get('type'))),
    categories: stringList(contentProperty(block, 'categories')),
    areaOpacity: asNumber(properties.get('areaOpacity')),
    stacked: asStackedMode(stacked),
    scale: asString(properties.get('scale')),
    interpolate: asString(properties.get('interpolate')) === 'idw' ? 'idw' : undefined,
    idwPower: asNumber(properties.get('idwPower')),
    isolines: numberList(properties.get('isolines')),
    zones: readChartZones(properties.get('zones')),
    boxWidth: asNumber(properties.get('boxWidth')),
    orientation: asString(properties.get('orientation')) === 'horizontal' ? 'horizontal' : undefined,
    lineTension: asNumber(properties.get('lineTension')),
    highlightPoints: numberList(properties.get('highlightPoints')),
    barCornerRadius: asNumber(properties.get('barCornerRadius')),
    showBoxplotPoints: readBoolean(properties.get('showBoxplotPoints')),
    barBorderColor: asString(properties.get('barBorderColor')),
    barBorderWidth: asNumber(properties.get('barBorderWidth')),
    barGroupGap: asNumber(properties.get('barGroupGap')),
    barGlow: asNumber(properties.get('barGlow')),
    barGap: asNumber(properties.get('barGap')),
    mekkoVaryHeight: readBoolean(properties.get('mekkoVaryHeight')),
    hexRadius: asNumber(properties.get('hexRadius')),
    innerRadius: asNumber(properties.get('innerRadius')),
    pieCornerRadius: asNumber(properties.get('pieCornerRadius')),
    pieSliceGap: asNumber(properties.get('pieSliceGap')),
    ringThickness: asNumber(properties.get('ringThickness')),
    ringGap: asNumber(properties.get('ringGap')),
    cellGap: asNumber(properties.get('cellGap')),
    showValues: readBoolean(properties.get('showValues')),
    squareCells: readBoolean(properties.get('squareCells')),
    headerColor: asString(properties.get('headerColor')),
    tileGradient: readBoolean(properties.get('tileGradient')),
    showColumnBackdrop: readBoolean(properties.get('showColumnBackdrop')),
    labelPosition: asString(properties.get('labelPosition')) === 'inside' ? 'inside' : undefined,
    labelOrientation: asString(properties.get('labelOrientation')) === 'vertical' ? 'vertical' : undefined,
    labelColor: asString(properties.get('labelColor')),
    linkGradient: readBoolean(properties.get('linkGradient')),
    connectPoints: readBoolean(properties.get('connectPoints')),
    reverseComparison: readBoolean(properties.get('reverseComparison')),
    axisX: readAxis(axes.find(axis => axis.name === 'x')),
    axisY: readAxis(axes.find(axis => axis.name === 'y' || axis.name === 'value')),
    series: children.filter(child => child.kind === 'Series').map(child => readSeries(child, symbolDefs, mergedProps)),
    rules: readChartRules(block),
  };
}
