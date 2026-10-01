import { describe, expect, it } from 'vitest';
import { render, sflToRenderInput } from '../src/index';
import { applyPropertyChange } from '../src/interaction/patchSfl';
import type { OwnerRef } from '../src/viewer';

const chart = (id = 'c'): OwnerRef => ({ role: 'chart', id });

const BAR = `sfl 1.4

Model board {
  Chart c {
    text: "Revenue"
    type: bar
    stacked: none
    categories: ["Q1", "Q2", "Q3", "Q4"]

    Axis x { min: 0; max: 4; step: 1 }
    Axis y {
      min: 0
      max: 140
      step: 20
      unit: "k€"
    }

    Series online { color: "#6d5ef0"; label: "Online"; values: [60, 62, 58, 65] }
    Series retail {
      color: "#db2777"
      label: "Retail"
      values: [40, 38, 42, 35]
      error: [3, 4, 2, 5]
    }

    Rule target { at: 90; text: "Target"; color: "#0ea5e9"; strokeWidth: 2; dash: [6, 4] }

    style {
      showGrid: true
      showLegend: true
    }
    layout {
      position: 0, 0
      size: 480, 300
    }
  }
}
`;

const chartOf = (sfl: string) => {
  const input = sflToRenderInput(sfl);
  const first = input.charts?.[0];
  if (!first) {
    throw new Error('no chart in patched source');
  }
  return first;
};

const barChartOf = (sfl: string) => {
  const result = chartOf(sfl);
  if (result.chartType !== 'bar') {
    throw new Error('expected a bar chart');
  }
  return result;
};

describe('applyPropertyChange — direct properties', () => {
  it('replaces a bare enum without quoting it', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'type', value: 'line' });
    expect(next).toContain('type: line');
    expect(next).not.toContain('type: "line"');
    expect(chartOf(next).chartType).toBe('line');
  });

  it('replaces a quoted string and keeps it quoted', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'text', value: 'Umsatz' });
    expect(chartOf(next).title).toBe('Umsatz');
    expect(next).toContain('text: "Umsatz"');
  });

  it('reads the quoting convention from the value already in the document', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'stacked', value: 'percent' });
    expect(next).toContain('stacked: percent');
    expect(barChartOf(next).config?.stacked).toBe('percent');
  });

  it('honours an explicit quote override', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'stacked', value: 'percent', quote: true });
    expect(next).toContain('stacked: "percent"');
  });

  it('escapes quotes and backslashes', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'text', value: 'She said "hi" \\ bye' });
    expect(next).toContain('text: "She said \\"hi\\" \\\\ bye"');
    expect(chartOf(next).title).toBe('She said "hi" \\ bye');
  });
});

describe('applyPropertyChange — named child blocks', () => {
  it('writes into a multiline block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Axis[y].max', value: 200 });
    expect(chartOf(next).axisY.max).toBe(200);
    expect(chartOf(next).axisY.min).toBe(0);
  });

  it('writes into a compact single-line block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].label', value: 'Web' });
    expect(next).toContain('Series online { color: "#6d5ef0"; label: "Web"; values: [60, 62, 58, 65] }');
    expect(chartOf(next).series[0].label).toBe('Web');
  });

  it('addresses the right block when two share a kind', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[retail].color', value: '#111111' });
    expect(chartOf(next).series[0].color).toBe('#6d5ef0');
    expect(chartOf(next).series[1].color).toBe('#111111');
  });

  it('writes into a Rule block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Rule[target].at', value: 100 });
    expect(chartOf(next).rules?.[0].at).toBe(100);
    expect(chartOf(next).rules?.[0].text).toBe('Target');
  });
});

describe('applyPropertyChange — unnamed blocks', () => {
  it('writes a boolean into style', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'style.showGrid', value: false });
    expect(next).toContain('showGrid: false');
    expect(chartOf(next).showGrid).toBe(false);
    expect(chartOf(next).showLegend).toBe(true);
  });

  it('writes a tuple into layout', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'layout.size', value: [600, 400] });
    expect(next).toContain('size: 600, 400');
    expect(chartOf(next).width).toBe(600);
    expect(chartOf(next).height).toBe(400);
  });
});

