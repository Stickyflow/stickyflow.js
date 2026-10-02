interface OrderedEntity {
  order_key?: string;
  orderKey?: string;
  order?: number;
}

export function orderOf(entity: OrderedEntity, fallback: number): number {
  const key = entity.order_key ?? entity.orderKey;
  if (!key && typeof entity.order === 'number') {
    return entity.order;
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
