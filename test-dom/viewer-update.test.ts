import { describe, expect, it } from 'vitest';
import { createViewer } from '../src/runtime/viewer';

const shape = (name: string, x: number) =>
  `  Shape ${name} {\n    layout {\n      position: ${x}, 0\n      size: 40, 40\n    }\n  }\n`;
const doc = (body: string) => `sfl 1.5\n\nModel M {\n${body}}\n`;
const twice = (count: number) => doc(Array.from({ length: count }, (_, i) => shape('a', i * 50)).join(''));

const repeat = (name: string, seed: number) => `  Repeat ${name} {
    columns: 4
    rows: 2
    step: 20, 20
    seed: ${seed}
    chance: 0.7

    Isometric cube {
      layout {
        position: x, y
        size: 10, 10, 10
      }
    }
  }
`;

const SOURCES = [
  doc(shape('a', 0)),
  twice(2),
  twice(3),
  twice(1),
  doc(repeat('first', 1) + repeat('second', 2)),
  doc(repeat('only', 3)),
  doc(shape('a', 0) + shape('b', 50)),
  doc(''),
  `sfl 1.5\n\nModel M {\n  Container paper {\n    kind: frame\n    layout {\n      position: 0, 0\n      size: 200, 100\n    }\n    style {\n      clip: true\n    }\n${repeat('inside', 4)}  }\n}\n`,
  twice(2),
];

function ids(host: HTMLElement): string[] {
  const svg = host.querySelector('svg') as SVGSVGElement;
  return Array.from(svg.querySelectorAll('[id]'), element => `${element.tagName}#${element.id}`).sort();
}

function freshIds(source: string): string[] {
  const host = document.createElement('div');
  document.body.appendChild(host);
  createViewer({ container: host, source, interactive: true, selectable: true });
  const found = ids(host);
  host.remove();
  return found;
}

describe('viewer update', () => {
  it('leaves exactly what a fresh render has, in every order of documents', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const viewer = createViewer({ container: host, source: SOURCES[0], interactive: true, selectable: true });
    for (const source of [...SOURCES, ...[...SOURCES].reverse()]) {
      viewer.update({ source });
      expect(ids(host)).toEqual(freshIds(source));
    }
    host.remove();
  });
});
