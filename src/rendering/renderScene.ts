import type { Frame } from '../model/frames';
import type { Link, MarkerType, PathType } from '../model/links';
import type { FreeformPath } from '../model/paths';
import type { Chart } from '../model/charts';
import type { Shape } from '../model/shapes';
import type { Swimlane } from '../model/swimlanes';
import type { Table } from '../model/tables';
import type { Side } from '../model/geometry/router';

export interface Point { x: number; y: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

export type ScenePaint =
  | { kind: 'none' }
  | { kind: 'solid'; color: string }
  | { kind: 'linear-gradient'; angle: number; stops: Array<{ offset: number; color: string }> }
  | { kind: 'mesh-gradient'; points: Array<{ x: number; y: number; color: string }> };

export interface SceneStyle {
  fill?: ScenePaint;
  stroke?: ScenePaint;
  strokeWidth?: number;
  dash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: number;
  shadow?: { color: string; opacity: number; blur: number; dx: number; dy: number };
}

/** Semantic role of a node's owner in the interactive DOM contract (§9). */
export type SceneRole = 'entity' | 'link' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';

export interface SceneBase {
  id: string; order: number; bounds: Bounds;
  // Interactive DOM contract (ADR-03). Optional so non-interactive renders and
  // older scenes stay valid; set by buildRenderScene for addressable owners.
  sfRole?: SceneRole;
  /** Stable owner id shared by every node of the same entity/link/etc. */
  sfId?: string;
  /** Owner kind (e.g. shapeType) surfaced as data-sf-kind. */
  sfKind?: string;
  /** Human label for the focusable owner node; drives tabindex + aria-label. */
  ariaLabel?: string;
  /**
   * True on exactly one node per owner (the first one built) — surfaced as
   * data-sf-primary. The viewer paints a selection indicator only onto this
   * node, not every sub-node sharing the owner's sfId: without it, selecting
   * an entity with a text label applied the same selection stroke to the
   * label's glyphs too, since text elements aren't meant to be stroked at all.
   */
  sfPrimary?: boolean;
  /**
   * A link's connected entity ids, surfaced as data-sf-from/data-sf-to. Without
   * this, a DOM-only interaction layer (e.g. a drag handler) has no way to find
   * which links are attached to a shape being moved — the rendered SVG never
   * otherwise records link connectivity, only each owner's own id/role/kind.
   */
  sfFromId?: string;
  sfToId?: string;
  /**
   * A link's route/path type, surfaced as data-sf-route — lets a live drag
   * preview call the real router (`model/geometry/connectionLine.ts`'s
   * getPathPoints, reused directly by `stickyflow/interaction`) with the
   * right pathType instead of guessing.
   */
  sfRoute?: PathType;
  /**
   * The `side` an endpoint's connection point is pinned to (when the SFL
   * source sets one, e.g. `from: entity, right (0.5)`), surfaced as
   * data-sf-from-side/data-sf-to-side. A live drag preview needs this to
   * reproduce the same anchor point the static renderer used — without it,
   * the router falls back to guessing a side from the shapes' relative
   * position, which can visibly differ from the pinned side once a shape
   * moves.
   */
  sfFromSide?: Side;
  sfToSide?: Side;
  /**
   * Surfaced as data-sf-label-gap — true when this link's stroke has a
   * dasharray-cut gap for its text label (see model/geometry/connectionLine's
   * labelGapDash). A live drag preview needs this to know whether to keep
   * recomputing that gap each frame, since the dasharray it lives in is
   * otherwise indistinguishable from a dashed/dotted line style's own pattern.
   */
  sfLabelGap?: boolean;
}

export interface SceneRect extends SceneBase {
  type: 'rect'; x: number; y: number; width: number; height: number; rx?: number;
  rotation?: number; style: SceneStyle;
}

export interface SceneEllipse extends SceneBase {
  type: 'ellipse'; cx: number; cy: number; rx: number; ry: number;
  rotation?: number; style: SceneStyle;
}

export interface ScenePath extends SceneBase {
  type: 'path'; d: string; rotation?: number; rotationCenter?: Point; style: SceneStyle;
  markerStart?: MarkerType; markerEnd?: MarkerType;
}

export interface SceneText extends SceneBase {
  type: 'text'; x: number; y: number; width: number; height: number; lines: string[];
  fontFamily: string; fontSize: number; fontWeight: 'normal' | 'bold';
  color: string; align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom'; lineHeight: number;
  rotation?: number; rotationCenter?: Point;
}

/** Maps §3.3: base-layer image (floor plan scan, map, photo). `href` is a
 * plain URL, not decoded/embedded here - this renderer is pure/DOM-free
 * (runs in Node, no image I/O), so cover/contain fitting can't be computed
 * from the source's natural size the way the live Konva canvas does it.
 * SVG's own `preserveAspectRatio` defers that to the browser at DISPLAY
 * time instead, once it actually has the image loaded: 'xMidYMid slice' ==
 * object-fit: cover, 'xMidYMid meet' == object-fit: contain. */
export interface SceneImage extends SceneBase {
  type: 'image'; href: string; x: number; y: number; width: number; height: number;
  preserveAspectRatio: string; opacity?: number; rotation?: number; rotationCenter?: Point;
}

export type RenderNode = SceneRect | SceneEllipse | ScenePath | SceneText | SceneImage;

export interface RenderDiagnostic {
  severity: 'warning' | 'error'; code: string; message: string; entityId?: string;
}

export interface RenderScene {
  nodes: RenderNode[];
  bounds: Bounds;
  diagnostics: RenderDiagnostic[];
}

/**
 * Versioned interactive DOM contract (ADR-03). The renderer stamps this onto the
 * root <svg data-sf-contract="…">; the viewer checks it on mount and refuses a
 * mismatch instead of binding silently to attributes it doesn't understand.
 * Bump only on a breaking change to data-sf-* names, roles or id scheme.
 */
export const DOM_CONTRACT_VERSION = 1;

export interface ResolvedExportLink {
  link: Link;
  from: Point;
  to: Point;
}

export interface RenderInput {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  tables?: Table[];
  paths?: FreeformPath[];
  charts?: Chart[];
  links: ResolvedExportLink[];
  /** Diagnostics already known before scene-building even starts — e.g. an
   *  unresolved Style/Layout ref from sflToCanvasState. buildRenderScene seeds
   *  its own diagnostics array from these rather than starting empty, so they
   *  merge with whatever it discovers itself (empty-mesh-gradient, etc.). */
  diagnostics?: RenderDiagnostic[];
}

export interface ResolvedLinkGeometry {
  id: string; pathType: PathType; points: number[]; label?: Point;
}
