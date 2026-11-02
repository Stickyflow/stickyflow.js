import type { BindingRuntime } from '../../binding';
import { type GenericComponent, getComponentDescriptor, isGenericComponent } from '../../model/component';
import { DEFAULT_FONT } from '../../renderScene/scene';
import type { InteractionOptions } from './connectInteraction';
import type { Viewer } from './types';

const AUTOCOMPLETE: Record<string, string> = { password: 'current-password', email: 'username' };

const AUTOFILL = `[data-sf-text-field]:-webkit-autofill { -webkit-text-fill-color: var(--sf-ink); transition: background-color 9999s ease-out 0s; }`;

// On the element itself, as the styles of the page around it may say otherwise about every input.
const FIELD_STYLE =
  'position:absolute;box-sizing:border-box;margin:0;border:0;border-radius:0;outline:0;box-shadow:none;background:transparent;pointer-events:auto;appearance:none;min-width:0;max-width:none';

function componentOf(runtime: BindingRuntime, id: string): GenericComponent | undefined {
  const component = (runtime.input.components ?? runtime.input.widgets)?.find(item => item.id === id);
  return component && isGenericComponent(component) ? component : undefined;
}

function fieldInput(runtime: BindingRuntime, id: string, host: HTMLElement): HTMLInputElement {
  const input = host.ownerDocument.createElement('input');
  input.setAttribute('data-sf-text-field', id);
  input.name = id;
  input.style.cssText = FIELD_STYLE;
  input.addEventListener('input', () => runtime.change(id, input.value));
  input.addEventListener('focus', () => runtime.focus(id, true));
  input.addEventListener('blur', () => runtime.focus(id, false));
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.isComposing) {
      runtime.submit(id);
    } else if (event.key === 'Escape') {
      input.blur();
    }
  });
  for (const type of ['keyup', 'keypress', 'pointerdown', 'pointerup', 'mousedown', 'click', 'dblclick', 'wheel']) {
    input.addEventListener(type, event => event.stopPropagation());
  }
  host.append(input);
  return input;
}

// The stage around the drawing may be scaled, and what is on the page is measured with that scale but placed without it.
function placeField(
  input: HTMLInputElement,
  component: GenericComponent,
  box: DOMRect,
  host: DOMRect,
  stage: number,
): void {
  const width = box.width / stage;
  const scale = width / Math.max(1, component.width);
  const { properties: p } = component;
  const type = p.format === 'password' || p.format === 'email' ? String(p.format) : 'text';
  if (input.type !== type) {
    input.type = type;
  }
  input.autocomplete = (AUTOCOMPLETE[type] ?? 'off') as AutoFill;
  input.disabled = component.disabled;
  input.setAttribute('aria-label', component.label ?? String(p.placeholder ?? component.id));
  const focused = input.ownerDocument.activeElement === input;
  const ink = String(p.textColor);
  const place: Partial<CSSStyleDeclaration> = {
    display: 'block',
    left: `${(box.left - host.left) / stage}px`,
    top: `${(box.top - host.top) / stage}px`,
    width: `${width}px`,
    height: `${box.height / stage}px`,
    padding: `0 ${Number(p.padding) * scale}px`,
    font: `400 ${Number(p.fontSize) * scale}px ${DEFAULT_FONT}`,
    // The drawing shows the text, until the field has the focus and the browser does.
    color: focused ? ink : 'transparent',
    caretColor: String(p.accent),
  };
  Object.assign(input.style, place);
  input.style.setProperty('--sf-ink', focused ? ink : 'transparent');
}

// Every text field gets a real input over its place in the drawing, which is kept out of the drawing so that drawing anew does not take its
// focus away. That brings typing, the caret, selecting, filling in by the browser, screen readers and the keyboard of a phone.
export function connectTextFields(
  viewer: Viewer,
  runtime: BindingRuntime,
  options: InteractionOptions = {},
): () => void {
  const ids = [...runtime.graph.elements]
    .filter(([, info]) => getComponentDescriptor(info.componentType)?.interaction === 'type')
    .map(([id]) => id);
  const parent = viewer.svg.parentElement;
  if (ids.length === 0 || !parent) {
    return () => undefined;
  }
  const document = parent.ownerDocument;
  const view = document.defaultView;
  if (view?.getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none';
  const styles = document.createElement('style');
  styles.textContent = AUTOFILL;
  host.append(styles);
  parent.append(host);
  const inputs = new Map(ids.map(id => [id, fieldInput(runtime, id, host)]));

  const follow = () => {
    const area = host.getBoundingClientRect();
    const usable = options.enabled?.() !== false;
    for (const [id, input] of inputs) {
      const component = componentOf(runtime, id);
      const node = viewer.svg.querySelector(`[data-sf-primary][data-sf-id="${CSS.escape(id)}"]`);
      if (!component || !node || !usable) {
        input.blur();
        input.style.display = 'none';
        continue;
      }
      const value = String(component.value ?? '');
      if (input.value !== value) {
        input.value = value;
      }
      placeField(input, component, node.getBoundingClientRect(), area, area.width / Math.max(1, host.offsetWidth) || 1);
    }
    frame = window.requestAnimationFrame(follow);
  };
  let frame = window.requestAnimationFrame(follow);

  return () => {
    window.cancelAnimationFrame(frame);
    for (const input of inputs.values()) {
      input.blur();
    }
    host.remove();
  };
}
