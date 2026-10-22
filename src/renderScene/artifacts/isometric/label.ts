import { isometricTopFaceCenter } from '../../../model/isometricObject';
import type { RenderNode, ScenePath, SceneRect, SceneText } from '../../scene';
import { DEFAULT_FONT, finite } from '../../scene';
import type { IsometricContext, Point } from './context';

const LABEL_HEIGHT = 20;
const LABEL_GAP = 12;
const LABEL_PADDING_X = 6;
const LABEL_PADDING_Y = 3;
const LABEL_CHAR_WIDTH = 6.5;

interface LabelPlacement {
  anchor: Point;
  centerX: number;
  topY: number;
  bottomY: number;
}

function labelPlacement(context: IsometricContext): LabelPlacement {
  const { object } = context;
  const anchor = isometricTopFaceCenter(object);
  const bottomY = anchor.y - LABEL_GAP + finite(object.labelOffsetY, 0);
  return { anchor, centerX: anchor.x + finite(object.labelOffsetX, 0), topY: bottomY - LABEL_HEIGHT, bottomY };
}

function labelTextNode(context: IsometricContext, placement: LabelPlacement, text: string): SceneText {
  const { object, order, rotation, rotationCenter, box } = context;
  const { centerX, topY, bottomY } = placement;
  return {
    type: 'text',
    id: `isometric-${object.id}-label`,
    order: order + 0.3,
    bounds: { minX: centerX - box.width / 2, minY: topY, maxX: centerX + box.width / 2, maxY: bottomY },
    x: centerX - box.width / 2,
    y: topY,
    width: box.width,
    height: LABEL_HEIGHT,
    lines: [text],
    fontFamily: DEFAULT_FONT,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#111827',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation,
    rotationCenter,
    mark: 'isometric-label',
  };
}

function labelGuideNode(context: IsometricContext, placement: LabelPlacement): ScenePath {
  const { object, order, rotation, rotationCenter } = context;
  const { anchor, centerX, bottomY } = placement;
  return {
    type: 'path',
    id: `isometric-${object.id}-label-guide`,
    order: order + 0.25,
    bounds: {
      minX: Math.min(anchor.x, centerX),
      minY: Math.min(anchor.y, bottomY),
      maxX: Math.max(anchor.x, centerX),
      maxY: Math.max(anchor.y, bottomY),
    },
    d: `M ${anchor.x} ${anchor.y} L ${centerX} ${bottomY}`,
    rotation,
    rotationCenter,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: 1,
      lineCap: 'round',
      pointerEvents: 'none',
    },
  };
}

function labelBackgroundNode(
  context: IsometricContext,
  placement: LabelPlacement,
  text: string,
  background: string,
): SceneRect {
  const { object, order, rotation } = context;
  const { centerX, topY, bottomY } = placement;
  const width = Math.max(24, text.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X * 2);
  return {
    type: 'rect',
    id: `isometric-${object.id}-label-background`,
    order: order + 0.28,
    x: centerX - width / 2,
    y: topY - LABEL_PADDING_Y,
    width,
    height: LABEL_HEIGHT + LABEL_PADDING_Y * 2,
    rx: 4,
    bounds: {
      minX: centerX - width / 2,
      minY: topY - LABEL_PADDING_Y,
      maxX: centerX + width / 2,
      maxY: bottomY + LABEL_PADDING_Y,
    },
    rotation,
    mark: 'isometric-label',
    style: { fill: { kind: 'solid', color: background }, stroke: { kind: 'none' } },
  };
}

export function labelNodes(context: IsometricContext, text: string): RenderNode[] {
  const placement = labelPlacement(context);
  const label = labelTextNode(context, placement, text);
  const guide = labelGuideNode(context, placement);
  const background = context.object.labelBackground;
  if (!background) {
    return [guide, label];
  }
  return [guide, labelBackgroundNode(context, placement, text, background), label];
}
