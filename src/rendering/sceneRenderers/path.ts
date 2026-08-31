import type { Shape } from '../../model/shapes';
import { SHAPE_DEFAULTS } from '../../model/shapes';
import type { Frame } from '../../model/frames';
import type { Link, MarkerType } from '../../model/links';
import { getLinkStrokeColor } from '../../model/links';
import type { Swimlane } from '../../model/swimlanes';
import { computeRowHeight, type Table } from '../../model/tables';
import type { FreeformPath } from '../../model/paths';
import { colorAtRamp } from '../field';
import { tableBorderGeometry } from '../../model/geometry/tables';
import { localShapePath } from '../../model/geometry/shapes';
import { wrapText, heuristicRichMeasure, type MeasureTextFactory } from '../../model/geometry/text';
import { hasBoldMarkup, wrapRichText } from '../../model/geometry/richText';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../../model/geometry/connectionLine';
import type { PathSegment } from '../../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene,
  ScenePath, SceneStyle, SceneText,
} from '../renderScene';
import { DEFAULT_FONT, EMPTY_BOUNDS, finite, orderOf, boxBounds, rotatedBounds, paint, freeformPathData, tag } from '../renderPrimitives';
import { buildChart } from '../charts';

export function buildFreeformPath(path: FreeformPath, index: number): RenderNode[] {
  if (path.is_visible === false || path.points.length < 2) return [];
  const strokeWidth = finite(path.stroke_width, 2);
  const extra = strokeWidth + 12;
  const bounds = {
    minX: Math.min(...path.points.map(point => point.x)) - extra,
    minY: Math.min(...path.points.map(point => point.y)) - extra,
    maxX: Math.max(...path.points.map(point => point.x)) + extra,
    maxY: Math.max(...path.points.map(point => point.y)) + extra,
  };
  return [{
    type: 'path', id: `path-${path.id}`, order: orderOf(path, 30_000 + index), bounds,
    d: freeformPathData(path.points, finite(path.tension, 0), path.closed === true),
    markerStart: path.start_marker, markerEnd: path.end_marker,
    style: {
      fill: path.closed ? { kind: 'solid', color: path.fill_color ?? 'transparent' } : { kind: 'none' },
      stroke: { kind: 'solid', color: path.stroke_color ?? '#7c3aed' }, strokeWidth,
      dash: path.dash?.length ? path.dash : undefined, lineCap: 'round', lineJoin: 'round', opacity: finite(path.opacity, 1),
    },
  }];
}




