export type { BarChartConfig, BoxplotChartConfig, CategoryChartConfig, LineChartConfig } from './cartesian';
export type { FieldChartConfig, HexbinChartConfig } from './field';
export type { HeatmapChartConfig, TreemapChartConfig } from './matrix';
export type { PieChartConfig, RadarChartConfig, RadialBarChartConfig } from './polar';
export type { CustomChartConfig, MekkoChartConfig, SankeyChartConfig } from './specialized';

import type { BarChartConfig, BoxplotChartConfig, LineChartConfig } from './cartesian';
import type { FieldChartConfig, HexbinChartConfig } from './field';
import type { HeatmapChartConfig, TreemapChartConfig } from './matrix';
import type { PieChartConfig, RadarChartConfig, RadialBarChartConfig } from './polar';
import type { CustomChartConfig, MekkoChartConfig, SankeyChartConfig } from './specialized';

export interface ChartConfig
  extends BarChartConfig,
    BoxplotChartConfig,
    CustomChartConfig,
    FieldChartConfig,
    HeatmapChartConfig,
    HexbinChartConfig,
    LineChartConfig,
    MekkoChartConfig,
    PieChartConfig,
    RadarChartConfig,
    RadialBarChartConfig,
    SankeyChartConfig,
    TreemapChartConfig {}
