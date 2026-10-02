import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObject } from '../../types';

export type ChartProperties = Map<string, SflValue>;
export type ChartData = NonNullable<SflCanvasObject['chart']>;
export type ChartSeries = ChartData['series'][number];
