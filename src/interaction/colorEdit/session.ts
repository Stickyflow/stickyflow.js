import { screenRectOf } from '../../domContract';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { readGradientValue } from './gradientLookup';
import { type ColorPopoverHandle, openColorPopover } from './popover';
import type { ColorEditTarget } from './target';
import { type ColorPickerThemeOption, resolveTheme } from './theme';
import { seedFrom } from './value';

export type ColorEditResolver = (event: Event, rules: EditableRules | undefined) => ColorEditTarget | null;

export class ColorEditSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  readonly #rules: EditableRules | undefined;
  readonly #theme: ColorPickerThemeOption | undefined;
  readonly #resolve: ColorEditResolver;
  #open: ColorPopoverHandle | null = null;

  constructor(
    svg: SVGSVGElement,
    emitter: Emitter,
    rules: EditableRules | undefined,
    theme: ColorPickerThemeOption | undefined,
    resolve: ColorEditResolver,
  ) {
    this.#svg = svg;
    this.#emitter = emitter;
    this.#rules = rules;
    this.#theme = theme;
    this.#resolve = resolve;
  }

  readonly trigger = (event: Event): void => {
    const target = this.#resolve(event, this.#rules);
    if (!target) {
      return;
    }
    event.stopPropagation();
    this.#open?.close();

    const fill = target.node.getAttribute('fill');
    this.#open = openColorPopover({
      seed: seedFrom(fill, readGradientValue(this.#svg, fill)),
      anchor: screenRectOf(target.node),
      theme: resolveTheme(this.#theme),
      onCommit: color => {
        this.#emitter.emit('propertyChange', { owner: target.owner, path: target.path, value: color });
      },
    });
  };

  cancel(): void {
    this.#open?.close();
    this.#open = null;
  }
}
