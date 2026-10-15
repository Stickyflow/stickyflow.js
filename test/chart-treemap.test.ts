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
    style { showLegend: true }

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
    expect(state.canvasObjects[0].chart?.chartType).toBe('treemap');
    expect(state.canvasObjects[0].chart?.series.map(s => s.values)).toEqual([[60], [25], [15]]);
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

  it('falls back to the zone-scale color when a series has none', () => {
    const { scene } = render(TREEMAP_SFL);
    const photos = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-photos');
    expect(photos && solidFill(photos)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('interpolates a leaf between zone colors instead of snapping to the nearest one', () => {
    const withThresholds = TREEMAP_SFL.replace(
      'Axis y { min: 0; max: 100; step: 20 }',
      'Axis y { min: 0; max: 100; step: 20; thresholds: [30, 60] }',
    ).replace('Series photos { label: "Photos"; values: [25] }', 'Series photos { label: "Photos"; values: [45] }');
    const { scene } = render(withThresholds);
    const photos = scene.nodes.find(node => node.id === 'chart-treemap-tile-usage-photos');
    expect(photos && solidFill(photos)).toBe('#c2b1fc');
  });

  it('suppresses the generic per-series legend', () => {
    const { svg } = render(TREEMAP_SFL);
    expect(svg).not.toContain('chart-legend-swatch-');
  });

  it('only shows one gradient stop for the one actual band, not one per default zone when axis_y has no thresholds', () => {
    const { svg } = render(TREEMAP_SFL);
    expect(svg).not.toContain('undefined');
    const stops = [
      ...(svg.match(/<linearGradient[^>]*>[\s\S]*?<\/linearGradient>/)?.[0] ?? '').matchAll(/stop-color="([^"]+)"/g),
    ];
    expect(stops).toHaveLength(1);
  });

  it('draws a single gradient bar spanning every zone color, low to high, as one color-editable target, not discrete swatches', () => {
    const { svg } = render(TREEMAP_SFL);
    const bar = svg.match(/<rect id="[^"]*chart-treemap-legend-bar-usage"[^>]*>/)?.[0];
    expect(bar).toBeDefined();
    expect(bar).toMatch(/fill="url\(#[^"]+\)"/);
    expect(bar).toContain('data-sf-zone-gradient="true"');
    expect(svg).not.toContain('chart-treemap-legend-swatch-');
  });

  it('places each zone color stop at its own band boundary, not evenly spaced by zone count', () => {
    const uneven = TREEMAP_SFL.replace(
      'Axis y { min: 0; max: 100; step: 20 }',
      'Axis y { min: 0; max: 100; step: 20; thresholds: [10, 90] }',
    );
    const { svg } = render(uneven);
    const gradient = svg.match(/<linearGradient[^>]*>[\s\S]*?<\/linearGradient>/)?.[0];
    expect(gradient).toBeDefined();
    const offsets = [...(gradient ?? '').matchAll(/stop offset="([\d.]+)%"/g)].map(match => Number(match[1]));
    expect(offsets).toEqual([10, 90, 100]);
  });

  it('tile borders use the theme grid color, not a hardcoded white', () => {
    const themed = TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    style { gridColor: "#475569" }');
    const { svg } = render(themed);
    const videos = svg.match(/<rect id="[^"]*chart-treemap-tile-usage-videos"[^>]*>/)?.[0];
    expect(videos).toContain('stroke="#475569"');
  });

  it('cellGap insets each tile and rounds it to match, honoring an explicit barCornerRadius override', () => {
    const plain = render(TREEMAP_SFL).svg;
    const plainTile = plain.match(/<rect id="[^"]*chart-treemap-tile-usage-videos"[^>]*>/)?.[0];
    expect(plainTile).not.toContain('rx=');

    const gapped = TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    cellGap: 4');
    const gappedSvg = render(gapped).svg;
    const gappedTile = gappedSvg.match(/<rect id="[^"]*chart-treemap-tile-usage-videos"[^>]*>/)?.[0];
    expect(gappedTile).toContain('rx="4"');
    const [, plainW] = plainTile?.match(/ width="([\d.]+)"/) ?? [];
    const [, gappedW] = gappedTile?.match(/ width="([\d.]+)"/) ?? [];
    expect(Number(gappedW)).toBeCloseTo(Number(plainW) - 4);

    const square = TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    cellGap: 4\n    barCornerRadius: 0');
    const squareTile = render(square).svg.match(/<rect id="[^"]*chart-treemap-tile-usage-videos"[^>]*>/)?.[0];
    expect(squareTile).not.toContain('rx=');
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

  it('headerColor overrides the header band fill, defaulting to gridColor', () => {
    const defaultColor = render(GROUPED_TREEMAP_SFL).svg;
    const defaultHeader = defaultColor.match(/<rect id="[^"]*chart-treemap-header-usage-0"[^>]*>/)?.[0];
    expect(defaultHeader).toContain('fill="#e2e8f0"');

    const custom = GROUPED_TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    headerColor: "#312e81"');
    const customSvg = render(custom).svg;
    const customHeader = customSvg.match(/<rect id="[^"]*chart-treemap-header-usage-0"[^>]*>/)?.[0];
    expect(customHeader).toContain('fill="#312e81"');
  });

  it('separates sibling group regions by exactly cellGap, the same width as a leaf-to-leaf gap', () => {
    const gapped = GROUPED_TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    cellGap: 4');
    const { svg, scene } = render(gapped);
    const headers = [
      ...svg.matchAll(
        /<rect id="[^"]*chart-treemap-header-usage-\d+"[^>]* x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
      ),
    ].map(m => ({ x: Number(m[1]), y: Number(m[2]), width: Number(m[3]), height: Number(m[4]) }));
    expect(headers.length).toBe(3);
    const sameRow = headers.filter(h => headers.some(other => other !== h && Math.abs(other.y - h.y) < 0.01));
    expect(sameRow.length).toBeGreaterThanOrEqual(2);
    sameRow.sort((a, b) => a.x - b.x);
    const gapBetween = sameRow[1].x - (sameRow[0].x + sameRow[0].width);
    expect(gapBetween).toBeCloseTo(4);
    const misc = scene.nodes.find(n => n.id === 'chart-treemap-tile-usage-misc');
    expect(misc?.type === 'rect' && misc.width > 0 && misc.height > 0).toBe(true);
  });

  it("gives a leaf at its own group's edge the same gap to its cross-group neighbor as to a sibling leaf", () => {
    const twoGroups = `sfl 1.2

Model board {
  Chart usage {
    type: treemap
    cellGap: 4

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series videos { label: "Videos"; group: "Media"; values: [40] }
    Series photos { label: "Photos"; group: "Media"; values: [30] }
    Series docs   { label: "Docs";   group: "Work";  values: [30] }

    layout { position: 0, 0; size: 400, 260 }
  }
}`;
    const { scene } = render(twoGroups);
    const frame = (id: string) => {
      const node = scene.nodes.find(n => n.id === `chart-treemap-tile-usage-${id}`);
      return node?.type === 'rect' ? node : undefined;
    };
    const videos = frame('videos');
    const photos = frame('photos');
    const docs = frame('docs');
    expect(videos && photos && docs).toBeTruthy();
    if (!videos || !photos || !docs) {
      return;
    }
    const withinGroupGap = photos.x - (videos.x + videos.width);
    const acrossGroupGap = docs.x - (photos.x + photos.width);
    expect(withinGroupGap).toBeGreaterThan(0);
    expect(acrossGroupGap).toBeCloseTo(withinGroupGap);
  });

  it('rounds header band corners to match cellRadius, same as leaf tiles', () => {
    const gapped = GROUPED_TREEMAP_SFL.replace('type: treemap', 'type: treemap\n    cellGap: 4');
    const { svg } = render(gapped);
    const header = svg.match(/<rect id="[^"]*chart-treemap-header-usage-0"[^>]*>/)?.[0];
    expect(header).toContain('rx="4"');

    const square = GROUPED_TREEMAP_SFL.replace(
      'type: treemap',
      'type: treemap\n    cellGap: 4\n    barCornerRadius: 0',
    );
    const squareHeader = render(square).svg.match(/<rect id="[^"]*chart-treemap-header-usage-0"[^>]*>/)?.[0];
    expect(squareHeader).not.toContain('rx=');
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
