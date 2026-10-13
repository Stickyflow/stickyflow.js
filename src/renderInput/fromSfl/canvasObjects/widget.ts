import type { RollingNumberWidget } from '../../../model/widget';
import type { SflWidgetObject } from '../../../sflSemantic/canvasObjects/types';

const CSS_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z][\w-]*)$/i;
const CSS_FONT_FAMILY = /^[\w\s,'"-]+$/;

function color(value: string | undefined): string | undefined {
  return value && CSS_COLOR.test(value) ? value : undefined;
}

function fontFamily(value: string | undefined): string | undefined {
  return value && CSS_FONT_FAMILY.test(value) ? value : undefined;
}

export function widgetObject(canvasObject: SflWidgetObject): RollingNumberWidget {
  const properties = canvasObject.props;
  return {
    id: canvasObject.id,
    type: 'rollingNumber',
    value: canvasObject.widget.value,
    digits: canvasObject.widget.digits,
    duration: canvasObject.widget.duration,
    label: canvasObject.widget.label,
    x: canvasObject.x,
    y: canvasObject.y,
    width: canvasObject.width,
    height: canvasObject.height,
    rotation: canvasObject.rotation,
    order: canvasObject.order,
    sourceIndex: canvasObject.sourceIndex,
    parentFrameId: canvasObject.parentFrameId,
    style: {
      color: color(properties.color),
      surface: color(properties.surface),
      divider: color(properties.divider),
      labelColor: color(properties.labelColor),
      fontFamily: fontFamily(properties.fontFamily),
    },
  };
}
