import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

const pieOf = (values: number[], extra = '') => `sfl 1.4

Model M {
  Chart c {
    type: pie
    ${extra}
    ${values.map((v, i) => `Series s${i} { color: "#4e3180"; label: "Slice ${i}"; values: [${v}] }`).join('\n    ')}
    layout { position: 0, 0; size: 300, 300 }
  }
}
`;

describe('pie chart â€” font stack', () => {
  it('falls back to the full Inter font stack, not a bare family name', () => {
    const { scene } = render(pieOf([60, 40]));
    const label = scene.nodes.find(node => node.id === 'chart-pie-label-c-s0');
    expect(label?.type === 'text' && label.fontFamily).toContain('-apple-system');
  });
});

describe('pie chart â€” label color ties to the slice hue', () => {
  it('picks a lighter shade of the slice color for a dark slice, not a flat white', () => {
    const { scene } = render(pieOf([50, 50]));
    const label = scene.nodes.find(node => node.id === 'chart-pie-label-c-s0');
    expect(label?.type === 'text' && label.color).toBe('#c0aee0');
    expect(label?.type === 'text' && label.color).not.toBe('#ffffff');
  });

  it('bolds the series name and keeps the percentage line regular weight', () => {
    const { scene } = render(pieOf([50, 50]));
    const label = scene.nodes.find(node => node.id === 'chart-pie-label-c-s0');
    expect(label?.type === 'text' && label.richLines).toEqual([
      [{ text: 'Slice 0', bold: true }],
      [{ text: '50%', bold: false }],
    ]);
  });
});

describe('pie chart â€” labels on a ring too thin to hold them', () => {
  it('moves the label outside the ring with a leader tick instead of hiding it', () => {
    const thin = pieOf([50, 50], 'innerRadius: 145');
    const { scene } = render(thin);
    const label = scene.nodes.find(node => node.id === 'chart-pie-label-c-s0');
    expect(label).toBeDefined();
    const tick = scene.nodes.find(node => node.id === 'chart-pie-label-tick-c-s0');
    expect(tick?.type === 'path' && tick.d.length).toBeGreaterThan(0);
  });

  it('keeps the label centered inside a normal-thickness ring, with no leader tick', () => {
    const normal = pieOf([50, 50], 'innerRadius: 60');
    const { scene } = render(normal);
    const tick = scene.nodes.find(node => node.id === 'chart-pie-label-tick-c-s0');
    expect(tick).toBeUndefined();
  });
});

describe('pie chart â€” pieCornerRadius', () => {
  it('round-trips through sflToCanvasState', () => {
    const state = sflToCanvasState(pieOf([50, 50], 'pieCornerRadius: 8'));
    expect(state.canvasObjects[0].chart?.pieCornerRadius).toBe(8);
  });

  it('rounds the outer corners of EVERY slice, not just the last one drawn', () => {
    const { scene } = render(pieOf([30, 70], 'pieCornerRadius: 10'));
    const sliceA = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    const sliceB = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s1');
    expect(sliceA?.type === 'path' && sliceA.d).toContain('A 10 10 0 0 1');
    expect(sliceB?.type === 'path' && sliceB.d).toContain('A 10 10 0 0 1');
  });

  it('rounds a donut slice on all four corners, outer and inner', () => {
    const { scene } = render(pieOf([30, 70], 'pieCornerRadius: 10\n    innerRadius: 60'));
    const sliceA = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    const cornerArcs = sliceA?.type === 'path' ? (sliceA.d.match(/A 10 10 /g) ?? []) : [];
    expect(cornerArcs).toHaveLength(4);
  });

  it('never fakes the rounding with a stroke', () => {
    const { scene } = render(pieOf([50, 50], 'pieCornerRadius: 8'));
    const slice = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    expect(slice?.type === 'path' && slice.style.stroke).toBeUndefined();
  });

  it('shrinks the effective corner radius for a slice too thin to fit the configured one', () => {
    const { scene } = render(pieOf([1, 99], 'pieCornerRadius: 40'));
    const tinySlice = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    expect(tinySlice?.type === 'path' && tinySlice.d).not.toContain('A 40 40');
  });

  it('shrinks the outer radius by the corner radius, so a rounded pie still fits its plot area', () => {
    const rounded = render(pieOf([100], 'pieCornerRadius: 20'));
    const plain = render(pieOf([100]));
    const roundedSlice = rounded.scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    const plainSlice = plain.scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    expect(roundedSlice?.type === 'path' && roundedSlice.d).not.toEqual(
      plainSlice?.type === 'path' ? plainSlice.d : '',
    );
  });

  it("keeps the frame's drag geometry attribute in sync with the corner-adjusted outer radius", () => {
    const { scene } = render(pieOf([50, 50], 'pieCornerRadius: 20'));
    const frame = scene.nodes.find(node => node.id === 'chart-c');
    const slice = scene.nodes.find(node => node.id === 'chart-pie-slice-c-s0');
    const geometry = frame?.type === 'rect' && frame.detail?.of === 'pieGeometry' ? frame.detail.pieGeometry : '';
    const outerRadius = Number(geometry.split(',')[2]);
    expect(slice?.type === 'path' && slice.d).toContain(`A ${outerRadius} ${outerRadius}`);
  });
});
