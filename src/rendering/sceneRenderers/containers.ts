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

export function simpleContainerStyle(fill: string, stroke: string, strokeWidth: number, dash?: number[]): SceneStyle {
  return { fill: { kind: 'solid', color: fill || 'transparent' }, stroke: { kind: 'solid', color: stroke }, strokeWidth, dash: dash?.length ? dash : undefined };
}

// SVG <rect rx="…"> only rounds all four corners uniformly. A table header
// fill sits flush against the row grid below it — its bottom edge is an
// internal seam, not an outer boundary — so rounding it too makes the fill's
// rounded bottom corners peek out past the header/row divider line. The real
// canvas app avoids this with Konva's per-corner cornerRadius array
// ([topLeft, topRight, 0, 0]); SVG has no equivalent rect attribute, so this
// draws the same shape as an explicit path instead.
export function topRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} V ${y + height} H ${x} Z`;
}

// §3.6 Tables: a Footer, when present, is the table's true visual bottom
// (not the last data row) - its own background needs the bottom corners
// rounded instead, the mirror image of topRoundedRectPath above.
export function bottomRoundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (r === 0) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  return `M ${x} ${y} H ${x + width} V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} Z`;
}

// Register-tab title shared by frames and swimlanes (both are containers with
// the same "title tab above the top-left corner" presentation) instead of
// placing plain title text inside the body. Caller supplies explicit ids so
// each container keeps its own existing id scheme.
function titleTabNodes(
  tabId: string, titleId: string, x: number, y: number, cornerRadius: number, title: string,
  tabColor: string, fontFamily: string | undefined, fontSize: number, fontWeight: 'normal' | 'bold', order: number,
): RenderNode[] {
  const tabHeight = Math.max(32, fontSize + 18);
  const tabPadding = 16;
  const tabWidth = Math.max(120, title.length * fontSize * .62 + tabPadding * 2);
  const tabX = x + Math.max(12, cornerRadius);
  const tabY = y - tabHeight;
  const tabBounds = boxBounds(tabX, tabY, tabWidth, tabHeight, 6);
  return [
    {
      type: 'rect', id: tabId, order: order + .1, bounds: tabBounds,
      x: tabX, y: tabY, width: tabWidth, height: tabHeight, rx: 8,
      style: {
        fill: { kind: 'solid', color: tabColor }, stroke: { kind: 'none' },
        shadow: { color: '#000000', opacity: .1, blur: 4, dx: 0, dy: 2 },
      },
    },
    {
      type: 'text', id: titleId, order: order + .2, bounds: tabBounds,
      x: tabX + tabPadding, y: tabY, width: Math.max(0, tabWidth - tabPadding * 2), height: tabHeight,
      lines: [title], fontFamily: fontFamily ?? DEFAULT_FONT, fontSize,
      fontWeight, color: '#ffffff', align: 'left', verticalAlign: 'middle', lineHeight: 1.2,
    },
  ];
}

export function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.is_visible === false) return [];
  const order = orderOf(frame, index);
  const bodyBounds = boxBounds(frame.x, frame.y, frame.width, frame.height, frame.stroke_width + 4);
  const nodes: RenderNode[] = [{ type: 'rect', id: `frame-${frame.id}`, order, bounds: bodyBounds, x: frame.x, y: frame.y, width: frame.width, height: frame.height, rx: frame.corner_radius, style: simpleContainerStyle(frame.fill_color, frame.stroke_color, frame.stroke_width, frame.dash) }];
  if ((frame.show_label ?? true) && frame.title) {
    nodes.push(...titleTabNodes(`frame-tab-${frame.id}`, `frame-title-${frame.id}`, frame.x, frame.y, frame.corner_radius, frame.title, frame.stroke_color, frame.font_family, frame.font_size, frame.font_weight, order));
  }
  return nodes;
}

export function buildSwimlane(swimlane: Swimlane, index: number): RenderNode[] {
  if (swimlane.is_visible === false) return [];
  const order = orderOf(swimlane, 5_000 + index), bounds = boxBounds(swimlane.x, swimlane.y, swimlane.width, swimlane.height, swimlane.stroke_width + 4);
  const style = simpleContainerStyle(swimlane.fill_color, swimlane.stroke_color, swimlane.stroke_width, swimlane.dash);
  // Unlike Frame, a swimlane never gets a title tab — the per-lane labels
  // already identify each row, so an outer title would be redundant (matches
  // the real canvas app's SwimlaneComponent.tsx, which explicitly has none).
  // swimlane.title is real data (round-trips through SFL) but is not drawn.
  const nodes: RenderNode[] = [{ type: 'rect', id: `swimlane-${swimlane.id}`, order, bounds, x: swimlane.x, y: swimlane.y, width: swimlane.width, height: swimlane.height, rx: swimlane.corner_radius, style }];
  // Scale lane sizes to sum exactly to the swimlane's own perpendicular
  // dimension (height for horizontal, width for vertical) before laying out
  // dividers/labels. The real canvas app enforces this on every resize (see
  // laneScaling.ts's scaleLanesToSize) so it's never violated there — but
  // nothing enforced it for SFL-declared lanes. A mismatch (hand-written or
  // LLM-generated SFL where the sizes don't add up to the declared width/
  // height — not a hypothetical: this is the "chatbot" case the format is
  // for) meant the cursor-based layout below drifted past the swimlane's own
  // bounds, which are computed from width/height alone; the far dividers and
  // labels then fell outside the scene's viewBox and were silently clipped
  // instead of the lanes simply being (harmlessly) proportioned to fit.
  const targetSize = swimlane.orientation === 'horizontal' ? swimlane.height : swimlane.width;
  const laneTotal = swimlane.lanes.reduce((sum, lane) => sum + lane.size, 0);
  const lanes = laneTotal > 0 && targetSize > 0
    ? swimlane.lanes.map(lane => ({ ...lane, size: lane.size * (targetSize / laneTotal) }))
    : swimlane.lanes;
  let cursor = 0;
  lanes.slice(0, -1).forEach((lane, laneIndex) => {
    cursor += lane.size;
    const d = swimlane.orientation === 'horizontal'
      ? `M ${swimlane.x} ${swimlane.y + cursor} H ${swimlane.x + swimlane.width}`
      : `M ${swimlane.x + cursor} ${swimlane.y} V ${swimlane.y + swimlane.height}`;
    nodes.push({ type: 'path', id: `swimlane-divider-${swimlane.id}-${laneIndex}`, order: order + .1 + laneIndex / 100, bounds, d, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: swimlane.stroke_color }, strokeWidth: swimlane.stroke_width } });
  });
  if (swimlane.show_lane_labels) {
    cursor = 0;
    const fontSize = swimlane.font_size;
    lanes.forEach((lane, laneIndex) => {
      const horizontal = swimlane.orientation === 'horizontal';
      const base = { id: `swimlane-label-${swimlane.id}-${lane.id}`, order: order + .5 + laneIndex / 100, fontFamily: swimlane.font_family ?? DEFAULT_FONT, fontSize, fontWeight: swimlane.font_weight, color: swimlane.text_color, lineHeight: 1.2 } as const;
      if (horizontal) {
        // A horizontal-orientation lane is a wide, short strip (full width,
        // thin height) — plain horizontal text would compete with shapes for
        // that limited height. Rotate -90° to read bottom-to-top along the
        // lane's left edge instead, the conventional swimlane/pool-header
        // treatment (matches the real canvas app's SwimlaneComponent.tsx).
        // Single line, not wrapped: a lane label is normally one short word,
        // and wrapping it to fit the lane's own (often small) height as the
        // available width can force several short lines whose total height
        // exceeds the lane and bleeds into the neighboring lane's label —
        // worse than an occasional long label overflowing past the edge.
        //
        // Bounds must be the ROTATED box, not the shared swimlane `bounds`:
        // this text's "width" (its reading length) runs along the swimlane's
        // Y axis after rotation, which the swimlane's own un-rotated bounds
        // never accounted for — the SVG viewBox then clipped the label at
        // both ends (no font-metrics system exists yet to size this exactly,
        // see ADR-01, so estimated text width plus a safety margin here,
        // rather than an exact fit, is what keeps it from clipping). Bold
        // text in particular renders visibly wider than the .58-factor
        // estimate other text uses (see wrapText). Kept modest: the declared
        // `width` below is already generous (lane.size - 16, well over the
        // typical label's estimated need), so this margin only has to cover
        // estimate error, not the label's whole footprint — a large margin
        // here inflates the scene's overall bounds for every swimlane, most
        // of which don't need it, shrinking the visible diagram when fit
        // into a fixed-size box.
        const thickness = fontSize * 1.4;
        const cx = swimlane.x + 10 + thickness / 2, cy = swimlane.y + cursor + lane.size / 2;
        const width = Math.max(20, lane.size - 16);
        const labelBounds = rotatedBounds(cx - width / 2, cy - thickness / 2, width, thickness, -90, 12);
        nodes.push({
          ...base, type: 'text', bounds: labelBounds, x: cx - width / 2, y: cy - thickness / 2, width, height: thickness, lines: [lane.label],
          align: 'center', verticalAlign: 'middle', rotation: -90, rotationCenter: { x: cx, y: cy },
        });
      } else {
        const x = swimlane.x + cursor + 8, y = swimlane.y + 8;
        const width = Math.max(0, lane.size - 16), height = Math.max(0, swimlane.height - 16);
        nodes.push({ ...base, type: 'text', bounds, x, y, width, height, lines: [lane.label], align: 'left', verticalAlign: 'top' });
      }
      cursor += lane.size;
    });
  }
  return nodes;
}




