import type { RollingNumberWidget, TickScaleWidget } from '../../../model/widget';
import type { SflWidgetObject } from '../../../sflSemantic/canvasObjects/types';

const CSS_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z][\w-]*)$/i;
const CSS_FONT_FAMILY = /^[\w\s,'"-]+$/;

function color(value: string | undefined): string | undefined {
  return value && CSS_COLOR.test(value) ? value : undefined;
}

function fontFamily(value: string | undefined): string | undefined {
  return value && CSS_FONT_FAMILY.test(value) ? value : undefined;
}

const FONT_WEIGHT = /^(?:[1-9]00|normal|bold)$/;

function variant(value: string | undefined): 'flip' | 'plain' | undefined {
  return value === 'plain' || value === 'flip' ? value : undefined;
}

function motion(value: string | undefined): 'roll' | 'fade' | undefined {
  return value === 'roll' || value === 'fade' ? value : undefined;
}

function fontWeight(value: string | undefined): string | undefined {
  return value && FONT_WEIGHT.test(value) ? value : undefined;
}

const TICK_SCALE_NUMBERS = ['ticks', 'major', 'radius', 'length', 'thickness', 'start', 'sweep', 'intensity'] as const;
const TICK_SCALE_COLORS = ['color', 'accent'] as const;

function tickScaleObject(canvasObject: SflWidgetObject): TickScaleWidget {
  const properties = canvasObject.props;
  const parameters: Record<string, string | number> = {};
  for (const key of TICK_SCALE_NUMBERS) {
    const value = Number(properties[key]);
    if (properties[key] !== undefined && Number.isFinite(value)) {
      parameters[key] = value;
    }
  }
  for (const key of TICK_SCALE_COLORS) {
    const value = color(properties[key]);
    if (value) {
      parameters[key] = value;
    }
  }
  return {
    id: canvasObject.id,
    type: 'tickScale',
    value: canvasObject.widget.value,
    max: canvasObject.widget.max,
    label: canvasObject.widget.label,
    x: canvasObject.x,
    y: canvasObject.y,
    width: canvasObject.width,
    height: canvasObject.height,
    rotation: canvasObject.rotation,
    order: canvasObject.order,
    sourceIndex: canvasObject.sourceIndex,
    parentFrameId: canvasObject.parentFrameId,
    parameters,
    labels:
      properties.labels === 'true'
        ? {
            size: Number.isFinite(Number(properties.labelSize)) && properties.labelSize !== undefined ? Number(properties.labelSize) : undefined,
            color: color(properties.labelColor),
            offset: Number.isFinite(Number(properties.labelOffset)) && properties.labelOffset !== undefined ? Number(properties.labelOffset) : undefined,
            weight: fontWeight(properties.labelWeight),
            fontFamily: fontFamily(properties.labelFont),
          }
        : undefined,
  };
}

export function widgetObject(canvasObject: SflWidgetObject): RollingNumberWidget | TickScaleWidget {
  if (canvasObject.widget.type === 'tickScale') {
    return tickScaleObject(canvasObject);
  }
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
      variant: variant(properties.variant),
      motion: motion(properties.motion),
      fontWeight: fontWeight(properties.fontWeight),
    },
  };
}
