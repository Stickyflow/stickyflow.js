export {
  clearAlignmentGuides,
  type GuideLine,
  updateAlignmentGuides,
} from './alignmentGuideOverlay';
export {
  CHANGE_COLOR,
  FLASH_DURATION_MS,
  linkChangeOverlay,
  REDUCED_MOTION_DURATION_MS,
  shapeChangeOverlay,
  startChangeFade,
} from './changeOverlay';
export {
  type AttrElement,
  isCameraGesture,
  isContractCompatible,
  parseContractVersion,
  resolveOwner,
} from './contract';
export {
  findAllOwnerNodes,
  findOwnerNode,
  findSnapCandidateBounds,
  isPrimary,
  isTextLabel,
  pxPerUnit,
  screenRectOf,
} from './domQuery';
export {
  type LinkEndpoint,
  linkSelectionOverlay,
  type QuickDuplicateDirection,
  quickDuplicateBubbles,
  type ResizeHandle,
  resizeHandlePositions,
  shapeSelectionOverlay,
  updateQuickDuplicateBubbles,
} from './selectionOverlay';
export { SVG_NAMESPACE } from './svgNamespace';
export type { Modifiers, OwnerRef } from './types';
