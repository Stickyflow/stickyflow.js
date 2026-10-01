import { describe, expect, it } from 'vitest';
import { render, renderCanvas, sflToRenderInput } from '../src/index';
import { applyPropertyChange } from '../src/interaction';

// Table cells, header labels, and the Footer row were addressable by
// applyPropertyChange all along (Row/Column/Footer blocks resolve like any
// other named block), but nothing tagged the rendered <text> nodes with the
// data-sf-prop the double-click property editor looks for, since the
// resolved path needs the Rows/Columns/Footer block's own declared name -
// discarded during parsing, never carried through to render time before now.

const TABLE_SFL = `sfl 1.4

Model M {
  Table t {
    text: "users"
    Columns cols {
      Column field { text: "Field"; width: 150 }
      Column kind  { text: "Type"; width: 110 }
    }
    Rows rows {
      Row row1 { field: "id"; kind: "uuid" }
      Row row2 { field: "email"; kind: "text" }
    }
    Footer total { field: "n=2"; kind: "-" }
    style { fill: "#ffffff"; stroke: "#000000" }
    layout { position: 0, 0; size: 320, 100 }
  }
}`;

describe('a table cell, header, and footer are each tagged for property-path editing', () => {
  it('threads the Columns/Rows/Footer block names through to the render input', () => {
    const table = sflToRenderInput(TABLE_SFL).tables?.[0];
    expect(table).toMatchObject({
      columnsBlockName: 'cols',
      rowsBlockName: 'rows',
      footerBlockName: 'total',
      strokeColor: '#000000',
      strokeWidth: 1,
      fillColor: '#ffffff',
      showHeader: true,
    });
  });

  it('does not render a table whose canonical visibility flag is false', () => {
    const table = sflToRenderInput(TABLE_SFL).tables?.[0];
    if (!table) {
      throw new Error('Expected the SFL fixture to produce a table.');
    }
    const hiddenTable = { ...table, isVisible: false };
    const { svg } = renderCanvas({ shapes: [], frames: [], swimlanes: [], links: [], tables: [hiddenTable] });

    expect(svg).not.toContain('sf-table-t');
  });

  it('tags a body cell with a Rows[block].Row[id].column path', () => {
    const { svg } = render(TABLE_SFL);
    expect(svg).toMatch(
      /<text id="sf-table-cell-t-row1-field"[^>]*data-sf-prop="Rows\[rows\]\.Row\[row1\]\.field"[^>]*data-sf-prop-kind="value"/,
    );
  });

  it('tags the footer cell with a Footer[block].column path', () => {
    const { svg } = render(TABLE_SFL);
    expect(svg).toMatch(/<text id="sf-table-footer-t-field"[^>]*data-sf-prop="Footer\[total\]\.field"/);
  });

  it('tags the header cell with a Columns[block].Column[id].text path', () => {
    const { svg } = render(TABLE_SFL);
    expect(svg).toMatch(/<text id="sf-table-header-t-field"[^>]*data-sf-prop="Columns\[cols\]\.Column\[field\]\.text"/);
  });

  it('a tagged path actually round-trips through applyPropertyChange for all three', () => {
    const owner = { role: 'table' as const, id: 't' };
    const cellEdited = applyPropertyChange(TABLE_SFL, { owner, path: 'Rows[rows].Row[row1].field', value: 'uuid-1' });
    expect(sflToRenderInput(cellEdited).tables?.[0].rows[0].cells.field).toBe('uuid-1');

    const footerEdited = applyPropertyChange(TABLE_SFL, { owner, path: 'Footer[total].field', value: 'n=5' });
    expect(sflToRenderInput(footerEdited).tables?.[0].footer?.cells.field).toBe('n=5');

    const headerEdited = applyPropertyChange(TABLE_SFL, {
      owner,
      path: 'Columns[cols].Column[field].text',
      value: 'Name',
    });
    expect(sflToRenderInput(headerEdited).tables?.[0].columns.find(c => c.id === 'field')?.label).toBe('Name');
  });

  it('omits data-sf-prop on the legacy flat columns/rows form (no named Rows/Columns block to address)', () => {
    const legacy = `sfl 1.4

Model M {
  Table t {
    columns: [["Field", 150], ["Type", 110]]
    rows: [["id", "uuid"]]
    style { fill: "#ffffff"; stroke: "#000000" }
    layout { position: 0, 0; size: 320, 100 }
  }
}`;
    const { svg } = render(legacy);
    expect(svg).toContain('table-cell-t-row-1-col-1');
    expect(svg).not.toMatch(/<text id="sf-table-cell-t-row-1-col-1"[^>]*data-sf-prop=/);
  });

  it('never emits an orphaned data-sf-prop-kind without a data-sf-prop (a table built as a model object, not parsed SFL, has no block names at all)', () => {
    const { svg } = renderCanvas({
      shapes: [],
      frames: [],
      swimlanes: [],
      links: [],
      tables: [
        {
          id: 't',
          x: 0,
          y: 0,
          width: 300,
          height: 100,
          columns: [{ id: 'field', label: 'Field', width: 150, type: 'text' }],
          rows: [{ id: 'row1', cells: { field: 'id' } }],
          footer: { id: 'total', cells: { field: 'n=1' } },
          strokeColor: '#000',
          strokeWidth: 1,
          cornerRadius: 8,
          fillColor: '#fff',
          textColor: '#111',
          fontSize: 14,
          fontWeight: 'bold',
          showHeader: true,
        },
      ],
    });
    expect(svg).not.toContain('data-sf-prop-kind');
  });
});
