export interface IsolineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface IsolineField {
  values: Float32Array;
  columns: number;
  rows: number;
  width: number;
  height: number;
}

interface IsolineSample {
  x: number;
  y: number;
  value: number;
}

interface IsolineCell {
  topLeft: IsolineSample;
  topRight: IsolineSample;
  bottomRight: IsolineSample;
  bottomLeft: IsolineSample;
}

type IsolinePoint = [number, number];

interface CellEdgeIntersections {
  top: IsolinePoint;
  right: IsolinePoint;
  bottom: IsolinePoint;
  left: IsolinePoint;
}

export function computeIsolineSegments(field: IsolineField, threshold: number): IsolineSegment[] {
  const segments: IsolineSegment[] = [];
  for (let row = 0; row < field.rows - 1; row++) {
    for (let column = 0; column < field.columns - 1; column++) {
      const cell = createIsolineCell(field, row, column);
      const caseIndex = isolineCaseIndex(cell, threshold);
      if (caseIndex !== 0 && caseIndex !== 15) {
        segments.push(...segmentsForIsolineCase(cell, caseIndex, threshold));
      }
    }
  }
  return segments;
}

function createIsolineCell(field: IsolineField, row: number, column: number): IsolineCell {
  return {
    topLeft: fieldSample(field, row, column),
    topRight: fieldSample(field, row, column + 1),
    bottomRight: fieldSample(field, row + 1, column + 1),
    bottomLeft: fieldSample(field, row + 1, column),
  };
}

function fieldSample(field: IsolineField, row: number, column: number): IsolineSample {
  return {
    x: field.width * (column / (field.columns - 1)),
    y: field.height * (row / (field.rows - 1)),
    value: field.values[row * field.columns + column],
  };
}

function isolineCaseIndex(cell: IsolineCell, threshold: number): number {
  return (
    (isAboveThreshold(cell.topLeft, threshold) ? 8 : 0) |
    (isAboveThreshold(cell.topRight, threshold) ? 4 : 0) |
    (isAboveThreshold(cell.bottomRight, threshold) ? 2 : 0) |
    (isAboveThreshold(cell.bottomLeft, threshold) ? 1 : 0)
  );
}

function isAboveThreshold(sample: IsolineSample, threshold: number): boolean {
  return sample.value >= threshold;
}

function segmentsForIsolineCase(cell: IsolineCell, caseIndex: number, threshold: number): IsolineSegment[] {
  const edges = cellEdgeIntersections(cell, threshold);
  switch (caseIndex) {
    case 1:
    case 14:
      return [isolineSegment(edges.left, edges.bottom)];
    case 2:
    case 13:
      return [isolineSegment(edges.bottom, edges.right)];
    case 3:
    case 12:
      return [isolineSegment(edges.left, edges.right)];
    case 4:
    case 11:
      return [isolineSegment(edges.top, edges.right)];
    case 5:
      return [isolineSegment(edges.left, edges.top), isolineSegment(edges.bottom, edges.right)];
    case 6:
    case 9:
      return [isolineSegment(edges.top, edges.bottom)];
    case 7:
    case 8:
      return [isolineSegment(edges.left, edges.top)];
    case 10:
      return [isolineSegment(edges.top, edges.right), isolineSegment(edges.left, edges.bottom)];
    default:
      return [];
  }
}

function cellEdgeIntersections(cell: IsolineCell, threshold: number): CellEdgeIntersections {
  return {
    top: interpolateEdge(cell.topLeft, cell.topRight, threshold),
    right: interpolateEdge(cell.topRight, cell.bottomRight, threshold),
    bottom: interpolateEdge(cell.bottomLeft, cell.bottomRight, threshold),
    left: interpolateEdge(cell.topLeft, cell.bottomLeft, threshold),
  };
}

function interpolateEdge(start: IsolineSample, end: IsolineSample, threshold: number): IsolinePoint {
  const progress = end.value === start.value ? 0.5 : (threshold - start.value) / (end.value - start.value);
  return [start.x + (end.x - start.x) * progress, start.y + (end.y - start.y) * progress];
}

function isolineSegment(from: IsolinePoint, to: IsolinePoint): IsolineSegment {
  return { x1: from[0], y1: from[1], x2: to[0], y2: to[1] };
}
