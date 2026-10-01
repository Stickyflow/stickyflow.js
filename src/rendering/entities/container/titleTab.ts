import {
  bottomRoundedRectPath,
  leftRoundedRectPath,
  rightRoundedRectPath,
  topRoundedRectPath,
} from '../../../model/geometry/rectangle';
import type { Bounds, RenderNode } from '../../scene';
import { boxBounds, DEFAULT_FONT } from '../../scene';

export type TitleTabPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TitleTabInput {
  tabId: string;
  titleId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  strokeWidth: number;
  title: string;
  color: string;
  textColor: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  labelPosition: TitleTabPosition;
  order: number;
}

interface TabBox {
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
}

const TAB_RADIUS = 8;

function tabBox(input: TitleTabInput, thickness: number, length: number): TabBox {
  const inset = input.strokeWidth / 2;
  switch (input.labelPosition) {
    case 'bottom': {
      const x = input.x - inset;
      const y = input.y + input.height;
      return {
        x,
        y,
        width: length,
        height: thickness,
        path: bottomRoundedRectPath(x, y, length, thickness, TAB_RADIUS),
      };
    }
    case 'left': {
      const x = input.x - thickness;
      const y = input.y - inset;
      return { x, y, width: thickness, height: length, path: leftRoundedRectPath(x, y, thickness, length, TAB_RADIUS) };
    }
    case 'right': {
      const x = input.x + input.width;
      const y = input.y - inset;
      return {
        x,
        y,
        width: thickness,
        height: length,
        path: rightRoundedRectPath(x, y, thickness, length, TAB_RADIUS),
      };
    }
    default: {
      const x = input.x - inset;
      const y = input.y - thickness;
      return { x, y, width: length, height: thickness, path: topRoundedRectPath(x, y, length, thickness, TAB_RADIUS) };
    }
  }
}

export function renderTitleTab(input: TitleTabInput): RenderNode[] {
  const thickness = Math.max(32, input.fontSize + 18);
  const padding = 16;
  const length = Math.max(120, input.title.length * input.fontSize * 0.62 + padding * 2);
  const box = tabBox(input, thickness, length);
  const bounds = boxBounds(box, 6);
  const vertical = input.labelPosition === 'left' || input.labelPosition === 'right';
  return [
    {
      type: 'path',
      id: input.tabId,
      order: input.order + 0.1,
      bounds,
      d: box.path,
      style: {
        fill: { kind: 'solid', color: input.color },
        stroke: { kind: 'none' },
      },
    },
    vertical ? verticalTitleText(input, box, padding, bounds) : horizontalTitleText(input, box, padding, bounds),
  ];
}

function horizontalTitleText(input: TitleTabInput, box: TabBox, padding: number, bounds: Bounds): RenderNode {
  return {
    type: 'text',
    id: input.titleId,
    order: input.order + 0.2,
    bounds,
    x: box.x + padding,
    y: box.y,
    width: Math.max(0, box.width - padding * 2),
    height: box.height,
    lines: [input.title],
    fontFamily: input.fontFamily ?? DEFAULT_FONT,
    fontSize: input.fontSize,
    fontWeight: input.fontWeight,
    color: input.textColor,
    align: 'left',
    verticalAlign: 'middle',
    lineHeight: 1.2,
  };
}

function verticalTitleText(input: TitleTabInput, box: TabBox, padding: number, bounds: Bounds): RenderNode {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const textThickness = input.fontSize * 1.4;
  const textLength = Math.max(1, box.height - padding * 2);
  return {
    type: 'text',
    id: input.titleId,
    order: input.order + 0.2,
    bounds,
    x: centerX - textLength / 2,
    y: centerY - textThickness / 2,
    width: textLength,
    height: textThickness,
    lines: [input.title],
    fontFamily: input.fontFamily ?? DEFAULT_FONT,
    fontSize: input.fontSize,
    fontWeight: input.fontWeight,
    color: input.textColor,
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation: -90,
    rotationCenter: { x: centerX, y: centerY },
  };
}
