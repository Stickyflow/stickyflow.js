import type { BarChartConfig, BoxplotChartConfig, LineChartConfig } from './cartesian';
import type { FieldChartConfig, HexbinChartConfig } from './field';
import type { HeatmapChartConfig, TreemapChartConfig } from './matrix';
import type { PieChartConfig, RadarChartConfig, RadialBarChartConfig } from './polar';
import type { CustomChartConfig, MekkoChartConfig, SankeyChartConfig } from './specialized';

// Only adapters that have not narrowed chartType use this transitional contract.
// Concrete chart entities always expose their exact config type.
export interface UnnarrowedChartConfig
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
