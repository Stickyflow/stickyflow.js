import type { OwnerRef } from '../../viewer'
import { resolveOwner } from '../../viewer/contract'
import { findAllOwnerNodes, findOwnerNode, isPrimary, isTextLabel } from '../../viewer/domQuery'
import type { ResizeHandle } from '../../viewer/selectionOverlay'
import type { Bounds } from '../../model/geometry/router'
import { findLiveLinks, type LiveLink } from '../linkPreview'

const COMPOSITE_KINDS = new Set(['cylinder', 'person'])

export interface ResizeDragState {
  owner: OwnerRef
  handle: ResizeHandle
  kind: string | null
  isComposite: boolean
  geometryNodes: SVGGraphicsElement[]
  overlay: SVGGElement | null
  bubbles: SVGGElement | null
  startBounds: Bounds
  liveLinks: LiveLink[]
  pointerId: number
  moved: boolean
  text: { el: SVGTextElement; rawText: string; strokeWidth: number } | null
}

export function createResizeDragState(svg: SVGSVGElement, event: PointerEvent): ResizeDragState | null {
  const handleElement = (event.target as Element | null)?.closest?.('[data-sf-resize-handle]') as SVGGraphicsElement | null
  if (!handleElement) return null

  const handle = handleElement.getAttribute('data-sf-resize-handle') as ResizeHandle
  const overlay = handleElement.closest('[data-sf-selection-overlay]') as SVGGElement | null
  const ownerId = overlay?.getAttribute('data-sf-selection-overlay')
  if (!ownerId) return null

  const primary = findOwnerNode(svg, ownerId, isPrimary)
  const owner = primary && resolveOwner(primary)
  if (!primary || owner?.role !== 'entity') return null

  const nodes = findAllOwnerNodes(svg, ownerId)
  const geometryNodes = nodes.filter(node => !isTextLabel(node))
  if (!geometryNodes.length) return null

  const textElement = nodes.find(isTextLabel) as SVGTextElement | undefined
  const rawText = primary.getAttribute('aria-label')
  const text = textElement && rawText
    ? { el: textElement, rawText, strokeWidth: Number(primary.getAttribute('stroke-width')) || 2 }
    : null
  const bubbles = [...svg.querySelectorAll<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(ownerId)}"]`)]
    .find(group => group !== overlay && group.querySelector('circle[data-sf-quick-duplicate]')) ?? null
  const startBounds = primary.getBBox()

  handleElement.setPointerCapture?.(event.pointerId)
  return {
    owner,
    handle,
    kind: primary.getAttribute('data-sf-kind'),
    isComposite: COMPOSITE_KINDS.has(primary.getAttribute('data-sf-kind') ?? ''),
    geometryNodes,
    overlay,
    bubbles,
    startBounds,
    liveLinks: findLiveLinks(svg, ownerId, startBounds),
    pointerId: event.pointerId,
    moved: false,
    text,
  }
}
