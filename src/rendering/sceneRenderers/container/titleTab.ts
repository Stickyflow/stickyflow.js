import { boxBounds, DEFAULT_FONT } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';

export interface TitleTabInput {
  tabId: string;
  titleId: string;
  x: number;
  y: number;
  cornerRadius: number;
  title: string;
  color: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  order: number;
}

export function renderTitleTab(input: TitleTabInput): RenderNode[] {
  const height = Math.max(32, input.fontSize + 18);
  const padding = 16;
  const width = Math.max(120, input.title.length * input.fontSize * 0.62 + padding * 2);
  const x = input.x + Math.max(12, input.cornerRadius);
  const y = input.y - height;
  const bounds = boxBounds({ x, y, width, height }, 6);
  return [
    {
      type: 'rect',
      id: input.tabId,
      order: input.order + 0.1,
      bounds,
      x,
      y,
      width,
      height,
      rx: 8,
      style: {
        fill: { kind: 'solid', color: input.color },
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.1, blur: 4, dx: 0, dy: 2 },
      },
    },
    {
      type: 'text',
      id: input.titleId,
      order: input.order + 0.2,
      bounds,
      x: x + padding,
      y,
      width: Math.max(0, width - padding * 2),
      height,
      lines: [input.title],
      fontFamily: input.fontFamily ?? DEFAULT_FONT,
      fontSize: input.fontSize,
      fontWeight: input.fontWeight,
      color: '#ffffff',
      align: 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
    },
  ];
}
