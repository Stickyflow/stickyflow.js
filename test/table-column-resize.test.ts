import { describe, expect, it } from 'vitest';
import { sflToRenderInput } from '../src/index';
import { applyColumnResizeChange } from '../src/interaction/patchSfl';
import type { OwnerRef } from '../src/viewer';

const OWNER: OwnerRef = { role: 'table', id: 't' };

const TABLE = `sfl 1.4

Model M {
  Table t {
    text: "revenue"
    Columns cols {
      Column quarter { text: "Quarter"; width: 110 }
      Column revenue { text: "Revenue"; width: 120 }
    }
    Rows rows {
      Row r1 { quarter: "Q1"; revenue: "142k" }
    }
    layout { position: 0, 0; size: 280, 100 }
  }
}
`;

function screenWidths(sfl: string): { widths: number[]; tableWidth: number } {
  const table = sflToRenderInput(sfl).tables?.[0];
  if (!table) {
    throw new Error('no table');
  }
  const declared = table.columns.map(column => column.width);
  const total = declared.reduce((sum, width) => sum + width, 0);
  const scale = table.width / total;
  return { widths: declared.map(width => width * scale), tableWidth: table.width };
}

describe('table column resize maps screen pixels, not declared weights', () => {
  it('starts from declared widths that do not sum to the table width', () => {
    const { widths, tableWidth } = screenWidths(TABLE);
    expect(tableWidth).toBe(280);
    expect(widths[0]).toBeCloseTo(133.913, 2);
    expect(widths[1]).toBeCloseTo(146.087, 2);
  });

  it('grows the dragged column by exactly the dragged pixel distance', () => {
    const before = screenWidths(TABLE);
    const scale = 280 / 230;
    const after = screenWidths(
      applyColumnResizeChange(TABLE, { owner: OWNER, columnId: 'quarter', width: 110 + 40 / scale }),
    );

    expect(after.widths[0] - before.widths[0]).toBeCloseTo(40, 6);
    expect(after.tableWidth - before.tableWidth).toBeCloseTo(40, 6);
  });

  it('leaves every other column at the width it had on screen', () => {
    const before = screenWidths(TABLE);
    const scale = 280 / 230;
    const after = screenWidths(
      applyColumnResizeChange(TABLE, { owner: OWNER, columnId: 'quarter', width: 110 + 40 / scale }),
    );

    expect(after.widths[1]).toBeCloseTo(before.widths[1], 6);
  });

  it('shrinks by the dragged distance too, without disturbing the neighbour', () => {
    const before = screenWidths(TABLE);
    const scale = 280 / 230;
    const after = screenWidths(
      applyColumnResizeChange(TABLE, { owner: OWNER, columnId: 'quarter', width: 110 - 25 / scale }),
    );

    expect(after.widths[0] - before.widths[0]).toBeCloseTo(-25, 6);
    expect(after.widths[1]).toBeCloseTo(before.widths[1], 6);
    expect(after.tableWidth - before.tableWidth).toBeCloseTo(-25, 6);
  });

  it('keeps the scale factor stable so repeated drags stay exact', () => {
    const scale = 280 / 230;
    const once = applyColumnResizeChange(TABLE, { owner: OWNER, columnId: 'quarter', width: 110 + 40 / scale });
    const onceWidths = screenWidths(once);
    const declaredAfter = sflToRenderInput(once).tables?.[0].columns[0].width ?? 0;
    const twice = screenWidths(
      applyColumnResizeChange(once, { owner: OWNER, columnId: 'quarter', width: declaredAfter + 30 / scale }),
    );

    expect(twice.widths[0] - onceWidths.widths[0]).toBeCloseTo(30, 6);
    expect(twice.widths[1]).toBeCloseTo(onceWidths.widths[1], 6);
  });
});
