export interface TreemapRect<T> {
  item: T;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SizedTreemapItem<T> {
  item: T;
  area: number;
}

interface TreemapRow<T> {
  items: SizedTreemapItem<T>[];
  area: number;
}

interface TreemapPlacement<T> {
  rectangles: TreemapRect<T>[];
  remainingBounds: TreemapBounds;
}

export function squarifyTreemap<T extends { value: number }>(items: T[], bounds: TreemapBounds): TreemapRect<T>[] {
  const remainingItems = sizeTreemapItems(items, bounds);
  if (!remainingItems.length) {
    return [];
  }

  const rectangles: TreemapRect<T>[] = [];
  let remaining = remainingItems;
  let remainingBounds = bounds;
  while (remaining.length) {
    const row = selectTreemapRow(remaining, Math.min(remainingBounds.width, remainingBounds.height));
    const placement = placeTreemapRow(row, remainingBounds);
    rectangles.push(...placement.rectangles);
    remaining = remaining.slice(row.items.length);
    remainingBounds = placement.remainingBounds;
  }
  return rectangles;
}

function sizeTreemapItems<T extends { value: number }>(items: T[], bounds: TreemapBounds): SizedTreemapItem<T>[] {
  const positiveItems = items.filter(item => item.value > 0);
  if (!positiveItems.length || bounds.width <= 0 || bounds.height <= 0) {
    return [];
  }
  const total = positiveItems.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return [];
  }
  const areaScale = (bounds.width * bounds.height) / total;
  return [...positiveItems]
    .sort((left, right) => right.value - left.value)
    .map(item => ({ item, area: item.value * areaScale }));
}

function selectTreemapRow<T>(items: SizedTreemapItem<T>[], availableLength: number): TreemapRow<T> {
  const rowItems = [items[0]];
  for (let index = 1; index < items.length; index++) {
    const candidateItems = [...rowItems, items[index]];
    if (worstAspectRatio(candidateItems, availableLength) > worstAspectRatio(rowItems, availableLength)) {
      break;
    }
    rowItems.push(items[index]);
  }
  return {
    items: rowItems,
    area: rowItems.reduce((sum, item) => sum + item.area, 0),
  };
}

function worstAspectRatio<T>(items: SizedTreemapItem<T>[], availableLength: number): number {
  const area = items.reduce((sum, item) => sum + item.area, 0);
  if (area <= 0 || availableLength <= 0) {
    return Infinity;
  }
  const areas = items.map(item => item.area);
  const largestArea = Math.max(...areas);
  const smallestArea = Math.min(...areas);
  const squaredLength = availableLength * availableLength;
  return Math.max((squaredLength * largestArea) / (area * area), (area * area) / (squaredLength * smallestArea));
}

function placeTreemapRow<T>(row: TreemapRow<T>, bounds: TreemapBounds): TreemapPlacement<T> {
  return bounds.width >= bounds.height ? placeVerticalTreemapRow(row, bounds) : placeHorizontalTreemapRow(row, bounds);
}

function placeVerticalTreemapRow<T>(row: TreemapRow<T>, bounds: TreemapBounds): TreemapPlacement<T> {
  const columnWidth = bounds.height > 0 ? row.area / bounds.height : 0;
  let y = bounds.y;
  const rectangles = row.items.map(({ item, area }) => {
    const height = columnWidth > 0 ? area / columnWidth : 0;
    const rectangle = { item, x: bounds.x, y, width: columnWidth, height };
    y += height;
    return rectangle;
  });
  return {
    rectangles,
    remainingBounds: {
      x: bounds.x + columnWidth,
      y: bounds.y,
      width: bounds.width - columnWidth,
      height: bounds.height,
    },
  };
}

function placeHorizontalTreemapRow<T>(row: TreemapRow<T>, bounds: TreemapBounds): TreemapPlacement<T> {
  const rowHeight = bounds.width > 0 ? row.area / bounds.width : 0;
  let x = bounds.x;
  const rectangles = row.items.map(({ item, area }) => {
    const width = rowHeight > 0 ? area / rowHeight : 0;
    const rectangle = { item, x, y: bounds.y, width, height: rowHeight };
    x += width;
    return rectangle;
  });
  return {
    rectangles,
    remainingBounds: {
      x: bounds.x,
      y: bounds.y + rowHeight,
      width: bounds.width,
      height: bounds.height - rowHeight,
    },
  };
}
