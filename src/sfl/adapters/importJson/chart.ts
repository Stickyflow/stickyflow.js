import type { SflEntityOut } from '../../sflToCanvasState'
import { decodeColor, decodeRamp } from '../decodeStyles'
import { numOf } from './values'

export function chartObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id, type: 'chart', title: e.text ?? null,
    x: e.x, y: e.y, width: e.width, height: e.height,
    chart_type: e.chart?.chartType ?? 'bar',
    axis_x: e.chart?.axisX ?? { min: 0, max: 4, step: 1 },
    axis_y: e.chart?.axisY ?? { min: 0, max: 500, step: 100 },
    config: {
      categories: e.chart?.categories, areaOpacity: e.chart?.areaOpacity, stacked: e.chart?.stacked,
      // Fields §3.4.
      scale: decodeRamp(e.chart?.scale), interpolate: e.chart?.interpolate,
      idwPower: e.chart?.idwPower, isolines: e.chart?.isolines,
      // Heatmap only.
      zones: e.chart?.zones,
      // Boxplot only.
      boxWidth: e.chart?.boxWidth, barCornerRadius: e.chart?.barCornerRadius,
      showBoxplotPoints: e.chart?.showBoxplotPoints, barBorderColor: e.chart?.barBorderColor, barBorderWidth: e.chart?.barBorderWidth,
      // Mekko only.
      mekkoVaryHeight: e.chart?.mekkoVaryHeight,
      // Hexbin only.
      hexRadius: e.chart?.hexRadius,
      // Pie only.
      innerRadius: e.chart?.innerRadius,
    },
    // decodeColor so a series can be a gradient too, the same as a shape's
    // fillColor above - paint() in buildRenderScene.ts renders the decoded
    // object; a plain hex/rgba/name still passes through verbatim.
    series: (e.chart?.series ?? []).map(s => ({ ...s, color: decodeColor(s.color) })),
    rules: (e.chart?.rules ?? []).map(r => ({ id: r.id, at: r.at, text: r.text, color: r.color, stroke_width: r.strokeWidth, dash: r.dash })),
    fill_color: decodeColor(p.fill) ?? '#ffffff', stroke_color: decodeColor(p.stroke) ?? '#475569',
    stroke_width: numOf(p.strokeWidth) ?? 1, corner_radius: numOf(p.cornerRadius) ?? 12,
    grid_color: p.gridColor ?? '#e2e8f0', grid_width: numOf(p.gridWidth) ?? 1,
    text_color: p.textColor ?? '#0f172a', font_size: numOf(p.fontSize) ?? 12,
    font_family: p.fontFamily ?? 'Inter', show_grid: p.showGrid !== 'false',
    show_axis_labels: p.showAxisLabels !== 'false', show_legend: p.showLegend !== 'false', order: e.order,
  };
}
