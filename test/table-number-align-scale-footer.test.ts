import { describe, expect, it } from 'vitest';
import { render, renderCanvas, sflToCanvasState, sflToRenderInput } from '../src/index';

// Tables §3.6 (SFL 1.4): cellType: number, Column.align, Column.scale (same
// ramp() value-form as Chart.scale/Fields §3.4) and the Footer summary row -
// mirrors stickyflow-atlas's Stage 6 Tables ruleset on this package's own,
// simpler SVG table renderer (one flat body rect per table instead of Konva's
// per-row rects, so there's no separate "round the last row's corners"
// bookkeeping - the Footer/last-data-row's bottom corners fall out for free).

const TABLE_SFL = `sfl 1.4

Model board {
  Table risiken {
    text: "Risiken"
    Columns schema {
      Column name  { text: "Risiko"; width: 200 }
      Column score { text: "Score"; width: 90; cellType: number; align: right; scale: "ramp(#dcfce7 0, #fee2e2 100)" }
    }
    Rows data {
      Row r1 { name: "Ausfall Zahlungsdienst"; score: 82 }
      Row r2 { name: "Verzug Lieferant"; score: 34 }
      Row r3 { name: "Unklarer Fall"; score: "n/a" }
    }
    Footer summe { name: "Gesamt"; score: 58 }
    layout {
      position: 0, 0
      size: 300, 140
    }
  }
}`;

describe('Table cellType: number, Column.align, Column.scale, Footer (SFL 1.4, §3.6)', () => {
  it('parses cellType/align/scale on Column and reads the Footer block like a Row', () => {
    const state = sflToCanvasState(TABLE_SFL);
    const table = state.canvasObjects[0].table;
    const scoreCol = table?.columns.find(c => c.id === 'score');
    expect(scoreCol?.type).toBe('number');
    expect(scoreCol?.align).toBe('right');
    expect(scoreCol?.scale).toBe('ramp(#dcfce7 0, #fee2e2 100)');
    expect(table?.columns.find(c => c.id === 'name')?.type).toBe('text');
    expect(table?.columns.find(c => c.id === 'name')?.align).toBeUndefined();

    expect(table?.rows).toHaveLength(3);
    expect(table?.rows[0]).toEqual({ id: 'r1', cells: { name: 'Ausfall Zahlungsdienst', score: '82' } });

    expect(table?.footer).toEqual({ id: 'summe', cells: { name: 'Gesamt', score: '58' } });
  });

  it('omits footer when no Footer block is present (undefined, not a stray empty object)', () => {
    const sfl = TABLE_SFL.replace('    Footer summe { name: "Gesamt"; score: 58 }\n', '');
    const state = sflToCanvasState(sfl);
    expect(state.canvasObjects[0].table?.footer).toBeUndefined();
  });

  it('decodes Column.scale into a structured ramp on the render-input column, alongside footer', () => {
    const input = sflToRenderInput(TABLE_SFL);
    const table = input.tables?.[0];
    const scoreCol = table?.columns.find(c => c.id === 'score');
    expect(scoreCol?.scale).toEqual({
      type: 'ramp',
      stops: [
        { color: '#dcfce7', position: 0 },
        { color: '#fee2e2', position: 100 },
      ],
    });
    expect(table?.columns.find(c => c.id === 'name')?.scale).toBeUndefined();
    expect(table?.footer).toEqual({ id: 'summe', cells: { name: 'Gesamt', score: '58' } });
  });

  it('renders a value-dependent cell background for every numeric cell in a scaled column, and skips a non-numeric one', () => {
    const { scene } = renderCanvas(sflToRenderInput(TABLE_SFL));
    expect(scene.nodes.some(n => n.id === 'table-cell-bg-risiken-r1-score')).toBe(true);
    expect(scene.nodes.some(n => n.id === 'table-cell-bg-risiken-r2-score')).toBe(true);
    // r3's score is "n/a" - Number("n/a") is NaN, so no background is drawn.
    expect(scene.nodes.some(n => n.id === 'table-cell-bg-risiken-r3-score')).toBe(false);
    // The unscaled "name" column never gets a background, regardless of value.
    expect(scene.nodes.some(n => n.id.startsWith('table-cell-bg-risiken-r1-name'))).toBe(false);

    const bg = scene.nodes.find(n => n.id === 'table-cell-bg-risiken-r1-score');
    // score 82 on a ramp(#dcfce7 0, #fee2e2 100) - close to the 100-end stop.
    expect(bg?.type === 'rect' && bg.style.fill?.kind === 'solid' && bg.style.fill.color).toBe('#f8e7e3');
  });

  it('renders the Footer as a bold, ruled-off row after the last data row, with the column alignment applied', () => {
    const { scene } = renderCanvas(sflToRenderInput(TABLE_SFL));
    const footerFill = scene.nodes.find(n => n.id === 'table-footer-fill-risiken');
    const footerRule = scene.nodes.find(n => n.id === 'table-footer-rule-risiken');
    const footerScore = scene.nodes.find(n => n.id === 'table-footer-risiken-score');
    const footerName = scene.nodes.find(n => n.id === 'table-footer-risiken-name');
    expect(footerFill?.type).toBe('path');
    expect(footerRule?.type).toBe('path');
    expect(footerScore?.type === 'text' && footerScore.fontWeight).toBe('bold');
    expect(footerScore?.type === 'text' && footerScore.lines).toEqual(['58']);
    expect(footerScore?.type === 'text' && footerScore.align).toBe('right');
    expect(footerName?.type === 'text' && footerName.align).toBe('left');

    // The footer sits strictly below every data row's own cell text.
    const lastCell = scene.nodes.find(n => n.id === 'table-cell-risiken-r3-score');
    expect(footerScore?.type === 'text').toBe(true);
    expect(lastCell?.type === 'text').toBe(true);
    const footerScoreY = footerScore?.type === 'text' ? footerScore.y : NaN;
    const lastCellY = lastCell?.type === 'text' ? lastCell.y : NaN;
    expect(footerScoreY).toBeGreaterThan(lastCellY);
  });

  it('grows the table body by one row height to fit the footer, and exports it with the right-aligned score column as text-anchor="end"', () => {
    const withoutFooter = TABLE_SFL.replace('    Footer summe { name: "Gesamt"; score: 58 }\n', '');
    const { scene: withFooterScene } = renderCanvas(sflToRenderInput(TABLE_SFL));
    const { scene: withoutFooterScene } = renderCanvas(sflToRenderInput(withoutFooter));
    const bodyWith = withFooterScene.nodes.find(n => n.id === 'table-risiken');
    const bodyWithout = withoutFooterScene.nodes.find(n => n.id === 'table-risiken');
    expect(
      bodyWith?.type === 'rect' && bodyWithout?.type === 'rect' && bodyWith.height - bodyWithout.height,
    ).toBeGreaterThan(0);

    const { svg } = render(TABLE_SFL);
    expect(svg).toContain('sf-table-footer-fill-risiken');
    expect(svg).toContain('sf-table-footer-rule-risiken');
    expect(svg).toMatch(/<text id="sf-table-footer-risiken-score"[^>]*text-anchor="end"/);
    expect(svg).toMatch(/<text id="sf-table-cell-risiken-r1-score"[^>]*text-anchor="end"/);
  });

  it('is stable across repeated renders (determinism)', () => {
    expect(render(TABLE_SFL).svg).toBe(render(TABLE_SFL).svg);
  });
});
