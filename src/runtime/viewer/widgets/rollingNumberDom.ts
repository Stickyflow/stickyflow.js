import type { RollingNumberWidgetStyle } from '../../../model/widget';

type RollingNumberTheme = Required<RollingNumberWidgetStyle>;

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

const setStyles = (element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void => {
  Object.assign(element.style, styles);
};

function createDigit(document: Document, character: string, theme: RollingNumberTheme): HTMLSpanElement {
  const digit = document.createElementNS(HTML_NAMESPACE, 'span') as HTMLSpanElement;
  digit.setAttribute('data-sf-rolling-current', 'true');
  digit.textContent = character;
  setStyles(digit, {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    color: theme.color,
    fontWeight: theme.fontWeight,
    lineHeight: '1',
  });
  return digit;
}

function createDigitCell(document: Document, character: string, theme: RollingNumberTheme): HTMLSpanElement {
  const cell = document.createElementNS(HTML_NAMESPACE, 'span') as HTMLSpanElement;
  cell.setAttribute('data-sf-rolling-digit', 'true');
  if (theme.variant === 'plain') {
    setStyles(cell, { position: 'relative', display: 'inline-block', width: '0.62em', height: '1.1em', overflow: 'hidden' });
    cell.appendChild(createDigit(document, character, theme));
    return cell;
  }
  setStyles(cell, {
    position: 'relative',
    display: 'inline-block',
    width: '0.72em',
    height: '1.2em',
    overflow: 'hidden',
    border: `1px solid ${theme.divider}`,
    borderRadius: '0.09em',
    background: theme.surface,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -0.16em 0.38em rgba(0,0,0,0.12)',
  });
  cell.appendChild(createDigit(document, character, theme));

  const divider = document.createElementNS(HTML_NAMESPACE, 'span') as HTMLSpanElement;
  setStyles(divider, {
    position: 'absolute',
    zIndex: '2',
    left: '0',
    right: '0',
    top: '50%',
    height: '1px',
    background: theme.divider,
    pointerEvents: 'none',
  });
  cell.appendChild(divider);
  return cell;
}

function animateDigit(element: HTMLElement, keyframes: Keyframe[], duration: number): Animation | null {
  if (duration === 0 || typeof element.animate !== 'function') {
    return null;
  }
  return element.animate(keyframes, {
    duration,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  });
}

function replaceDigit(cell: HTMLSpanElement, character: string, theme: RollingNumberTheme, duration: number): void {
  const previous = cell.querySelector<HTMLSpanElement>('[data-sf-rolling-current]');
  previous?.removeAttribute('data-sf-rolling-current');
  const next = createDigit(cell.ownerDocument, character, theme);
  next.style.transform = 'translateY(100%)';
  next.style.opacity = '0.25';
  cell.insertBefore(next, cell.lastElementChild);

  const incoming = animateDigit(
    next,
    [
      { transform: 'translateY(100%)', opacity: 0.25 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    duration,
  );
  const outgoing = previous
    ? animateDigit(
        previous,
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(-100%)', opacity: 0.25 },
        ],
        duration,
      )
    : null;

  const finish = (): void => {
    previous?.remove();
    next.style.transform = 'translateY(0)';
    next.style.opacity = '1';
  };
  if (incoming) {
    incoming.finished.then(finish, finish);
  } else {
    outgoing?.cancel();
    finish();
  }
}

export function updateRollingDigits(
  digits: HTMLDivElement,
  previousValue: string,
  nextValue: string,
  theme: RollingNumberTheme,
  duration: number,
): void {
  if (previousValue.length !== nextValue.length) {
    digits.replaceChildren(...[...nextValue].map(character => createDigitCell(digits.ownerDocument, character, theme)));
    digits.setAttribute('aria-label', nextValue);
    return;
  }

  const cells = [...digits.querySelectorAll<HTMLSpanElement>('[data-sf-rolling-digit]')];
  [...nextValue].forEach((character, index) => {
    if (previousValue[index] !== character) {
      replaceDigit(cells[index], character, theme, duration);
    }
  });
  digits.setAttribute('aria-label', nextValue);
}
