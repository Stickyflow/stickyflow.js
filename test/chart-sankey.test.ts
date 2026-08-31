import { describe, expect, it } from 'vitest';
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
});
