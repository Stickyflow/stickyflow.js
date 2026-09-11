import { describe, expect, it } from 'vitest';
import type { RenderNode } from '../src/index';
import { render, sflToCanvasState } from '../src/index';

const solidFill = (node: RenderNode): string | undefined =>
  'style' in node && node.style?.fill?.kind === 'solid' ? node.style.fill.color : undefined;

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

const GROUPED_TREEMAP_SFL = `sfl 1.2

Model board {
  Chart usage {
    text: "Disk usage"
    type: treemap

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series videos { label: "Videos"; group: "Media"; values: [60] }
    Series photos { label: "Photos"; group: "Media"; values: [25] }
    Series docs   { label: "Docs";   group: "Work";  values: [15] }
    Series misc   { label: "Misc";   values: [5] }

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
    const area = (n: typeof videos) => (n?.type === 'rect' ? n.width * n.height : 0);
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

  it('only shows one legend item per actual band, not one per default zone when axis_y has no thresholds', () => {
    // TREEMAP_SFL's Axis y has no thresholds, so there's exactly one real
    // band (0-100) even though the 3-entry default zone palette is used for
    // fill color - the legend used to still draw all 3 zones, and the 2nd
    // and 3rd showed a bogus "undefined-undefined" range past the one real
    // boundary.
    const { svg } = render(TREEMAP_SFL);
    expect(svg).not.toContain('undefined');
    expect(svg.match(/chart-treemap-legend-swatch-usage-\d+"/g)).toHaveLength(1);
  });

  it('renders no header bands for a flat treemap (no leaf has a group)', () => {
    const { svg } = render(TREEMAP_SFL);
    expect(svg).not.toContain('chart-treemap-header-');
  });

  it('groups leaves under one header band per group key, "Other" for ungrouped leaves', () => {
    const { svg } = render(GROUPED_TREEMAP_SFL);
    expect(svg).toContain('>Media<');
    expect(svg).toContain('>Work<');
    expect(svg).toContain('>Other<');
    expect(svg.match(/chart-treemap-header-usage-\d+"/g)).toHaveLength(3);
  });

  it('keeps every leaf as its own tile whether grouped or not', () => {
    const { svg } = render(GROUPED_TREEMAP_SFL);
    for (const id of ['videos', 'photos', 'docs', 'misc']) {
      expect(svg).toContain(`chart-treemap-tile-usage-${id}`);
    }
  });

  it("keeps a group's own leaves visually together, not interleaved by size with another group", () => {
    const { scene } = render(GROUPED_TREEMAP_SFL);
    const frameOf = (id: string) => {
      const node = scene.nodes.find(n => n.id === `chart-treemap-tile-usage-${id}`);
      return node?.type === 'rect' ? node : undefined;
    };
    const videos = frameOf('videos');
    const photos = frameOf('photos');
    const docs = frameOf('docs');
    expect(videos && photos && docs).toBeTruthy();
    // Media's two leaves (videos, photos) sit in the same horizontal band
    // (matching y) since they're squarified inside one shared group
    // rectangle, distinct from Work's docs tile.
    expect(videos?.y).toBeCloseTo(photos?.y ?? Number.NaN, 0);
    expect(docs?.y === videos?.y && docs?.x === videos?.x).toBe(false);
  });

  it('hides header bands when showAxisLabels is off, leaves still fill the group region', () => {
    const noLabels = GROUPED_TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    style { showAxisLabels: false }');
    const { svg } = render(noLabels);
    expect(svg).not.toContain('chart-treemap-header-');
    for (const id of ['videos', 'photos', 'docs', 'misc']) {
      expect(svg).toContain(`chart-treemap-tile-usage-${id}`);
    }
  });
});
