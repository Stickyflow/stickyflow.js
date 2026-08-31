import type { Frame } from '../../model/frames';
import type { Swimlane } from '../../model/swimlanes';
import { boxBounds, DEFAULT_FONT, orderOf, rotatedBounds } from '../renderPrimitives';
import type { RenderNode, SceneStyle } from '../renderScene';

export function simpleContainerStyle(fill: string, stroke: string, strokeWidth: number, dash?: number[]): SceneStyle {
  return {
    fill: { kind: 'solid', color: fill || 'transparent' },
    stroke: { kind: 'solid', color: stroke },
    strokeWidth,
    dash: dash?.length ? dash : undefined,
  };
}

export function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} V ${y + height} H ${x} Z`;
}

export function bottomRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y} H ${x + width} V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} Z`;
}

function titleTabNodes(
  tabId: string,
  titleId: string,
  x: number,
  y: number,
  cornerRadius: number,
  title: string,
  tabColor: string,
  fontFamily: string | undefined,
  fontSize: number,
  fontWeight: 'normal' | 'bold',
  order: number,
): RenderNode[] {
  const tabHeight = Math.max(32, fontSize + 18);
  const tabPadding = 16;
  const tabWidth = Math.max(120, title.length * fontSize * 0.62 + tabPadding * 2);
  const tabX = x + Math.max(12, cornerRadius);
  const tabY = y - tabHeight;
  const tabBounds = boxBounds(tabX, tabY, tabWidth, tabHeight, 6);
  return [
    {
      type: 'rect',
      id: tabId,
      order: order + 0.1,
      bounds: tabBounds,
      x: tabX,
      y: tabY,
      width: tabWidth,
      height: tabHeight,
      rx: 8,
      style: {
        fill: { kind: 'solid', color: tabColor },
        stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: 0.1, blur: 4, dx: 0, dy: 2 },
      },
    },
    {
      type: 'text',
      id: titleId,
      order: order + 0.2,
      bounds: tabBounds,
      x: tabX + tabPadding,
      y: tabY,
      width: Math.max(0, tabWidth - tabPadding * 2),
      height: tabHeight,
      lines: [title],
      fontFamily: fontFamily ?? DEFAULT_FONT,
      fontSize,
      fontWeight,
      color: '#ffffff',
      align: 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
    },
  ];
}

export function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.is_visible === false) return [];
  const order = orderOf(frame, index);
  const bodyBounds = boxBounds(frame.x, frame.y, frame.width, frame.height, frame.stroke_width + 4);
  const nodes: RenderNode[] = [
    {
      type: 'rect',
      id: `frame-${frame.id}`,
      order,
      bounds: bodyBounds,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rx: frame.corner_radius,
      style: simpleContainerStyle(frame.fill_color, frame.stroke_color, frame.stroke_width, frame.dash),
    },
  ];
  if ((frame.show_label ?? true) && frame.title) {
    nodes.push(
      ...titleTabNodes(
        `frame-tab-${frame.id}`,
        `frame-title-${frame.id}`,
        frame.x,
        frame.y,
        frame.corner_radius,
        frame.title,
        frame.stroke_color,
        frame.font_family,
        frame.font_size,
        frame.font_weight,
        order,
      ),
    );
  }
  return nodes;
}

export function buildSwimlane(swimlane: Swimlane, index: number): RenderNode[] {
  if (swimlane.is_visible === false) return [];
  const order = orderOf(swimlane, 5_000 + index),
    bounds = boxBounds(swimlane.x, swimlane.y, swimlane.width, swimlane.height, swimlane.stroke_width + 4);
  const style = simpleContainerStyle(swimlane.fill_color, swimlane.stroke_color, swimlane.stroke_width, swimlane.dash);
  const nodes: RenderNode[] = [
    {
      type: 'rect',
      id: `swimlane-${swimlane.id}`,
      order,
      bounds,
      x: swimlane.x,
      y: swimlane.y,
      width: swimlane.width,
      height: swimlane.height,
      rx: swimlane.corner_radius,
      style,
    },
  ];
  const targetSize = swimlane.orientation === 'horizontal' ? swimlane.height : swimlane.width;
  const laneTotal = swimlane.lanes.reduce((sum, lane) => sum + lane.size, 0);
  const lanes =
    laneTotal > 0 && targetSize > 0
      ? swimlane.lanes.map(lane => ({ ...lane, size: lane.size * (targetSize / laneTotal) }))
      : swimlane.lanes;
  let cursor = 0;
  lanes.slice(0, -1).forEach((lane, laneIndex) => {
    cursor += lane.size;
    const d =
      swimlane.orientation === 'horizontal'
        ? `M ${swimlane.x} ${swimlane.y + cursor} H ${swimlane.x + swimlane.width}`
        : `M ${swimlane.x + cursor} ${swimlane.y} V ${swimlane.y + swimlane.height}`;
    nodes.push({
      type: 'path',
      id: `swimlane-divider-${swimlane.id}-${laneIndex}`,
      order: order + 0.1 + laneIndex / 100,
      bounds,
      d,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: swimlane.stroke_color },
        strokeWidth: swimlane.stroke_width,
      },
    });
  });
  if (swimlane.show_lane_labels) {
    cursor = 0;
    const fontSize = swimlane.font_size;
    lanes.forEach((lane, laneIndex) => {
      const horizontal = swimlane.orientation === 'horizontal';
      const base = {
        id: `swimlane-label-${swimlane.id}-${lane.id}`,
        order: order + 0.5 + laneIndex / 100,
        fontFamily: swimlane.font_family ?? DEFAULT_FONT,
        fontSize,
        fontWeight: swimlane.font_weight,
        color: swimlane.text_color,
        lineHeight: 1.2,
      } as const;
      if (horizontal) {
        const thickness = fontSize * 1.4;
        const cx = swimlane.x + 10 + thickness / 2,
          cy = swimlane.y + cursor + lane.size / 2;
        const width = Math.max(20, lane.size - 16);
        const labelBounds = rotatedBounds(cx - width / 2, cy - thickness / 2, width, thickness, -90, 12);
        nodes.push({
          ...base,
          type: 'text',
          bounds: labelBounds,
          x: cx - width / 2,
          y: cy - thickness / 2,
          width,
          height: thickness,
          lines: [lane.label],
          align: 'center',
          verticalAlign: 'middle',
          rotation: -90,
          rotationCenter: { x: cx, y: cy },
        });
      } else {
        const x = swimlane.x + cursor + 8,
          y = swimlane.y + 8;
        const width = Math.max(0, lane.size - 16),
          height = Math.max(0, swimlane.height - 16);
        nodes.push({
          ...base,
          type: 'text',
          bounds,
          x,
          y,
          width,
          height,
          lines: [lane.label],
          align: 'left',
          verticalAlign: 'top',
        });
      }
      cursor += lane.size;
    });
  }
  return nodes;
}
