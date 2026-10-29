import { parseHexRgb } from '../../../model/color';
import type { GenericComponent } from '../../../model/component';
import { type RenderNode, rotatedBounds, type ScenePaint } from '../../scene';
import { type ControlBox, controlBox, fade, hitArea, numberProperty, solid, textProperty } from './controlParts';

const MIN_TIP = 0.25;

// The color with the opacity of `alpha`, so a hand can fade towards its root. A color that is not hex is kept as it is.
function withAlpha(color: string, alpha: number): string {
  const rgb = parseHexRgb(color);
  return rgb && alpha < 1 ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${Number(alpha.toFixed(3))})` : color;
}

const num = (value: number): string => String(Number(value.toFixed(3)));

// A color that is set to `none` is off: no glow, no light, no fill.
const isOff = (component: GenericComponent, key: string): boolean => textProperty(component, key) === 'none';
const colorOr = (component: GenericComponent, key: string, fallback: string): string =>
  isOff(component, key) ? fallback : textProperty(component, key) || fallback;

interface Hand {
  cx: number;
  cy: number;
  radius: number;
  length: number;
  tail: number;
  gap: number;
  rootHalf: number;
  tipHalf: number;
}

function handOf(component: GenericComponent, box: ControlBox): Hand {
  const radius = Math.min(box.width, box.height) / 2;
  const root = Math.max(0.5, numberProperty(component, 'width'));
  const taper = Math.min(1, Math.max(0, numberProperty(component, 'taper')));
  return {
    cx: box.x + box.width / 2,
    cy: box.y + box.height / 2,
    radius,
    length: Math.max(1, numberProperty(component, 'length') * radius),
    tail: Math.max(0, numberProperty(component, 'tail') * radius),
    gap: Math.max(0, numberProperty(component, 'gap') * radius),
    rootHalf: root / 2,
    tipHalf: Math.max(MIN_TIP, (root * taper) / 2),
  };
}

// The hand points up from its pivot: its sides run straight along the tail and taper to the tip, and both ends are round. With a gap it does
// not reach the pivot, as the hour hand of a watch that floats over the face.
function outline({ cx, cy, length, tail, gap, rootHalf, tipHalf }: Hand): string {
  const root = gap > 0 ? cy - gap : cy;
  const back = gap > 0 ? 0 : tail;
  const tipLeft = `L${num(cx - tipHalf)} ${num(cy - length)}`;
  const tip = `A${num(tipHalf)} ${num(tipHalf)} 0 0 1 ${num(cx + tipHalf)} ${num(cy - length)}`;
  const round = `A${num(rootHalf)} ${num(rootHalf)} 0 0 1 ${num(cx - rootHalf)} ${num(root + back)}`;
  if (gap > 0) {
    return `M${num(cx - rootHalf)} ${num(root)}${tipLeft}${tip}L${num(cx + rootHalf)} ${num(root)}${round}Z`;
  }
  return [
    `M${num(cx - rootHalf)} ${num(root + back)}`,
    `L${num(cx - rootHalf)} ${num(root)}`,
    tipLeft,
    tip,
    `L${num(cx + rootHalf)} ${num(root)}`,
    `L${num(cx + rootHalf)} ${num(root + back)}`,
    back > 0 ? round : `L${num(cx - rootHalf)} ${num(root)}`,
    'Z',
  ].join('');
}

// A stop of the gradient of a layer, at a place along the hand from the pivot (0) to the tip (1), with a color and its opacity.
type Stop = [along: number, color: string, alpha: number];

// One layer of a hand. A hand with `soft` is a trail of light: a wide glow, a body that runs out to the tip and a thin core, all blurred.
interface Layer {
  part: string;
  // Width, length and tip width as shares of the hand's own.
  scale: number;
  length?: number;
  taper?: number;
  blur: number;
  opacity: number;
  stops?: Stop[];
  color: string;
  root: string;
  tipFade?: number;
  // The layer starts clear at the pivot, whatever the hand does.
  clear?: boolean;
}

function shaped(hand: Hand, layer: Layer): Hand {
  const rootHalf = hand.rootHalf * layer.scale;
  const tipHalf = layer.taper === undefined ? hand.tipHalf * layer.scale : rootHalf * layer.taper;
  return { ...hand, length: hand.length * (layer.length ?? 1), rootHalf, tipHalf: Math.max(MIN_TIP, tipHalf) };
}

// The gradient of a layer that has stops of its own. Behind the pivot it fades by `fade`, so a tail dissolves at its end.
function stopsPaint(hand: Hand, stops: Stop[], fadeOut: number, clear: boolean): ScenePaint {
  const tail = hand.gap > 0 ? 0 : hand.tail;
  const offset = (along: number) => ((tail + along * hand.length) / (hand.length + tail)) * 100;
  const [, firstColor, firstAlpha] = stops[0];
  return {
    kind: 'linear-gradient',
    angle: -90,
    stops: [
      ...(tail > 0 ? [{ offset: 0, color: withAlpha(firstColor, firstAlpha * (clear ? 0 : 1 - fadeOut)) }] : []),
      ...stops.map(([along, color, alpha], position) => ({
        offset: offset(along),
        color: withAlpha(color, clear && position === 0 ? 0 : alpha),
      })),
    ],
  };
}

function plainPaint(hand: Hand, layer: Layer, fadeOut: number, tipFade: number): ScenePaint {
  if (fadeOut <= 0 && tipFade <= 0 && !layer.clear) {
    return solid(layer.color);
  }
  return {
    kind: 'linear-gradient',
    angle: -90,
    stops: [
      { offset: 0, color: withAlpha(layer.root, layer.clear ? 0 : 1 - fadeOut) },
      // A tail is lit at the pivot and dissolves at its end.
      ...(hand.gap === 0 && hand.tail > 0
        ? [{ offset: (hand.tail / (hand.length + hand.tail)) * 100, color: layer.root }]
        : []),
      { offset: 100, color: withAlpha(layer.color, 1 - tipFade) },
    ],
  };
}

function handLayer(
  component: GenericComponent,
  box: ControlBox,
  base: Hand,
  angle: number,
  layer: Layer,
  order: number,
): RenderNode {
  const hand = shaped(base, layer);
  const fadeOut = Math.min(1, Math.max(0, numberProperty(component, 'fade')));
  const tipFade = Math.min(1, Math.max(0, layer.tipFade ?? numberProperty(component, 'tipFade')));
  const glow = numberProperty(component, 'glow');
  const soft = layer.blur > 0;
  const reach = Math.max(hand.rootHalf, hand.tipHalf);
  const near = hand.gap > 0 ? -hand.gap : hand.tail;
  const extent = { x: hand.cx - reach, y: hand.cy - hand.length, width: reach * 2, height: hand.length + near };
  return {
    id: `widget-${component.id}-${layer.part}`,
    type: 'path',
    order: box.order + order,
    bounds: rotatedBounds(extent, 0, 0),
    d: outline(hand),
    rotation: angle,
    rotationCenter: { x: hand.cx, y: hand.cy },
    style: fade(component, {
      // The gradient runs from the tail to the tip, and turns with the hand.
      fill: layer.stops
        ? stopsPaint(hand, layer.stops, fadeOut, Boolean(layer.clear))
        : plainPaint(hand, layer, fadeOut, tipFade),
      stroke: { kind: 'none' },
      ...(soft ? { blur: layer.blur, opacity: layer.opacity } : {}),
      ...(!soft && glow > 0 && !isOff(component, 'glowColor')
        ? {
            shadow: {
              color: colorOr(component, 'glowColor', layer.color),
              opacity: 1,
              blur: glow,
              dx: 0,
              dy: 0,
            },
          }
        : {}),
    }),
  };
}

// The three layers of a trail of light.
function trailLayers(color: string, root: string, light: string, soft: number, clear: boolean, lit: boolean): Layer[] {
  const trail: Layer[] = [
    {
      part: 'hand-light',
      scale: 4.5,
      length: 0.55,
      taper: 0.15,
      blur: soft * 3,
      opacity: 1,
      color: light,
      root: light,
      stops: [
        [0, light, 0.95],
        [0.35, light, 0.45],
        [1, light, 0],
      ],
    },
    {
      part: 'hand-body',
      scale: 1.6,
      taper: 0.25,
      blur: soft,
      opacity: 1,
      color,
      root,
      clear,
      stops: [
        [0, root, 1],
        [0.18, color, 1],
        [0.6, color, 0.55],
        [1, color, 0],
      ],
    },
    {
      part: 'hand',
      scale: 0.55,
      length: 0.8,
      taper: 0.3,
      blur: soft * 0.3,
      opacity: 1,
      color: root,
      root,
      clear,
      stops: [
        [0, root, 1],
        [0.45, root, 0.6],
        [1, root, 0],
      ],
    },
  ];
  // Without a light the trail is its body and its core.
  return lit ? trail : trail.slice(1);
}

function handLayers(component: GenericComponent, box: ControlBox, hand: Hand, angle: number): RenderNode[] {
  const color = textProperty(component, 'color');
  const root = colorOr(component, 'root', color);
  const light = colorOr(component, 'glowColor', color);
  const lit = !isOff(component, 'glowColor');
  const clear = isOff(component, 'root');
  const soft = numberProperty(component, 'soft');
  const bloom = numberProperty(component, 'bloom');
  if (soft > 0) {
    return trailLayers(color, root, light, soft, clear, lit).map((layer, position) =>
      handLayer(component, box, hand, angle, layer, 0.26 + position * 0.02),
    );
  }
  return [
    // A blurred light under the hand, bright at the pivot and dark at the tip.
    ...(bloom > 0 && lit
      ? [
          handLayer(
            component,
            box,
            hand,
            angle,
            { part: 'hand-bloom', scale: 4, blur: bloom, opacity: 0.9, color: light, root: light, tipFade: 1 },
            0.26,
          ),
        ]
      : []),
    handLayer(component, box, hand, angle, { part: 'hand', scale: 1, blur: 0, opacity: 1, color, root, clear }, 0.3),
  ];
}

// The cap on the pivot: a disc with a ring round it.
function hubNode(component: GenericComponent, box: ControlBox, hand: Hand, radius: number): RenderNode {
  const ringWidth = numberProperty(component, 'hubRing');
  return {
    id: `widget-${component.id}-hub`,
    type: 'ellipse',
    order: box.order + 0.4,
    bounds: rotatedBounds(
      { x: hand.cx - radius, y: hand.cy - radius, width: radius * 2, height: radius * 2 },
      0,
      ringWidth,
    ),
    cx: hand.cx,
    cy: hand.cy,
    rx: Math.max(0.5, radius - ringWidth / 2),
    ry: Math.max(0.5, radius - ringWidth / 2),
    style: fade(component, {
      fill: isOff(component, 'hubFill') ? { kind: 'none' } : solid(textProperty(component, 'hubFill')),
      stroke: ringWidth > 0 ? solid(textProperty(component, 'color')) : { kind: 'none' },
      strokeWidth: ringWidth,
      ...(numberProperty(component, 'glow') > 0 && !isOff(component, 'glowColor')
        ? {
            shadow: {
              color: colorOr(component, 'glowColor', textProperty(component, 'color')),
              opacity: 1,
              blur: numberProperty(component, 'glow'),
              dx: 0,
              dy: 0,
            },
          }
        : {}),
    }),
  };
}

const HIT_HALF = 8;

// The box is the face, so it must not take the clicks of everything behind it. The hand is picked along its own shape, at least as wide as
// a finger, and the box stays for the frame of the selection.
function pickNodes(component: GenericComponent, box: ControlBox, hand: Hand, angle: number): RenderNode[] {
  const reach = { ...hand, rootHalf: Math.max(hand.rootHalf, HIT_HALF), tipHalf: Math.max(hand.tipHalf, HIT_HALF) };
  const near = reach.gap > 0 ? -reach.gap : reach.tail;
  const extent = {
    x: reach.cx - HIT_HALF,
    y: reach.cy - reach.length,
    width: HIT_HALF * 2,
    height: reach.length + near,
  };
  return [
    hitArea(component, box, false),
    {
      id: `widget-${component.id}-pick`,
      type: 'path',
      order: box.order + 0.5,
      bounds: rotatedBounds(extent, 0, 0),
      d: outline(reach),
      rotation: angle,
      rotationCenter: { x: reach.cx, y: reach.cy },
      style: { fill: { kind: 'none' }, stroke: { kind: 'none' }, pointerEvents: 'all' },
    },
  ];
}

// A hand of a clock or a gauge: it turns about the middle of its box, clockwise from the top, as far as the value is of `max`. The box is
// the face, so every hand of a clock has the same box and the same pivot.
export function buildHand(component: GenericComponent, index: number): RenderNode[] {
  const box = controlBox(component, index, { width: 200, height: 200 });
  const hand = handOf(component, box);
  const max = numberProperty(component, 'max') || 1;
  const angle = numberProperty(component, 'start') + (Number(component.value) / max) * 360;
  const hub = numberProperty(component, 'hub');
  return [
    ...pickNodes(component, box, hand, angle),
    ...handLayers(component, box, hand, angle),
    ...(hub > 0 ? [hubNode(component, box, hand, hub)] : []),
  ];
}
