interface StackableObject {
  order_key?: string;
  orderKey?: string;
  order?: number;
  sourceIndex?: number;
}

export function stackRank(object: StackableObject): number {
  const key = object.order_key ?? object.orderKey;
  if (!key) {
    return object.order ?? 0;
  }

  let rank = 0;
  for (let index = 0; index < Math.min(key.length, 8); index++) {
    rank = rank * 128 + key.charCodeAt(index);
  }
  return rank;
}

export function stackSequence(object: StackableObject, fallback: number): number {
  return object.sourceIndex ?? fallback;
}
