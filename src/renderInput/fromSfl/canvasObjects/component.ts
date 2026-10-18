import type { RollingNumberComponent, RulerComponent, TickScaleComponent } from '../../../model/component';
import type { SflComponentObject } from '../../../sflSemantic/canvasObjects/types';

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

function positiveNumber(value: string | undefined): number | undefined {
  const number = Number(value);
  return value !== undefined && Number.isFinite(number) && number > 0 ? number : undefined;
}

function fontWeight(value: string | undefined): string | undefined {
  return value && FONT_WEIGHT.test(value) ? value : undefined;
}

const TICK_SCALE_NUMBERS = [
  'ticks',
  'major',
  'radius',
  'length',
  'thickness',
  'round',
  'start',
  'sweep',
  'intensity',
] as const;
const TICK_SCALE_COLORS = ['color', 'accent'] as const;

function tickScaleObject(canvasObject: SflComponentObject): TickScaleComponent {
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
    value: canvasObject.component.value,
    max: canvasObject.component.max,
    label: canvasObject.component.label,
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
            size:
              Number.isFinite(Number(properties.labelSize)) && properties.labelSize !== undefined
                ? Number(properties.labelSize)
                : undefined,
            color: color(properties.labelColor),
            offset:
              Number.isFinite(Number(properties.labelOffset)) && properties.labelOffset !== undefined
                ? Number(properties.labelOffset)
                : undefined,
            weight: fontWeight(properties.labelWeight),
            fontFamily: fontFamily(properties.labelFont),
          }
        : undefined,
  };
}

const RULER_NUMBERS = [
  'ticks',
  'major',
  'length',
  'thickness',
  'round',
  'dent',
  'spread',
  'inset',
  'line',
  'gap',
  'intensity',
] as const;
const RULER_COLORS = ['color', 'accent', 'glow'] as const;
const RULER_DEFAULTS = { color: '#8f95c4', accent: '#d9f270', glow: '#3ddc84' };
const RULER_OPTIONAL_COLORS = ['core', 'peak'] as const;

function rulerObject(canvasObject: SflComponentObject): RulerComponent {
  const properties = canvasObject.props;
  const parameters: Record<string, string | number> = {};
  for (const key of RULER_NUMBERS) {
    const value = Number(properties[key]);
    if (properties[key] !== undefined && Number.isFinite(value)) {
      parameters[key] = value;
    }
  }
  for (const key of RULER_COLORS) {
    parameters[key] = color(properties[key]) ?? RULER_DEFAULTS[key];
  }
  for (const key of RULER_OPTIONAL_COLORS) {
    const value = color(properties[key]);
    if (value) {
      parameters[key] = value;
    }
  }
  parameters.axis = properties.axis === 'horizontal' ? 'horizontal' : 'vertical';
  if (properties.knob) {
    parameters.knob = properties.knob;
  }
  return {
    id: canvasObject.id,
    type: 'ruler',
    value: canvasObject.component.value,
    min: canvasObject.component.min,
    max: canvasObject.component.max,
    label: canvasObject.component.label,
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
            size:
              Number.isFinite(Number(properties.labelSize)) && properties.labelSize !== undefined
                ? Number(properties.labelSize)
                : undefined,
            color: color(properties.labelColor),
            offset:
              Number.isFinite(Number(properties.labelOffset)) && properties.labelOffset !== undefined
                ? Number(properties.labelOffset)
                : undefined,
            weight: fontWeight(properties.labelWeight),
            fontFamily: fontFamily(properties.labelFont),
          }
        : undefined,
  };
}

export function componentObject(
  canvasObject: SflComponentObject,
): RollingNumberComponent | TickScaleComponent | RulerComponent {
  if (canvasObject.component.type === 'tickScale') {
    return tickScaleObject(canvasObject);
  }
  if (canvasObject.component.type === 'ruler') {
    return rulerObject(canvasObject);
  }
  const properties = canvasObject.props;
  return {
    id: canvasObject.id,
    type: 'rollingNumber',
    value: canvasObject.component.value,
    digits: canvasObject.component.digits,
    duration: canvasObject.component.duration,
    label: canvasObject.component.label,
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
      fontSize: positiveNumber(properties.fontSize),
    },
  };
}
