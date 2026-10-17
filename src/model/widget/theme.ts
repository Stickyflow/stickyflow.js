import type { RollingNumberWidgetStyle } from './types';

export const DEFAULT_ROLLING_NUMBER_STYLE: Required<RollingNumberWidgetStyle> = {
  color: '#000000',
  surface: 'rgba(255, 255, 255, 0.28)',
  divider: 'rgba(0, 0, 0, 0.2)',
  labelColor: 'rgba(0, 0, 0, 0.62)',
  fontFamily: "'Roboto Mono', 'SFMono-Regular', Consolas, monospace",
  variant: 'flip',
  motion: 'roll',
  fontWeight: '300',
  fontSize: 0,
};

export function resolveRollingNumberStyle(style: RollingNumberWidgetStyle): Required<RollingNumberWidgetStyle> {
  return {
    color: style.color ?? DEFAULT_ROLLING_NUMBER_STYLE.color,
    surface: style.surface ?? DEFAULT_ROLLING_NUMBER_STYLE.surface,
    divider: style.divider ?? DEFAULT_ROLLING_NUMBER_STYLE.divider,
    labelColor: style.labelColor ?? DEFAULT_ROLLING_NUMBER_STYLE.labelColor,
    fontFamily: style.fontFamily ?? DEFAULT_ROLLING_NUMBER_STYLE.fontFamily,
    variant: style.variant ?? DEFAULT_ROLLING_NUMBER_STYLE.variant,
    motion: style.motion ?? DEFAULT_ROLLING_NUMBER_STYLE.motion,
    fontWeight: style.fontWeight ?? DEFAULT_ROLLING_NUMBER_STYLE.fontWeight,
    fontSize: style.fontSize ?? DEFAULT_ROLLING_NUMBER_STYLE.fontSize,
  };
}
