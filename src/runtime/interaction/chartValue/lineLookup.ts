export function findConnectedLine(svg: SVGSVGElement, ownerId: string, series: string): SVGGraphicsElement | null {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(series)}"]`;
  return (
    [...svg.querySelectorAll<SVGGraphicsElement>(selector)].find(
      el => el.tagName.toLowerCase() === 'path' && !el.id.includes('chart-line-area-'),
    ) ?? null
  );
}

export function findConnectedLineArea(svg: SVGSVGElement, ownerId: string, series: string): SVGGraphicsElement | null {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(series)}"]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)].find(el => el.id.includes('chart-line-area-')) ?? null;
}

export function findSeriesPoints(svg: SVGSVGElement, ownerId: string, series: string): SVGGraphicsElement[] {
  const selector = `[data-sf-id="${CSS.escape(ownerId)}"][data-sf-series="${CSS.escape(series)}"][data-sf-value-index]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)]
    .filter(el => el.tagName.toLowerCase() === 'ellipse')
    .sort((a, b) => Number(a.getAttribute('data-sf-value-index')) - Number(b.getAttribute('data-sf-value-index')));
}
