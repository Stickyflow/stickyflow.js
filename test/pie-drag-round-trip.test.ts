import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { applyChartValueChange } from '../src/interaction';
import { pieBoundaryValueAt, resolvePieBoundary } from '../src/interaction/pieSliceDrag/boundary';

const owner = { role: 'chart', id: 'c' } as const;

const sourceOf = (values: number[]) => `sfl 1.4

Model M {
  Chart c {
    type: pie
    ${values.map((v, i) => `Series s${i} { color: "#6d5ef0"; label: "S${i}"; values: [${v}] }`).join('\n    ')}
    layout { position: 0, 0; size: 300, 300 }
  }
}
`;

function sliceAngles(svg: string) {
  return [...svg.matchAll(/<path id="sf-chart-pie-slice-c-(s\d+)"[^>]*>/g)].map(match => ({
    id: match[1],
    start: Number(match[0].match(/data-sf-pie-start="([^"]+)"/)?.[1]),
    end: Number(match[0].match(/data-sf-pie-end="([^"]+)"/)?.[1]),
  }));
}

function readSlices(source: string) {
  const values = [...source.matchAll(/values: \[([\d.]+)\]/g)].map(match => Number(match[1]));
  return sliceAngles(render(source).svg).map((slice, index) => ({
    ...slice,
    seriesId: slice.id,
    value: values[index],
  }));
}

function dragTo(source: string, clickedIndex: number, position: number) {
  const slices = readSlices(source);
  const drag = resolvePieBoundary(slices, clickedIndex);
  if (!drag) {
    throw new Error(`no draggable edge for slice ${clickedIndex}`);
  }
  const split = pieBoundaryValueAt(drag, drag.arcStart + (drag.arcEnd - drag.arcStart) * position);
  const patched = applyChartValueChange(
    applyChartValueChange(source, { owner, series: drag.before.seriesId, index: 0, value: split.beforeValue }),
    { owner, series: drag.after.seriesId, index: 0, value: split.afterValue },
  );
  return { drag, split, patched, before: slices };
}

describe('pie drag — the released edge stays where it was dropped', () => {
  const values = [58, 37, 5];

  it('lands the dragged edge where the drag previewed it, from every slice', () => {
    for (let clicked = 0; clicked < values.length; clicked++) {
      const { drag, split, patched } = dragTo(sourceOf(values), clicked, 0.7);
      const dragged = readSlices(patched).find(slice => slice.seriesId === drag.before.seriesId);
      expect(dragged?.end).toBeCloseTo(split.boundary, 2);
    }
  });

  it('leaves every edge the drag did not touch exactly where it was', () => {
    for (let clicked = 0; clicked < values.length; clicked++) {
      const { drag, patched, before } = dragTo(sourceOf(values), clicked, 0.7);
      const after = readSlices(patched);
      const untouched = before.filter(
        slice => slice.seriesId !== drag.before.seriesId && slice.seriesId !== drag.after.seriesId,
      );
      for (const slice of untouched) {
        const now = after.find(candidate => candidate.seriesId === slice.seriesId);
        expect(now?.start).toBeCloseTo(slice.start, 6);
        expect(now?.end).toBeCloseTo(slice.end, 6);
      }
    }
  });

  it('keeps the twelve o clock seam pinned, whatever gets dragged', () => {
    const seam = readSlices(sourceOf(values))[0].start;
    for (let clicked = 0; clicked < values.length; clicked++) {
      const { patched } = dragTo(sourceOf(values), clicked, 0.35);
      const after = readSlices(patched);
      expect(after[0].start).toBeCloseTo(seam, 3);
      expect(after[after.length - 1].end).toBeCloseTo(seam + Math.PI * 2, 3);
    }
  });

  it('stays put across a second drag, so edits accumulate instead of resetting', () => {
    const first = dragTo(sourceOf(values), 0, 0.7);
    const second = dragTo(first.patched, 1, 0.4);
    const after = readSlices(second.patched);

    const firstEdge = after.find(slice => slice.seriesId === first.drag.before.seriesId);
    expect(firstEdge?.end).toBeCloseTo(first.split.boundary, 2);

    const secondEdge = after.find(slice => slice.seriesId === second.drag.before.seriesId);
    expect(secondEdge?.end).toBeCloseTo(second.split.boundary, 2);
  });
});
