import type { SflBlock, SflValue } from '../../ast';
import type { SflEntityOut } from '../types';
import { asNumber, asString, childBlocks, directProps } from '../readers';

type Properties = Map<string, SflValue>;
type ChartData = NonNullable<SflEntityOut['chart']>;
type Series = ChartData['series'][number];

function numberList(value?: SflValue): number[] | undefined {
  if (value?.type !== 'list') return undefined;
  const numbers = value.values.flatMap(item => {
    const number = asNumber(item);
    return number === undefined ? [] : [number];
  });
  return numbers.length ? numbers : undefined;
}

function readAxis(block?: SflBlock): ChartData['axisX'] {
  const props = block ? directProps(block) : new Map<string, SflValue>();
  return {
    min: asNumber(props.get('min')) ?? 0,
    max: asNumber(props.get('max')) ?? 10,
    step: asNumber(props.get('step')) ?? 1,
    label: asString(props.get('label')),
    unit: asString(props.get('unit')),
    thresholds: numberList(props.get('thresholds')),
  };
}

function readSeriesValues(value?: SflValue): Series['values'] {
  const values: number[] | number[][] = [];
  if (value?.type !== 'list') return values as Series['values'];
  for (const item of value.values) {
    if (item.type === 'number') (values as number[]).push(item.value);
    else if (item.type === 'list') {
      const components = item.values.map(asNumber);
      if (components.length >= 2 && components.every((part): part is number => part !== undefined)) {
        (values as number[][]).push(components);
      }
    }
  }
  return values as Series['values'];
}

function readErrors(value?: SflValue): Series['error'] {
  if (value?.type !== 'list') return undefined;
  return value.values.map(item => {
    if (item.type === 'ident' && item.segments.join('.') === 'none') return null;
    if (item.type === 'number') return item.value;
    if (item.type === 'list' && item.values.length >= 2) {
      const low = asNumber(item.values[0]);
      const high = asNumber(item.values[1]);
      if (low !== undefined && high !== undefined) return [low, high] as [number, number];
    }
    return null;
  });
}

function readSymbol(value?: SflValue): Series['symbol'] {
  if (value?.type !== 'list') return undefined;
  const points = value.values.flatMap((item): Array<[number, number]> => {
    if (item.type !== 'list' || item.values.length < 2) return [];
    const x = asNumber(item.values[0]);
    const y = asNumber(item.values[1]);
    return x === undefined || y === undefined ? [] : [[x, y]];
  });
  return points.length ? { points } : undefined;
}

function readSeries(block: SflBlock): Series {
  const props = directProps(block);
  return {
    id: block.name,
    label: asString(props.get('label')) ?? block.name,
    color: asString(props.get('color')),
    opacity: asNumber(props.get('opacity')),
    values: readSeriesValues(props.get('values')),
    error: readErrors(props.get('error')),
    source: asString(props.get('source')),
    target: asString(props.get('target')),
    size: asNumber(props.get('size')),
    symbol: readSymbol(props.get('symbol')),
    stroke: asString(props.get('stroke')),
    strokeWidth: asNumber(props.get('strokeWidth')),
  };
}

function readRules(block: SflBlock): ChartData['rules'] {
  return childBlocks(block).filter(child => child.kind === 'Rule').map(rule => {
    const props = directProps(rule);
    return {
      id: rule.name,
      at: asNumber(props.get('at')) ?? 0,
      text: asString(props.get('text')),
      color: asString(props.get('color')),
      strokeWidth: asNumber(props.get('strokeWidth')),
      dash: numberList(props.get('dash')),
    };
  });
}

function stringList(value?: SflValue): string[] | undefined {
  if (value?.type !== 'list') return undefined;
  return value.values.flatMap(item => {
    const text = asString(item);
    return text === undefined ? [] : [text];
  });
}

function readZones(value?: SflValue): ChartData['zones'] {
  if (value?.type !== 'list') return undefined;
  const zones = value.values.flatMap(item => {
    if (item.type !== 'list') return [];
    const label = asString(item.values[0]);
    return label === undefined ? [] : [{ label, color: asString(item.values[1]) }];
  });
  return zones.length ? zones : undefined;
}

export function readChart(block: SflBlock, props: Properties): SflEntityOut['chart'] {
  const axes = childBlocks(block).filter(child => child.kind === 'Axis');
  const stacked = asString(props.get('stacked'));
  return {
    chartType: (asString(props.get('type')) as ChartData['chartType'] | undefined) ?? 'bar',
    categories: stringList(props.get('categories')),
    areaOpacity: asNumber(props.get('areaOpacity')),
    stacked: stacked && stacked !== 'none' ? stacked as ChartData['stacked'] : undefined,
    scale: asString(props.get('scale')),
    interpolate: asString(props.get('interpolate')) === 'idw' ? 'idw' : undefined,
    idwPower: asNumber(props.get('idwPower')),
    isolines: numberList(props.get('isolines')),
    zones: readZones(props.get('zones')),
    boxWidth: asNumber(props.get('boxWidth')),
    barCornerRadius: asNumber(props.get('barCornerRadius')),
    showBoxplotPoints: readBoolean(props.get('showBoxplotPoints')),
    barBorderColor: asString(props.get('barBorderColor')),
    barBorderWidth: asNumber(props.get('barBorderWidth')),
    mekkoVaryHeight: readBoolean(props.get('mekkoVaryHeight')),
    hexRadius: asNumber(props.get('hexRadius')),
    innerRadius: asNumber(props.get('innerRadius')),
    axisX: readAxis(axes.find(axis => axis.name === 'x')),
    axisY: readAxis(axes.find(axis => axis.name === 'y' || axis.name === 'value')),
    series: childBlocks(block).filter(child => child.kind === 'Series').map(readSeries),
    rules: readRules(block),
  };
}

function readBoolean(value?: SflValue): boolean | undefined {
  const text = asString(value);
  return text === undefined ? undefined : text === 'true';
}
