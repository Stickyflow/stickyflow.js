import { type IsometricObject, isometricBounds, isometricFaces } from '../../model/isometricObject';
import type { RenderNode, SceneEllipse, ScenePath, SceneText } from '../scene';
import { DEFAULT_FONT, finite, orderOf, rotatedBounds } from '../scene';
import { roundedPolygonPath } from '../scene/roundedPolygonPath';
import { tag } from '../scene/tagging';

export function buildIsometricObject(object: IsometricObject, index: number): RenderNode[] {
  const strokeWidth = Math.max(0, finite(object.strokeWidth, 1));
  const rotation = finite(object.rotation, 0);
  // The on-screen box, derived from the true width/height/depth edge
  // lengths (see isometricBounds) - NOT the same numbers as object.width/
  // object.height, which are true axis lengths, not pixel extents.
  const box = isometricBounds(object);
  const rotationCenter = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  const bounds = rotatedBounds(box, rotation, strokeWidth + 2);
  const order = orderOf(object, 15_000 + index);
  const faces = isometricFaces(object);
  const cornerRadius = Math.max(0, finite(object.cornerRadius, 8));
  const depth = Math.max(0, object.depth);
  const common = {
    type: 'path' as const,
    bounds,
    rotation,
    rotationCenter,
    style: {
      stroke: { kind: 'solid' as const, color: object.strokeColor ?? '#111827' },
      strokeWidth,
      lineJoin: 'round' as const,
    },
  };

  const groundShadow: SceneEllipse | undefined = object.hasShadow
    ? {
        type: 'ellipse',
        id: `isometric-${object.id}-ground-shadow`,
        order: order - 0.1,
        bounds: {
          minX: box.x + box.width * 0.15,
          minY: box.y + box.height - depth * 0.35,
          maxX: box.x + box.width * 0.85,
          maxY: box.y + box.height + depth * 0.35,
        },
        cx: box.x + box.width / 2,
        cy: box.y + box.height,
        rx: box.width * 0.35,
        ry: Math.max(3, depth * 0.35),
        rotation,
        style: {
          fill: { kind: 'solid', color: object.shadowStyle?.color ?? '#000000' },
          stroke: { kind: 'none' },
          opacity: object.shadowStyle?.opacity ?? 0.18,
          blur: finite(object.shadowStyle?.blur, 8),
          pointerEvents: 'none',
        },
      }
    : undefined;

  const noStroke = { ...common.style, stroke: { kind: 'none' as const } };

  // Rounding each face's own corners independently (its own two adjacent
  // edges) never lines up with the hull's rounding below (computed from the
  // hull's own, different, adjacent edges) - the mismatch left slivers of
  // background showing through at the exterior corners. Faces are drawn
  // sharp-cornered instead and clipped to the hull path, so the fill and the
  // outline are trimmed by the exact same curve and always coincide.
  const silhouette = [faces.top[0], faces.top[1], faces.side[2], faces.front[2], faces.front[3], faces.top[3]];
  const hullPath = roundedPolygonPath(silhouette, cornerRadius);
  const hullClip = { type: 'path' as const, d: hullPath };

  const facesNodes: ScenePath[] = [
    {
      ...common,
      id: `isometric-${object.id}-top`,
      order,
      d: roundedPolygonPath(faces.top, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: object.topFill ?? '#f8fafc' }, clip: hullClip },
    },
    {
      ...common,
      id: `isometric-${object.id}-front`,
      order: order + 0.1,
      d: roundedPolygonPath(faces.front, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: object.frontFill ?? '#ffffff' }, clip: hullClip },
    },
    {
      ...common,
      id: `isometric-${object.id}-side`,
      order: order + 0.2,
      d: roundedPolygonPath(faces.side, 0),
      style: { ...noStroke, fill: { kind: 'solid', color: object.sideFill ?? '#f1f5f9' }, clip: hullClip },
    },
  ];

  // The three interior seams (where top meets front, front meets side, side
  // meets top) all converge on the near corner shared by all three faces -
  // drawn faint since the bold stroke belongs to the silhouette alone. Also
  // clipped to the hull so they stop exactly at the rounded corners instead
  // of poking past them toward the original sharp vertex.
  const seams: ScenePath = {
    ...common,
    id: `isometric-${object.id}-seams`,
    order: order + 0.22,
    d: `M ${faces.top[3].x} ${faces.top[3].y} L ${faces.top[2].x} ${faces.top[2].y} L ${faces.top[1].x} ${faces.top[1].y} M ${faces.top[2].x} ${faces.top[2].y} L ${faces.front[2].x} ${faces.front[2].y}`,
    style: {
      ...common.style,
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: Math.min(strokeWidth, 1),
      clip: hullClip,
    },
  };

  const hull: ScenePath = {
    ...common,
    id: `isometric-${object.id}-hull`,
    order: order + 0.24,
    d: hullPath,
    // Exposed on the hull node (DOM contract) so the runtime's axis-handle
    // overlay and live-resize preview can read the true width/height/depth
    // and the derived on-screen box without re-deriving either from a
    // parsed `d` string.
    detail: {
      of: 'isometricGeometry',
      width: Math.max(0, object.width),
      height: Math.max(0, object.height),
      depth,
      cornerRadius,
      bounds: box,
    },
    style: { ...common.style, fill: { kind: 'none' } },
  };

  // hull must stay first: tag() below marks whichever node is at index 0 as
  // "primary", and the interaction runtime measures that node's own rendered
  // SVG bbox (not its declared `bounds` field) for selection, resize
  // handles, and focus. Only the hull's path geometry actually spans the
  // full object - each face's own `d` only draws that one face. Final paint
  // order doesn't depend on this array order - buildRenderScene sorts the
  // whole scene by `order` afterward - so the shadow can safely sit anywhere
  // here despite needing to paint behind the faces.
  const objectNodes: RenderNode[] = groundShadow
    ? [hull, ...facesNodes, groundShadow, seams]
    : [hull, ...facesNodes, seams];

  if (!object.text) {
    return objectNodes;
  }

  const labelHeight = 20;
  const labelGap = 12;
  const label: SceneText = {
    type: 'text',
    id: `isometric-${object.id}-label`,
    order: order + 0.3,
    bounds: {
      minX: box.x,
      minY: box.y - labelGap - labelHeight,
      maxX: box.x + box.width,
      maxY: box.y - labelGap,
    },
    x: box.x,
    y: box.y - labelGap - labelHeight,
    width: box.width,
    height: labelHeight,
    lines: [object.text],
    fontFamily: DEFAULT_FONT,
    fontSize: 12,
    fontWeight: 'normal',
    color: '#111827',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    rotation,
    rotationCenter,
  };

  const labelGuide: ScenePath = {
    type: 'path',
    id: `isometric-${object.id}-label-guide`,
    order: order + 0.25,
    bounds: {
      minX: box.x + box.width / 2,
      minY: box.y - labelGap,
      maxX: box.x + box.width / 2,
      maxY: box.y,
    },
    d: `M ${box.x + box.width / 2} ${box.y - labelGap} L ${box.x + box.width / 2} ${box.y}`,
    rotation,
    rotationCenter,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: '#cbd5e1' },
      strokeWidth: 1,
      lineCap: 'round',
      pointerEvents: 'none',
    },
  };

  return [...objectNodes, labelGuide, label];
}

export function buildIsometricObjects(objects: readonly IsometricObject[]): RenderNode[] {
  return objects.flatMap((object, index) =>
    tag(
      buildIsometricObject(object, index),
      'isometric',
      object.id,
      'isometric',
      object.text ?? 'Isometric object',
      object.parentFrameId,
    ),
  );
}
