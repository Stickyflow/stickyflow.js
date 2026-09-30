import { resolveOwner, screenRectOf } from '../../domContract';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { isEditablePath } from '../propertyEdit/editable';
import { readGradientValue } from './gradientLookup';
import { parseGradient, sortStops } from './gradientValue';
import { type ColorPopoverHandle, openColorPopover } from './popover';
import { type ColorPickerThemeOption, resolveTheme } from './theme';
import { seedFrom } from './value';

interface ZoneGradientTarget {
  owner: OwnerRef;
  node: SVGGraphicsElement;
}

function resolveZoneGradientTarget(event: Event): ZoneGradientTarget | null {
  const node = (event.target as Element | null)?.closest?.(
    '[data-sf-zone-gradient="true"]',
  ) as SVGGraphicsElement | null;
  if (!node) {
    return null;
  }
  const owner = resolveOwner(node);
  if (!owner) {
    return null;
  }
  return { owner, node };
}

export class ZoneGradientSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  readonly #rules: EditableRules | undefined;
  readonly #theme: ColorPickerThemeOption | undefined;
  #open: ColorPopoverHandle | null = null;

  constructor(
    svg: SVGSVGElement,
    emitter: Emitter,
    rules: EditableRules | undefined,
    theme: ColorPickerThemeOption | undefined,
  ) {
    this.#svg = svg;
    this.#emitter = emitter;
    this.#rules = rules;
    this.#theme = theme;
  }

  readonly trigger = (event: Event): void => {
    if (!isEditablePath('zones[0][1]', this.#rules)) {
      return;
    }
    const target = resolveZoneGradientTarget(event);
    if (!target) {
      return;
    }
    event.stopPropagation();
    this.#open?.close();

    const fill = target.node.getAttribute('fill');
    const gradient = readGradientValue(this.#svg, fill);
    if (!gradient) {
      return;
    }
    const beforeStops = sortStops(gradient.stops);

    this.#open = openColorPopover({
      seed: seedFrom(fill, gradient),
      anchor: screenRectOf(target.node),
      theme: resolveTheme(this.#theme),
      allowGradient: true,
      lockStops: true,
      onCommit: value => {
        const next = parseGradient(value);
        if (!next) {
          return;
        }
        const afterStops = sortStops(next.stops);
        afterStops.forEach((stop, index) => {
          const before = beforeStops[index];
          const path = `zones[${index}][1]`;
          if (before && stop.color !== before.color && isEditablePath(path, this.#rules)) {
            this.#emitter.emit('propertyChange', { owner: target.owner, path, value: stop.color });
          }
        });
      },
    });
  };

  cancel(): void {
    this.#open?.close();
    this.#open = null;
  }
}
