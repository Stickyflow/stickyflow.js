export {
  clearAlignmentGuides,
  type GuideLine,
  updateAlignmentGuides,
} from './alignmentGuideOverlay';
export { DERIVED_HEIGHT_ROLES } from './canvasObjectRoles';
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
  type IsometricGeometry,
  isCameraGesture,
  isContractCompatible,
  isometricGeometryOf,
  type PathGeometry,
  parseContractVersion,
  pathGeometryOf,
  resolveOwner,
  symbolDeclaredBounds,
} from './contract';
export {
  findAllOwnerNodes,
  findOwnerNode,
  findSnapCandidateBounds,
  isPrimary,
  isTextLabel,
  pointerUserPoint,
  pxPerUnit,
  screenRectOf,
} from './domQuery';
export {
  axisArrowPlacements,
  ISO_HALO_ATTR,
  type IsometricAxis,
  isometricSelectionOverlay,
  type LinkEndpoint,
  linkSelectionOverlay,
  PATH_HALO_ATTR,
  pathSelectionOverlay,
  type QuickDuplicateDirection,
  quickDuplicateBubbles,
  type ResizeHandle,
  resizeHandlePositions,
  shapeSelectionOverlay,
  updateAxisArrowGroup,
  updateHalo,
  updateQuickDuplicateBubbles,
  type Vec,
} from './selectionOverlay';
export { SVG_NAMESPACE } from './svgNamespace';
export type { Modifiers, OwnerRef } from './types';
