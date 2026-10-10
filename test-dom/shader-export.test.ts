import { describe, expect, it } from 'vitest';
import { freezeShaderSurfaces, serializeSvgSnapshot } from '../src/runtime/viewer/export';

function shaderSvg(): SVGSVGElement {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 240 180');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.innerHTML = `
    <ellipse id="fallback" cx="120" cy="90" rx="80" ry="80" fill="#11052f"/>
    <foreignObject id="shader" data-sf-shader="orb" x="40" y="10" width="160" height="160">
      <canvas xmlns="http://www.w3.org/1999/xhtml" data-sf-shader-canvas="true"></canvas>
    </foreignObject>
    <g data-sf-selection-overlay="circle"><rect width="10" height="10"/></g>
  `;
  return svg;
}

describe('shader exports', () => {
  it('replaces the live shader canvas with an embedded frozen image', () => {
    const snapshot = freezeShaderSurfaces(shaderSvg(), ['data:image/png;base64,frozen']);
    const image = snapshot.querySelector('image');

    expect(snapshot.getAttribute('width')).toBe('240');
    expect(snapshot.getAttribute('height')).toBe('180');
    expect(snapshot.querySelector('foreignObject')).toBeNull();
    expect(snapshot.querySelector('[data-sf-selection-overlay]')).toBeNull();
    expect(image?.getAttribute('href')).toBe('data:image/png;base64,frozen');
    expect(image?.getAttribute('x')).toBe('40');
    expect(image?.getAttribute('width')).toBe('160');
    expect(snapshot.querySelector('#fallback')).not.toBeNull();
  });

  it('drops an unavailable shader surface and retains its SVG fallback', () => {
    const snapshot = serializeSvgSnapshot(shaderSvg(), [undefined]);

    expect(snapshot).not.toContain('foreignObject');
    expect(snapshot).not.toContain('data-sf-shader');
    expect(snapshot).toContain('id="fallback"');
  });
});
