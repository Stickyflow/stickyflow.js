interface OrderedCanvasObject {
  order_key?: string;
  orderKey?: string;
  order?: number;
}

export function orderOf(canvasObject: OrderedCanvasObject, fallback: number): number {
  const key = canvasObject.order_key ?? canvasObject.orderKey;
  if (!key && typeof canvasObject.order === 'number') {
    return canvasObject.order;
  }
  if (!key) {
    return fallback;
  }

  let rank = 0;
  for (let index = 0; index < Math.min(key.length, 8); index++) {
    rank = rank * 128 + key.charCodeAt(index);
  }
  return rank;
}
