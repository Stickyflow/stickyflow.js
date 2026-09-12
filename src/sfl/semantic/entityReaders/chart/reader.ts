import { isChartType } from '../../../../model/charts';
import type { SflBlock } from '../../../ast';
import { childBlocks } from '../../blockEntries';
import { asNumber, asString } from '../../valueAccess';
import { readAxis } from './axis';
import { readChartRules } from './rules';
import { readSeries } from './series';
import type { ChartData, ChartProperties } from './types';
import { numberList, readBoolean, stringList } from './values';
import { readChartZones } from './zones';

const STACKED_MODES: ReadonlyArray<NonNullable<ChartData['stacked']>> = ['true', 'percent', 'waterfall'];

function asChartType(value: string | undefined): ChartData['chartType'] {
  return isChartType(value) ? value : 'bar';
}

function asStackedMode(value: string | undefined): ChartData['stacked'] {
  return STACKED_MODES.find(mode => mode === value);
}

export function readChart(block: SflBlock, properties: ChartProperties): ChartData {
  const children = childBlocks(block);
  const axes = children.filter(child => child.kind === 'Axis');
  const stacked = asString(properties.get('stacked'));
  return {
    chartType: asChartType(asString(properties.get('type'))),
    categories: stringList(properties.get('categories')),
    areaOpacity: asNumber(properties.get('areaOpacity')),
    stacked: asStackedMode(stacked),
    scale: asString(properties.get('scale')),
    interpolate: asString(properties.get('interpolate')) === 'idw' ? 'idw' : undefined,
    idwPower: asNumber(properties.get('idwPower')),
    isolines: numberList(properties.get('isolines')),
    zones: readChartZones(properties.get('zones')),
    boxWidth: asNumber(properties.get('boxWidth')),
    lineTension: asNumber(properties.get('lineTension')),
    barCornerRadius: asNumber(properties.get('barCornerRadius')),
    showBoxplotPoints: readBoolean(properties.get('showBoxplotPoints')),
    barBorderColor: asString(properties.get('barBorderColor')),
    barBorderWidth: asNumber(properties.get('barBorderWidth')),
    mekkoVaryHeight: readBoolean(properties.get('mekkoVaryHeight')),
    hexRadius: asNumber(properties.get('hexRadius')),
    innerRadius: asNumber(properties.get('innerRadius')),
    cellGap: asNumber(properties.get('cellGap')),
    showValues: readBoolean(properties.get('showValues')),
    squareCells: readBoolean(properties.get('squareCells')),
    headerColor: asString(properties.get('headerColor')),
    labelPosition: asString(properties.get('labelPosition')) === 'inside' ? 'inside' : undefined,
    labelOrientation: asString(properties.get('labelOrientation')) === 'vertical' ? 'vertical' : undefined,
    labelColor: asString(properties.get('labelColor')),
    axisX: readAxis(axes.find(axis => axis.name === 'x')),
    axisY: readAxis(axes.find(axis => axis.name === 'y' || axis.name === 'value')),
    series: children.filter(child => child.kind === 'Series').map(readSeries),
    rules: readChartRules(block),
  };
}
