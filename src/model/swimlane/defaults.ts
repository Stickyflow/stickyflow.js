import type { Lane } from './types';

export const DEFAULT_LANE_SIZE = 150;
export const SWIMLANE_CORNER_RADIUS = 12;

export function createDefaultLanes(count: number = 2): Lane[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `lane-${i + 1}`,
    label: `Lane ${i + 1}`,
    size: DEFAULT_LANE_SIZE,
    color: null,
  }));
}

export const SWIMLANE_DEFAULTS = {
  width: 600,
  height: 300,
  title: 'Swimlane',
  orientation: 'horizontal' as const,
  lanes: createDefaultLanes(2),
  stroke_color: '#6b7280',
  stroke_width: 2,
  dash: [] as number[],
  corner_radius: SWIMLANE_CORNER_RADIUS,
  fill_color: 'rgba(107, 114, 128, 0.05)',
  text_color: '#6b7280',
  font_size: 22,
  font_weight: 'bold' as const,
  font_family: "'Inter', sans-serif",
  show_lane_labels: true,
  layer_group: 'background',
  order_key: 'e',
};
