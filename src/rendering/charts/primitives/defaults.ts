import type { ChartZone } from '../../../model/charts';

export const CHART_COLORS = ['#7c3aed', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#eab308'];
export const DEFAULT_ZONE_FILL = '#94a3b8';
export const DEFAULT_HEATMAP_ZONES: ChartZone[] = [
  { label: 'Low', color: '#ddd6fe' },
  { label: 'Medium', color: '#a78bfa' },
  { label: 'High', color: '#6d28d9' },
];
export const DEFAULT_MATRIX_ZONES: ChartZone[] = [
  { label: 'Eliminate', color: '#dcfce7' },
  { label: 'Delegate', color: '#fef9c3' },
  { label: 'Schedule', color: '#bfdbfe' },
  { label: 'Do First', color: '#fecaca' },
];
export const DEFAULT_HEX_RADIUS = 14;
