import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const SANKEY_SFL = `sfl 1.2

Model board {
  Chart flow {
    text: "Traffic"
    type: sankey
    zones: [["Visits", "#4e3180"], ["Signups", "#0ea5e9"], ["Churned", "#94a3b8"], ["Active", "#10b981"]]

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 1; step: 1 }

    Series a { source: "Visits"; target: "Signups"; values: [80] }
    Series b { source: "Signups"; target: "Active"; values: [50] }
    Series c { source: "Signups"; target: "Churned"; values: [30] }

    layout {
      position: 0, 0
      size: 500, 300
    }
  }
}`;

describe('Sankey chart', () => {
  it('carries zones and series source/target through sflToCanvasState', () => {
    const state = sflToCanvasState(SANKEY_SFL);
    const chart = state.entities[0];
    expect(chart.chart?.chartType).toBe('sankey');
    expect(chart.chart?.zones?.map(z => z.label)).toEqual(['Visits', 'Signups', 'Churned', 'Active']);
    expect(chart.chart?.series[0]).toMatchObject({ source: 'Visits', target: 'Signups', values: [80] });
  });

  it('renders one rect per node and one path per flow, without a diagnostic', () => {
    const { diagnostics, svg } = render(SANKEY_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="sankey"');
    expect(svg).toContain('chart-sankey-node-flow-Visits');
    expect(svg).toContain('chart-sankey-node-flow-Signups');
    expect(svg).toContain('chart-sankey-link-flow-0');
  });

  it('places Signups (fed by Visits) in a later column than Visits', () => {
    const { scene } = render(SANKEY_SFL);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const signups = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Signups');
    expect(visits?.type === 'rect' && signups?.type === 'rect' && signups.x > visits.x).toBe(true);
  });

  it('sizes the Signups node by its larger throughput (80 in vs 80 out combined)', () => {
    const { scene } = render(SANKEY_SFL);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const churned = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Churned');
    // Visits carries 80 (its only outflow), Churned only 30 - Visits' node should be taller.
    expect(visits?.type === 'rect' && churned?.type === 'rect' && visits.height > churned.height).toBe(true);
  });

  it('labels each node from its zone label when axis labels are on', () => {
    const { svg } = render(SANKEY_SFL);
    expect(svg).toContain('>Visits<');
    expect(svg).toContain('>Active<');
  });

  it('drops a self-loop or a link to an undeclared node without throwing', () => {
    const bad = SANKEY_SFL.replace(
      'Series c { source: "Signups"; target: "Churned"; values: [30] }',
      'Series c { source: "Signups"; target: "Signups"; values: [30] }\n    Series d { source: "Ghost"; target: "Active"; values: [10] }',
    );
    const { diagnostics } = render(bad);
    expect(diagnostics).toEqual([]);
  });

  it('colors a link by its own series color at full opacity, or by its target node at reduced opacity', () => {
    const colored = SANKEY_SFL.replace(
      'Series a { source: "Visits"; target: "Signups"; values: [80] }',
      'Series a { source: "Visits"; target: "Signups"; color: "#ec4899"; values: [80] }',
    );
    const { scene } = render(colored);
    const fill = (node?: RenderNode) =>
      node && 'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;
    const ownColorLink = scene.nodes.find(node => node.id === 'chart-sankey-link-flow-0');
    const targetColorLink = scene.nodes.find(node => node.id === 'chart-sankey-link-flow-1');
    expect(ownColorLink?.type === 'path' && ownColorLink.style?.opacity).toBe(0.85);
    expect(fill(ownColorLink)).toBe('#ec4899');
    expect(targetColorLink?.type === 'path' && targetColorLink.style?.opacity).toBe(0.45);
    const activeNode = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Active');
    expect(fill(targetColorLink)).toBe(fill(activeNode));
  });

  it('stacks multiple nodes in the same column with a gap, none overlapping', () => {
    const multiSource = SANKEY_SFL.replace(
      'zones: [["Visits", "#4e3180"], ["Signups", "#0ea5e9"], ["Churned", "#94a3b8"], ["Active", "#10b981"]]',
      'zones: [["Visits", "#4e3180"], ["Signups", "#0ea5e9"], ["Referrals", "#f59e0b"], ["Churned", "#94a3b8"], ["Active", "#10b981"]]',
    ).replace(
      'Series a { source: "Visits"; target: "Signups"; values: [80] }',
      'Series a { source: "Visits"; target: "Signups"; values: [80] }\n    Series e { source: "Referrals"; target: "Signups"; values: [20] }',
    );
    const { diagnostics, scene } = render(multiSource);
    expect(diagnostics).toEqual([]);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const referrals = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Referrals');
    expect(visits?.type === 'rect' && referrals?.type === 'rect').toBe(true);
    if (visits?.type === 'rect' && referrals?.type === 'rect') {
      expect(visits.x).toBe(referrals.x);
      const gapBetween =
        referrals.y >= visits.y + visits.height
          ? referrals.y - (visits.y + visits.height)
          : visits.y - (referrals.y + referrals.height);
      expect(gapBetween).toBeGreaterThan(0);
    }
  });

  it('drops both the label gutter and node label text when showAxisLabels is false', () => {
    const noLabels = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    style { showAxisLabels: false }');
    const { svg, scene } = render(noLabels);
    expect(svg).not.toContain('>Visits<');
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    expect(visits?.type === 'rect' && visits.x).toBeLessThan(20);
  });

  it('rounds only the outer edge of the first and last column nodes when barCornerRadius is set', () => {
    const rounded = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    barCornerRadius: 10');
    const { scene } = render(rounded);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const signups = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Signups');
    const active = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Active');
    expect(visits?.type).toBe('path');
    expect(active?.type).toBe('path');
    expect(signups?.type).toBe('rect');
    expect(signups?.type === 'rect' && signups.rx).toBeUndefined();
  });

  it('renders plain square-cornered rects with no barCornerRadius set', () => {
    const { scene } = render(SANKEY_SFL);
    for (const id of [
      'chart-sankey-node-flow-Visits',
      'chart-sankey-node-flow-Signups',
      'chart-sankey-node-flow-Active',
    ]) {
      const node = scene.nodes.find(n => n.id === id);
      expect(node?.type).toBe('rect');
    }
  });

  it('keeps the label outside the node, to the right and unrotated, by default', () => {
    const { scene } = render(SANKEY_SFL);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(visits?.type === 'rect' && label?.type === 'text').toBe(true);
    if (visits?.type === 'rect' && label?.type === 'text') {
      expect(label.x).toBeGreaterThan(visits.x + visits.width);
      expect(label.rotation).toBeUndefined();
      expect(label.fontWeight).toBe('bold');
      expect(label.color).toBe('#432a6f');
      expect(label.color).not.toBe('#0f172a');
    }
  });

  it('tints the outside label toward light, not dark, when the chart itself uses a light (dark-theme) textColor', () => {
    const darkTheme = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    style { textColor: "#e2e8f0" }');
    const { scene } = render(darkTheme);
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(label?.type === 'text' && label.color).toBe('#c0aee0');
  });

  it('moves the label inside the node and centers it when labelPosition is inside', () => {
    const inside = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    labelPosition: inside');
    const { scene } = render(inside);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(visits?.type === 'rect' && label?.type === 'text').toBe(true);
    if (visits?.type === 'rect' && label?.type === 'text') {
      expect(label.x).toBeGreaterThanOrEqual(visits.x);
      expect(label.x + label.width).toBeLessThanOrEqual(visits.x + visits.width + 1);
      expect(label.rotation).toBeUndefined();
    }
  });

  it('rotates the inside label -90deg around the node center when labelOrientation is vertical', () => {
    const rotated = SANKEY_SFL.replace(
      'type: sankey',
      'type: sankey\n    labelPosition: inside\n    labelOrientation: vertical',
    );
    const { scene } = render(rotated);
    const visits = scene.nodes.find(node => node.id === 'chart-sankey-node-flow-Visits');
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(visits?.type === 'rect' && label?.type === 'text').toBe(true);
    if (visits?.type === 'rect' && label?.type === 'text') {
      expect(label.rotation).toBe(-90);
      const nodeCenter = { x: visits.x + visits.width / 2, y: visits.y + visits.height / 2 };
      expect(label.rotationCenter?.x).toBeCloseTo(nodeCenter.x);
      expect(label.rotationCenter?.y).toBeCloseTo(nodeCenter.y);
    }
  });

  it('centers the vertical inside label frame on the node before rotation, so it lands on the bar and not beside it', () => {
    const rotated = SANKEY_SFL.replace(
      'type: sankey',
      'type: sankey\n    labelPosition: inside\n    labelOrientation: vertical',
    );
    const { scene } = render(rotated);
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(label?.type === 'text').toBe(true);
    if (label?.type === 'text') {
      const frameCenter = { x: label.x + label.width / 2, y: label.y + label.height / 2 };
      expect(frameCenter.x).toBeCloseTo(label.rotationCenter?.x ?? Number.NaN);
      expect(frameCenter.y).toBeCloseTo(label.rotationCenter?.y ?? Number.NaN);
    }
  });

  it('defaults an inside label to a lighter shade of the node color, not a flat white, and lets labelColor override it', () => {
    const inside = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    labelPosition: inside');
    const { scene: autoScene } = render(inside);
    const autoLabel = autoScene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(autoLabel?.type === 'text' && autoLabel.color).toBe('#c0aee0');
    expect(autoLabel?.type === 'text' && autoLabel.color).not.toBe('#ffffff');
    expect(autoLabel?.type === 'text' && autoLabel.fontWeight).toBe('bold');

    const overridden = inside.replace('labelPosition: inside', 'labelPosition: inside\n    labelColor: "#f59e0b"');
    const { scene: overrideScene } = render(overridden);
    const overrideLabel = overrideScene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(overrideLabel?.type === 'text' && overrideLabel.color).toBe('#f59e0b');
  });

  it('lets labelColor override an outside label too', () => {
    const colored = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    labelColor: "#f59e0b"');
    const { scene } = render(colored);
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(label?.type === 'text' && label.color).toBe('#f59e0b');
  });

  it('blends a link from its source node color to its target node color when linkGradient is set', () => {
    const gradient = SANKEY_SFL.replace('type: sankey', 'type: sankey\n    linkGradient: true');
    const { scene } = render(gradient);
    const link = scene.nodes.find(node => node.id === 'chart-sankey-link-flow-0');
    expect(link?.type === 'path' && link.style?.fill?.kind).toBe('linear-gradient');
    if (link?.type === 'path' && link.style?.fill?.kind === 'linear-gradient') {
      expect(link.style.fill.stops[0]?.color).toBe('#4e3180');
      expect(link.style.fill.stops[1]?.color).toBe('#0ea5e9');
    }
  });

  it('keeps link fills solid when linkGradient is left off', () => {
    const { scene } = render(SANKEY_SFL);
    const link = scene.nodes.find(node => node.id === 'chart-sankey-link-flow-0');
    expect(link?.type === 'path' && link.style?.fill?.kind).toBe('solid');
  });

  it('suppresses an inside vertical label that would overflow the node instead of letting it spill past the bar', () => {
    const overflow = SANKEY_SFL.replace(
      'type: sankey',
      'type: sankey\n    labelPosition: inside\n    labelOrientation: vertical',
    ).replaceAll('Churned', 'ChurnedUsersPermanently');
    const { scene } = render(overflow);
    const label = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-ChurnedUsersPermanently');
    expect(label).toBeUndefined();
    const otherLabel = scene.nodes.find(node => node.id === 'chart-sankey-label-flow-Visits');
    expect(otherLabel?.type).toBe('text');
  });
});
