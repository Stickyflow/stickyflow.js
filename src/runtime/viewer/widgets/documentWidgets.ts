import {
  DEFAULT_ROLLING_NUMBER_STYLE,
  formatRollingNumber,
  type RollingNumberWidgetStyle,
} from '../../../model/widget';
import { updateRollingDigits } from './rollingNumberDom';

type RollingNumberSurface = SVGForeignObjectElement;

export interface DocumentWidgetsHandle {
  setValue(widgetId: string, value: string | number): boolean;
  refresh(): void;
  destroy(): void;
}

function findRollingNumber(svg: SVGSVGElement, widgetId: string): RollingNumberSurface | undefined {
  return [...svg.querySelectorAll<RollingNumberSurface>('foreignObject[data-sf-widget="rollingNumber"]')].find(
    surface => surface.getAttribute('data-sf-id') === widgetId,
  );
}

const FADE_INTERVAL = 140;

function widgetDigits(surface: RollingNumberSurface): HTMLDivElement | undefined {
  return surface.querySelector<HTMLDivElement>('[data-sf-rolling-digits]') ?? undefined;
}

function widgetStyle(surface: RollingNumberSurface): Required<RollingNumberWidgetStyle> {
  const encoded = surface.getAttribute('data-sf-widget-style');
  if (!encoded) {
    return DEFAULT_ROLLING_NUMBER_STYLE;
  }
  try {
    return { ...DEFAULT_ROLLING_NUMBER_STYLE, ...(JSON.parse(encoded) as RollingNumberWidgetStyle) };
  } catch {
    return DEFAULT_ROLLING_NUMBER_STYLE;
  }
}

function positiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function durationFor(surface: RollingNumberSurface): number {
  const duration = Number(surface.getAttribute('data-sf-widget-duration'));
  if (!Number.isFinite(duration) || duration < 0) {
    return 420;
  }
  const reduceMotion = surface.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return reduceMotion ? 0 : duration;
}

function setRollingNumber(surface: RollingNumberSurface, value: string | number, animate: boolean): boolean {
  const digits = widgetDigits(surface);
  if (!digits) {
    return false;
  }
  const previousValue = surface.getAttribute('data-sf-widget-value') ?? '';
  const nextValue = formatRollingNumber(value, positiveInteger(surface.getAttribute('data-sf-widget-digits')));
  if (previousValue === nextValue) {
    return true;
  }
  updateRollingDigits(digits, previousValue, nextValue, widgetStyle(surface), animate ? durationFor(surface) : 0);
  surface.setAttribute('data-sf-widget-value', nextValue);
  return true;
}

export function mountDocumentWidgets(svg: SVGSVGElement): DocumentWidgetsHandle {
  const valueOverrides = new Map<string, string | number>();
  const lastApplied = new Map<string, number>();
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    setValue(widgetId: string, value: string | number): boolean {
      const surface = findRollingNumber(svg, widgetId);
      if (!surface) {
        return false;
      }
      valueOverrides.set(widgetId, value);
      if (widgetStyle(surface).motion !== 'fade') {
        return setRollingNumber(surface, value, true);
      }
      // A fading display settles on the latest value at most every FADE_INTERVAL ms, so fast data does not flicker.
      const now = Date.now();
      const wait = (lastApplied.get(widgetId) ?? 0) + FADE_INTERVAL - now;
      if (wait <= 0) {
        lastApplied.set(widgetId, now);
        return setRollingNumber(surface, value, true);
      }
      if (!pending.has(widgetId)) {
        pending.set(
          widgetId,
          setTimeout(() => {
            pending.delete(widgetId);
            lastApplied.set(widgetId, Date.now());
            const current = findRollingNumber(svg, widgetId);
            const latest = valueOverrides.get(widgetId);
            if (current && latest !== undefined) {
              setRollingNumber(current, latest, true);
            }
          }, wait),
        );
      }
      return true;
    },
    refresh(): void {
      for (const [widgetId, value] of valueOverrides) {
        const surface = findRollingNumber(svg, widgetId);
        if (surface) {
          setRollingNumber(surface, value, false);
        }
      }
    },
    destroy(): void {
      pending.forEach(timer => clearTimeout(timer));
      pending.clear();
      valueOverrides.clear();
    },
  };
}