describe('applyPropertyChange — list elements', () => {
  it('replaces one numeric value and leaves its siblings alone', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].values[2]', value: 91 });
    expect(chartOf(next).series[0].values).toEqual([60, 62, 91, 65]);
  });

  it('replaces a value in a multiline block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[retail].values[0]', value: 12 });
    expect(chartOf(next).series[1].values).toEqual([12, 38, 42, 35]);
  });

  it('replaces an error entry', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[retail].error[1]', value: 9 });
    expect(chartOf(next).series[1].error).toEqual([3, 9, 2, 5]);
  });

  it('replaces a category label and keeps it quoted', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'categories[0]', value: 'Q1 2026' });
    expect(next).toContain('"Q1 2026"');
    expect(barChartOf(next).config?.categories).toEqual(['Q1 2026', 'Q2', 'Q3', 'Q4']);
  });

  it('replaces a dash segment', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Rule[target].dash[1]', value: 8 });
    expect(chartOf(next).rules?.[0].dash).toEqual([6, 8]);
  });

  it('preserves the spacing around the element it replaces', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].values[1]', value: 70 });
    expect(next).toContain('values: [60, 70, 58, 65]');
  });

  it('grows a too-short list to reach an out-of-range index, padding with none', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].values[9]', value: 1 });
    expect(next).toContain('values: [60, 62, 58, 65, none, none, none, none, none, 1]');
  });

  it('refuses to grow a nested index (e.g. a missing tuple component)', () => {
    expect(applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].values[9][1]', value: 1 })).toBe(BAR);
  });
});

describe('applyPropertyChange — list elements whose value contains a comma', () => {
  // zones[N][1] is a nested-list-of-pairs edit target (heatmap's and
  // treemap's legend color-edit), and a gradient/mesh-gradient color
  // string ("gradient(90, #7c3aed 0%, #ec4899 100%)") legitimately
  // contains commas of its own. The color picker's onCommit fires
  // repeatedly while dragging a slider, so the SAME element gets
  // re-edited over and over in normal use, not just once.
  const TREEMAP = `sfl 1.4

Model M {
  Chart c {
    type: treemap
    zones: [["Small", "#ede9fe"], ["Medium", "#c4b5fd"], ["Large", "#8b5cf6"]]

    Axis x { min: 0; max: 1; step: 1 }
    Axis y { min: 0; max: 100; step: 20 }

    Series a { label: "A"; values: [10] }

    layout { position: 0, 0; size: 300, 200 }
  }
}
`;

  it('does not corrupt the list when a comma-bearing value is committed to the same element twice', () => {
    let next = applyPropertyChange(TREEMAP, {
      owner: chart(),
      path: 'zones[0][1]',
      value: 'gradient(90, #7c3aed 0%, #ec4899 100%)',
    });
    // Re-committing to the same element - this is what corrupted the list
    // before the fix: a nested-list scanner that split on every comma
    // without skipping the ones inside this already-quoted string.
    next = applyPropertyChange(next, {
      owner: chart(),
      path: 'zones[0][1]',
      value: 'gradient(180, #7c3aed 0%, #ec4899 100%)',
    });
    expect(next).toContain('"gradient(180, #7c3aed 0%, #ec4899 100%)"');
    expect(next).toContain('["Medium", "#c4b5fd"]');
    expect(next).toContain('["Large", "#8b5cf6"]');
    const { diagnostics } = render(next);
    expect(diagnostics).toEqual([]);
  });

  it('keeps the other two zones intact after editing a third, unrelated index', () => {
    let next = applyPropertyChange(TREEMAP, {
      owner: chart(),
      path: 'zones[0][1]',
      value: 'gradient(90, #7c3aed 0%, #ec4899 100%)',
    });
    next = applyPropertyChange(next, { owner: chart(), path: 'zones[2][1]', value: '#654321' });
    expect(next).toContain('"gradient(90, #7c3aed 0%, #ec4899 100%)"');
    expect(next).toContain('["Medium", "#c4b5fd"]');
    expect(next).toContain('["Large", "#654321"]');
    const { diagnostics } = render(next);
    expect(diagnostics).toEqual([]);
  });
});

