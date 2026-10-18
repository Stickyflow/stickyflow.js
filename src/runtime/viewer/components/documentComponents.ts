import {
  DEFAULT_ROLLING_NUMBER_STYLE,
  formatRollingNumber,
  type RollingNumberComponentStyle,
} from '../../../model/component';
import { updateRollingDigits } from './rollingNumberDom';

type RollingNumberSurface = SVGForeignObjectElement;

export interface DocumentComponentsHandle {
  setValue(componentId: string, value: string | number): boolean;
  refresh(): void;
  clearValues(): void;
  destroy(): void;
}

function findRollingNumber(svg: SVGSVGElement, componentId: string): RollingNumberSurface | undefined {
  return [...svg.querySelectorAll<RollingNumberSurface>('foreignObject[data-sf-widget="rollingNumber"]')].find(
    surface => surface.getAttribute('data-sf-id') === componentId,
  );
}

const FADE_INTERVAL = 140;

function componentDigits(surface: RollingNumberSurface): HTMLDivElement | undefined {
  return surface.querySelector<HTMLDivElement>('[data-sf-rolling-digits]') ?? undefined;
}

function componentStyle(surface: RollingNumberSurface): Required<RollingNumberComponentStyle> {
  const encoded = surface.getAttribute('data-sf-widget-style');
  if (!encoded) {
    return DEFAULT_ROLLING_NUMBER_STYLE;
  }
  try {
    return { ...DEFAULT_ROLLING_NUMBER_STYLE, ...(JSON.parse(encoded) as RollingNumberComponentStyle) };
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
  const digits = componentDigits(surface);
  if (!digits) {
    return false;
  }
  const previousValue = surface.getAttribute('data-sf-widget-value') ?? '';
  const nextValue = formatRollingNumber(value, positiveInteger(surface.getAttribute('data-sf-widget-digits')));
  if (previousValue === nextValue) {
    return true;
  }
  updateRollingDigits(digits, previousValue, nextValue, componentStyle(surface), animate ? durationFor(surface) : 0);
  surface.setAttribute('data-sf-widget-value', nextValue);
  return true;
}

export function mountDocumentComponents(svg: SVGSVGElement): DocumentComponentsHandle {
  const valueOverrides = new Map<string, string | number>();
  const lastApplied = new Map<string, number>();
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    setValue(componentId: string, value: string | number): boolean {
      const surface = findRollingNumber(svg, componentId);
      if (!surface) {
        return false;
      }
      valueOverrides.set(componentId, value);
      if (componentStyle(surface).motion !== 'fade') {
        return setRollingNumber(surface, value, true);
      }
      const now = Date.now();
      const wait = (lastApplied.get(componentId) ?? 0) + FADE_INTERVAL - now;
      if (wait <= 0) {
        lastApplied.set(componentId, now);
        return setRollingNumber(surface, value, true);
      }
      if (!pending.has(componentId)) {
        pending.set(
          componentId,
          setTimeout(() => {
            pending.delete(componentId);
            lastApplied.set(componentId, Date.now());
            const current = findRollingNumber(svg, componentId);
            const latest = valueOverrides.get(componentId);
            if (current && latest !== undefined) {
              setRollingNumber(current, latest, true);
            }
          }, wait),
        );
      }
      return true;
    },
    refresh(): void {
      for (const [componentId, value] of valueOverrides) {
        const surface = findRollingNumber(svg, componentId);
        if (surface) {
          setRollingNumber(surface, value, false);
        }
      }
    },
    clearValues(): void {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
      valueOverrides.clear();
    },
    destroy(): void {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
      valueOverrides.clear();
    },
  };
}
