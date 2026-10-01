import type { BarChartConfig, BoxplotChartConfig, LineChartConfig } from './cartesian';
import type { FieldChartConfig, HexbinChartConfig } from './field';
import type { HeatmapChartConfig, TreemapChartConfig } from './matrix';
import type { PieChartConfig, RadarChartConfig, RadialBarChartConfig } from './polar';
import type { CustomChartConfig, MekkoChartConfig, SankeyChartConfig } from './specialized';

// Generic chart consumers may inspect any optional capability. Concrete chart
// entities still expose their exact config type through the Chart union.
export interface GenericChartConfig
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