describe('applyPropertyChange — inserting a missing property', () => {
  it('inserts into a multiline block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Axis[y].label', value: 'Umsatz' });
    expect(next).toMatch(/Axis y \{\n\s*label: "Umsatz"/);
    expect(chartOf(next).axisY.label).toBe('Umsatz');
  });

  it('inserts into a compact single-line block without breaking it', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].opacity', value: 0.5 });
    expect(next).toContain('opacity: 0.5 }');
    expect(chartOf(next).series[0].values).toEqual([60, 62, 58, 65]);
  });

  it('quotes an inserted string by default', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Axis[x].label', value: 'Quartal' });
    expect(next).toContain('label: "Quartal"');
  });

  it('creates a single-index list property that does not exist yet, padded with none', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].colors[2]', value: '#db2777' });
    expect(next).toContain('colors: [none, none, "#db2777"]');
    expect(chartOf(next).series[0].colors).toEqual([null, null, '#db2777']);
  });

  it('refuses to create a nested-index property that does not exist', () => {
    expect(applyPropertyChange(BAR, { owner: chart(), path: 'Series[online].missing[0][1]', value: 1 })).toBe(BAR);
  });

  it('quotes a value replacing an existing none placeholder, not just a brand-new list', () => {
    const withList = applyPropertyChange(BAR, {
      owner: chart(),
      path: 'Series[online].colors[2]',
      value: '#db2777',
    });
    const next = applyPropertyChange(withList, { owner: chart(), path: 'Series[online].colors[0]', value: '#111111' });
    expect(next).toContain('colors: ["#111111", none, "#db2777"]');
    expect(chartOf(next).series[0].colors).toEqual(['#111111', null, '#db2777']);
  });

  it('quotes a gradient value replacing a none placeholder', () => {
    const withList = applyPropertyChange(BAR, {
      owner: chart(),
      path: 'Series[online].colors[2]',
      value: '#db2777',
    });
    const next = applyPropertyChange(withList, {
      owner: chart(),
      path: 'Series[online].colors[0]',
      value: 'gradient(90, #111111 0%, #eeeeee 100%)',
    });
    expect(next).toContain('colors: ["gradient(90, #111111 0%, #eeeeee 100%)", none, "#db2777"]');
  });
});

describe('applyPropertyChange — refusals leave the source untouched', () => {
  const unchanged = (path: string, value: Parameters<typeof applyPropertyChange>[1]['value']) =>
    expect(applyPropertyChange(BAR, { owner: chart(), path, value })).toBe(BAR);

  it('unknown owner', () => {
    expect(applyPropertyChange(BAR, { owner: chart('nope'), path: 'type', value: 'line' })).toBe(BAR);
  });

  it('unknown block', () => unchanged('Series[missing].color', '#fff'));
  it('unknown nested block', () => unchanged('Axis[z].max', 10));
  it('malformed path', () => unchanged('Series[online]..values', 1));
  it('empty path', () => unchanged('', 1));
  it('non-finite number', () => unchanged('Axis[y].max', Number.NaN));
  it('infinite number', () => unchanged('Axis[y].max', Number.POSITIVE_INFINITY));
  it('empty tuple', () => unchanged('layout.size', []));
  it('tuple with a non-finite member', () => unchanged('layout.size', [10, Number.NaN]));
});

describe('applyPropertyChange — the rest of the document', () => {
  it('keeps comments, blank lines and untouched blocks byte for byte', () => {
    const commented = BAR.replace('    type: bar', '    // the chart type\n    type: bar');
    const next = applyPropertyChange(commented, { owner: chart(), path: 'Axis[y].step', value: 10 });
    expect(next).toContain('// the chart type');
    expect(next).toContain('Series online { color: "#6d5ef0"; label: "Online"; values: [60, 62, 58, 65] }');
    expect(next).toContain('unit: "k€"');
    expect(next.split('\n').length).toBe(commented.split('\n').length);
  });

  it('does not confuse a key with the same name in another block', () => {
    const next = applyPropertyChange(BAR, { owner: chart(), path: 'Rule[target].text', value: 'Ziel' });
    expect(chartOf(next).rules?.[0].text).toBe('Ziel');
    expect(chartOf(next).title).toBe('Revenue');
  });

  it('survives repeated application', () => {
    let source = BAR;
    for (let i = 0; i < 5; i++) {
      source = applyPropertyChange(source, { owner: chart(), path: 'Series[online].values[0]', value: 60 + i });
    }
    expect(chartOf(source).series[0].values).toEqual([64, 62, 58, 65]);
    expect(source.split('\n').length).toBe(BAR.split('\n').length);
  });
});
