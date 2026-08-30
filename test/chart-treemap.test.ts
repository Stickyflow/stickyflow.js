import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';
import type { RenderNode } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  ('style' in node && node.style?.fill?.kind === 'solid') ? node.style.fill.color : undefined;

const TREEMAP_SFL = `sfl 1.2

Model board {
  Chart usage {
    text: "Disk usage"
    type: treemap

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series videos { label: "Videos"; color: "#4e3180"; values: [60] }
    Series photos { label: "Photos"; values: [25] }
    Series docs { label: "Docs"; values: [15] }

    layout {
      position: 0, 0
      size: 400, 260
    }
  }
}`;

describe('Treemap chart', () => {
  it('carries per-leaf values through sflToCanvasState', () => {
    const state = sflToCanvasState(TREEMAP_SFL);
    expect(state.entities[0].chart?.chartType).toBe('treemap');
    expect(state.entities[0].chart?.series.map(s => s.values)).toEqual([[60], [25], [15]]);
  });

  it('renders one tile per series without a diagnostic', () => {
    const { diagnostics, svg } = render(TREEMAP_SFL);
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('data-sf-kind="treemap"');
    expect(svg).toContain('chart-treemap-tile-usage-videos');
    expect(svg).toContain('chart-treemap-tile-usage-photos');
    expect(svg).toContain('chart-treemap-tile-usage-docs');
  });

  it('sizes the largest-value tile (Videos, 60) larger than the smallest (Docs, 15)', () => {
    const { scene } = render(TREEMAP_SFL);
    const videos = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-videos');
    const docs = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-docs');
    const area = (n: typeof videos) => n?.type === 'rect' ? n.width * n.height : 0;
    expect(area(videos)).toBeGreaterThan(area(docs));
  });

  it('uses each series own color when set', () => {
    const { scene } = render(TREEMAP_SFL);
    const videos = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-videos');
    expect(videos && solidFill(videos)).toBe('#4e3180');
  });

  it('falls back to the value-bucketed zone color when a series has none', () => {
    const { scene } = render(TREEMAP_SFL);
    const photos = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-photos');
    expect(photos && solidFill(photos)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('suppresses the generic per-series legend', () => {
    const { svg } = render(TREEMAP_SFL);
    expect(svg).not.toContain('chart-legend-swatch-');
  });
});
