import type { BarChartConfig } from './bar';
import type { BoxplotChartConfig } from './boxplot';
import type { CustomChartConfig } from './custom';
import type { FieldChartConfig } from './field';
import type { HeatmapChartConfig } from './heatmap';
import type { HexbinChartConfig } from './hexbin';
import type { LineChartConfig } from './line';
import type { MekkoChartConfig } from './mekko';
import type { PieChartConfig } from './pie';
import type { RadarChartConfig } from './radar';
import type { RadialBarChartConfig } from './radialBar';
import type { SankeyChartConfig } from './sankey';
import type { TreemapChartConfig } from './treemap';

// Renderers that accept every chart type need access to every optional
// capability. Concrete Chart variants retain their exact config type.
export interface ChartConfigCapabilities
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
