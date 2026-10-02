interface BoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

function quantile(sorted: number[], probability: number): number {
  if (sorted.length === 1) {
    return sorted[0];
  }

  const position = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  return sorted[lowerIndex] + (position - lowerIndex) * (sorted[upperIndex] - sorted[lowerIndex]);
}

export function computeBoxplotStats(values: number[]): BoxplotStats | null {
  if (!values?.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}
