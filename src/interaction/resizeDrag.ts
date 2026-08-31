import type { Viewer } from '../viewer'
import { isCameraGesture } from '../viewer/contract'
import { clearAlignmentGuides, updateAlignmentGuides } from '../viewer/alignmentGuideOverlay'
import { Emitter } from './events'
import { applyResizePreview } from './resize/preview'
import { snapResize } from './resize/snapping'
import { createResizeDragState, type ResizeDragState } from './resize/state'

export { HANDLE_AXES } from './resize/geometry'

export interface ResizeDragHandle {
  destroy(): void
}

const RESIZE_GUIDE_COLOR = '#4CAF50'

function pointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM()
  if (!transform) return { x: 0, y: 0 }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse())
  return { x: point.x, y: point.y }
}

export function bindShapeResize(viewer: Viewer, emitter: Emitter): ResizeDragHandle {
  const svg = viewer.svg
  let drag: ResizeDragState | null = null

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || isCameraGesture(event)) return
    drag = createResizeDragState(svg, event)
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    drag.moved = true
    const { bounds, guides } = snapResize(svg, drag, pointerPosition(svg, event))
    applyResizePreview(drag, bounds)
    updateAlignmentGuides(svg, guides, RESIZE_GUIDE_COLOR)
  }

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const completed = drag
    drag = null
    ;(event.target as Element)?.releasePointerCapture?.(completed.pointerId)
    clearAlignmentGuides(svg)
    if (!completed.moved) return

    const { bounds } = snapResize(svg, completed, pointerPosition(svg, event))
    emitter.emit('resizeChange', {
      owner: completed.owner,
      dx: bounds.x - completed.startBounds.x,
      dy: bounds.y - completed.startBounds.y,
      dWidth: bounds.width - completed.startBounds.width,
      dHeight: bounds.height - completed.startBounds.height,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
  }

  svg.addEventListener('pointerdown', onPointerDown)
  svg.addEventListener('pointermove', onPointerMove)
  svg.addEventListener('pointerup', onPointerUp)

  return {
    destroy() {
      drag = null
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
    },
  }
}
