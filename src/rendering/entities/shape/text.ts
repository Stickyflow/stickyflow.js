import { hasBoldMarkup, wrapRichText } from '../../../model/geometry/richText';
import { heuristicRichMeasure, type MeasureTextFactory, wrapText } from '../../../model/geometry/text';
import type { SceneText } from '../../scene';
import { DEFAULT_FONT, finite } from '../../scene';
import { shapeDefaults } from './style';
import type { ShapeRenderContext } from './types';

export function renderShapeText(
  context: ShapeRenderContext,
  strokeWidth: number,
  measureText?: MeasureTextFactory,
): SceneText | null {
  const { shape, bounds, order, rotation, rotationCenter, x, y, width, height } = context;
  if (!shape.text) {
    return null;
  }
  const fontSize = finite(shape.fontSize, shapeDefaults(shape, []).fontSize);
  const padding = Math.max(8, strokeWidth * 2);
  const textWidth = Math.max(0, width - padding * 2);
  const fontFamily = shape.fontFamily || DEFAULT_FONT;
  const metrics = measureText?.(fontFamily, fontSize);
  const textNode: SceneText = {
    type: 'text',
    id: `shape-text-${shape.id}`,
    order: order + 0.5,
    bounds,
    x: x + padding,
    y: y + padding,
    width: textWidth,
    height: Math.max(0, height - padding * 2),
    lines: wrapText(shape.text, textWidth, fontSize, metrics),
    fontFamily,
    fontSize,
    fontWeight: shape.fontWeight ?? 'normal',
    color: shape.textColor || '#111827',
    align: shape.textAlign ?? 'center',
    verticalAlign: shape.textVerticalAlign ?? 'middle',
    lineHeight: finite(shape.lineHeight, 1.3),
    rotation,
    rotationCenter,
  };
  if (hasBoldMarkup(shape.text)) {
    const { measure, spaceWidth } = metrics ?? heuristicRichMeasure(fontSize);
    textNode.richLines = wrapRichText(shape.text, textWidth, measure, spaceWidth);
  }
  return textNode;
}
