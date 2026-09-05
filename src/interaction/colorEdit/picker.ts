const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FALLBACK_COLOR = '#888888';

// `<input type="color">` only understands a plain #rrggbb : a gradient or
// named/rgb() fill falls back rather than seeding the OS picker with black,
// which would read as "the current color is black" and isn't.
export function seedColor(node: SVGGraphicsElement): string {
  const fill = node.getAttribute('fill');
  return fill && HEX_COLOR.test(fill) ? fill : FALLBACK_COLOR;
}

export function openColorPicker(seed: string, onCommit: (color: string) => void): void {
  const input = document.createElement('input');
  input.type = 'color';
  input.value = seed;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';
  input.style.left = '0';
  input.style.top = '0';

  const cleanup = () => input.remove();
  input.addEventListener('change', () => {
    onCommit(input.value);
    cleanup();
  });
  // No 'change' fires if the OS picker is dismissed without choosing a
  // color; 'blur' after that still fires and is the only signal to clean up.
  input.addEventListener('blur', cleanup, { once: true });

  document.body.appendChild(input);
  input.click();
}
