export function findResizeQuickDuplicateBubbles(
  svg: SVGSVGElement,
  ownerId: string,
  selectionOverlay: SVGGElement | null,
): SVGGElement | null {
  const overlays = svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(ownerId)}"]`);

  return (
    [...overlays].find(
      overlay => overlay !== selectionOverlay && overlay.querySelector('circle[data-sf-quick-duplicate]'),
    ) ?? null
  );
}
