import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const groupedOf = (colors: string) => `sfl 1.4

Model M {
  Chart c {
    type: bar
    Series a { color: "#6d5ef0"; colors: [${colors}]; values: [10, 20, 30] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;

const stackedOf = (colors: string) => `sfl 1.4

Model M {
  Chart c {
    type: bar
    stacked: true
    Series a { color: "#6d5ef0"; colors: [${colors}]; values: [10, 20] }
    Series b { color: "#db2777"; values: [10, 20] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`;

function barPath(svg: string, id: string): string {
  const match = svg.match(new RegExp(`<path id="${id}"[^>]*\\/?>`));
  if (!match) {
    throw new Error(`no bar path "${id}" in output`);
  }
  return match[0];
}

describe('per-bar color overrides', () => {
  it('an overridden index paints with its own color, not the series color', () => {
    const svg = render(groupedOf('none, "#db2777", none')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('fill="#6d5ef0"');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('fill="#db2777"');
    expect(barPath(svg, 'sf-chart-bar-c-a-2')).toContain('fill="#6d5ef0"');
  });

  it('a shorter colors list than values leaves the tail on the series color', () => {
    const svg = render(groupedOf('"#db2777"')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('fill="#db2777"');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('fill="#6d5ef0"');
  });

  it('an unconfigured series is unaffected : no colors property at all', () => {
    const svg = render(`sfl 1.4

Model M {
  Chart c {
    type: bar
    Series a { color: "#6d5ef0"; values: [10, 20] }
    layout { position: 0, 0; size: 200, 150 }
  }
}
`).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('fill="#6d5ef0"');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('fill="#6d5ef0"');
  });

  it('every bar carries its own addressable color path, alongside the value path', () => {
    const svg = render(groupedOf('none, "#db2777", none')).svg;
    const bar = barPath(svg, 'sf-chart-bar-c-a-1');
    expect(bar).toContain('data-sf-prop="Series[a].values[1]"');
    expect(bar).toContain('data-sf-color-prop="Series[a].colors[1]"');
  });

  it('reaches the outer segment of a stacked bar the same way it reaches a grouped one', () => {
    const svg = render(stackedOf('none, "#f59e0b"')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).toContain('fill="#6d5ef0"');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('fill="#f59e0b"');
    expect(barPath(svg, 'sf-chart-bar-c-b-0')).toContain('fill="#db2777"');
  });

  it('an override can itself be a gradient', () => {
    const svg = render(groupedOf('none, "gradient(90, #111111 0%, #eeeeee 100%)", none')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toMatch(/fill="url\(#[^)]+\)"/);
  });

  it('marks only the overridden bar, so the picker knows when it can offer a reset', () => {
    const svg = render(groupedOf('none, "#db2777", none')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).not.toContain('data-sf-color-override');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('data-sf-color-override="true"');
    expect(barPath(svg, 'sf-chart-bar-c-a-2')).not.toContain('data-sf-color-override');
  });

  it('marks a stacked segment the same way', () => {
    const svg = render(stackedOf('none, "#f59e0b"')).svg;
    expect(barPath(svg, 'sf-chart-bar-c-a-0')).not.toContain('data-sf-color-override');
    expect(barPath(svg, 'sf-chart-bar-c-a-1')).toContain('data-sf-color-override="true"');
  });
});
