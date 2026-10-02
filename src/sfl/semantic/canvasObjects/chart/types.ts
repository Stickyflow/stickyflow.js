import type { SflValue } from '../../../ast';
import type { ResolvedCanvasObject } from '../../types';

export type ChartProperties = Map<string, SflValue>;
export type ChartData = NonNullable<ResolvedCanvasObject['chart']>;
export type ChartSeries = ChartData['series'][number];
