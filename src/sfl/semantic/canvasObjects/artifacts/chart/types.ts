import type { SflValue } from '../../../../ast';
import type { SflEntityOut } from '../../types';

export type ChartProperties = Map<string, SflValue>;
export type ChartData = NonNullable<SflEntityOut['chart']>;
export type ChartSeries = ChartData['series'][number];
