import type { SflBlock, SflValue } from '../../ast';
import type { SflEntityOut } from '../types';
import { asNumber, asString, childBlocks, directProps, numStr } from '../readers';

type Properties = Map<string, SflValue>;
type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;

export function readChart(block: SflBlock, p: Properties): SflEntityOut['chart'] {
  let chartData: SflEntityOut['chart'];
  
  const readAxis = (axisBlock: SflBlock | undefined) => {
    const axisProps = axisBlock ? directProps(axisBlock) : new Map<string, SflValue>();
    const thresholdsValue = axisProps.get('thresholds');
    const thresholds = thresholdsValue?.type === 'list'
      ? thresholdsValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; })
      : undefined;
    return { min: asNumber(axisProps.get('min')) ?? 0, max: asNumber(axisProps.get('max')) ?? 10, step: asNumber(axisProps.get('step')) ?? 1, label: asString(axisProps.get('label')), unit: asString(axisProps.get('unit')), thresholds: thresholds?.length ? thresholds : undefined };
  };
  const axes = childBlocks(block).filter(child => child.kind === 'Axis');
  const series = childBlocks(block).filter(child => child.kind === 'Series').map(seriesBlock => {
    const seriesProps = directProps(seriesBlock), value = seriesProps.get('values');
    // Component count read from the data itself, not hardcoded to 2:
    // scatter/line use [x,y], Fields §3.4 scalar series use [x,y,value],
    // vector series use [x,y,angle,magnitude].
    const values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][] = [];
    if (value?.type === 'list') for (const item of value.values) {
      if (item.type === 'number') (values as number[]).push(item.value);
      else if (item.type === 'list' && item.values.length >= 2) {
        const components = item.values.map(asNumber);
        if (components.every((c): c is number => c !== undefined)) (values as number[][]).push(components);
      }
    }
    // SFL 1.4, §5.4.5: index-aligned with values. `none` is the per-point
    // "no error bar here" sentinel (mirrors `stacked: none`'s
    // vocabulary) - anything else is a number (symmetric) or a
    // [low, high] list (asymmetric).
    const errorValue = seriesProps.get('error');
    const error = errorValue?.type === 'list'
      ? errorValue.values.map((v): number | [number, number] | null => {
        if (v.type === 'ident' && v.segments.join('.') === 'none') return null;
        if (v.type === 'number') return v.value;
        if (v.type === 'list' && v.values.length >= 2) {
          const lo = asNumber(v.values[0]), hi = asNumber(v.values[1]);
          if (lo !== undefined && hi !== undefined) return [lo, hi];
        }
        return null;
      })
      : undefined;
    // Custom only: `symbol: [[x, y], [x, y], ...]` - offsets in local
    // mark-space, traced in order and closed into a polygon glyph.
    const symbolValue = seriesProps.get('symbol');
    const symbolPoints = symbolValue?.type === 'list'
      ? symbolValue.values.flatMap((v): Array<[number, number]> => {
        if (v.type !== 'list' || v.values.length < 2) return [];
        const x = asNumber(v.values[0]), y = asNumber(v.values[1]);
        return x !== undefined && y !== undefined ? [[x, y]] : [];
      })
      : undefined;
    return {
      id: seriesBlock.name, label: asString(seriesProps.get('label')) ?? seriesBlock.name, color: asString(seriesProps.get('color')), opacity: asNumber(seriesProps.get('opacity')), values, error,
      source: asString(seriesProps.get('source')), target: asString(seriesProps.get('target')),
      size: asNumber(seriesProps.get('size')),
      symbol: symbolPoints?.length ? { points: symbolPoints } : undefined,
      stroke: asString(seriesProps.get('stroke')), strokeWidth: asNumber(seriesProps.get('strokeWidth')),
    };
  });
  // SFL 1.4, §5.4.8: Chart's second leaf kind alongside Series, at the
  // same depth (§1.2) - read the same way, just a different block kind.
  const rules = childBlocks(block).filter(child => child.kind === 'Rule').map(ruleBlock => {
    const ruleProps = directProps(ruleBlock);
    const dashValue = ruleProps.get('dash');
    const dash = dashValue?.type === 'list' ? dashValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; }) : undefined;
    return {
      id: ruleBlock.name,
      at: asNumber(ruleProps.get('at')) ?? 0,
      text: asString(ruleProps.get('text')),
      color: asString(ruleProps.get('color')),
      strokeWidth: asNumber(ruleProps.get('strokeWidth')),
      dash: dash?.length ? dash : undefined,
    };
  });
  const categoriesValue = p.get('categories');
  const categories = categoriesValue?.type === 'list'
    ? categoriesValue.values.flatMap(value => { const category = asString(value); return category === undefined ? [] : [category]; })
    : undefined;
  // SFL 1.4, §5.4.1: 'none'/absent both mean today's grouped behavior -
  // normalized to undefined here so downstream consumers only ever see
  // the three values that actually change computation.
  const stackedValue = asString(p.get('stacked'));
  const isolinesValue = p.get('isolines');
  const isolines = isolinesValue?.type === 'list'
    ? isolinesValue.values.flatMap(v => { const n = asNumber(v); return n === undefined ? [] : [n]; })
    : undefined;
  // Heatmap only: `zones: [["label", "#color"], ...]`, ordered low->high.
  const zonesValue = p.get('zones');
  const zones = zonesValue?.type === 'list'
    ? zonesValue.values.flatMap(v => {
      if (v.type !== 'list' || v.values.length < 1) return [];
      const label = asString(v.values[0]);
      if (label === undefined) return [];
      return [{ label, color: v.values[1] ? asString(v.values[1]) : undefined }];
    })
    : undefined;
  chartData = {
    chartType: (asString(p.get('type')) as 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field' | 'heatmap' | 'boxplot' | 'sankey' | 'treemap' | 'mekko' | 'hexbin' | 'pie' | 'matrix' | 'grid' | 'custom' | undefined) ?? 'bar',
    categories, areaOpacity: asNumber(p.get('areaOpacity')),
    stacked: stackedValue && stackedValue !== 'none' ? (stackedValue as 'true' | 'percent' | 'waterfall') : undefined,
    // Fields §3.4.
    scale: asString(p.get('scale')),
    interpolate: asString(p.get('interpolate')) === 'idw' ? 'idw' : undefined,
    idwPower: asNumber(p.get('idwPower')),
    isolines: isolines?.length ? isolines : undefined,
    zones: zones?.length ? zones : undefined,
    boxWidth: asNumber(p.get('boxWidth')), barCornerRadius: asNumber(p.get('barCornerRadius')),
    showBoxplotPoints: asString(p.get('showBoxplotPoints')) === undefined ? undefined : asString(p.get('showBoxplotPoints')) === 'true',
    barBorderColor: asString(p.get('barBorderColor')), barBorderWidth: asNumber(p.get('barBorderWidth')),
    mekkoVaryHeight: asString(p.get('mekkoVaryHeight')) === undefined ? undefined : asString(p.get('mekkoVaryHeight')) === 'true',
    hexRadius: asNumber(p.get('hexRadius')),
    innerRadius: asNumber(p.get('innerRadius')),
    axisX: readAxis(axes.find(a => a.name === 'x')), axisY: readAxis(axes.find(a => a.name === 'y' || a.name === 'value')),
    series, rules,
  };
    
  return chartData;
}

