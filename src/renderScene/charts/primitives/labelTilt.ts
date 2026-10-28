import type { Chart } from '../../../model/chart';
import { finite } from '../../scene';
import { estimateTextWidth } from '../../scene/textLayout';

// How far the labels along an axis stand up, in degrees: 0 lies flat, 90 stands. Anything else is cut to that range.
export function labelTilt(chart: Chart): number {
  return Math.min(90, Math.max(0, finite(chart.axisLabelAngle, 0)));
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

function labelFontSize(chart: Chart): number {
  return Math.max(9, finite(chart.axisFontSize ?? chart.fontSize, 12));
}

// The room that the longest of the labels needs when it stands at the tilt: its width along the slant plus its height across it.
export function tiltedLabelRoom(chart: Chart, labels: readonly string[], tilt: number): number {
  const fontSize = labelFontSize(chart);
  const widest = Math.max(0, ...labels.map(label => estimateTextWidth(label, fontSize, false)));
  return Math.ceil(widest * Math.sin(radians(tilt)) + (fontSize + 2) * Math.cos(radians(tilt)));
}

// A label above a row of cells: it starts at the point and runs up and to the right.
export function labelAboveFrame(chart: Chart, label: string, tilt: number, anchor: { x: number; y: number }) {
  const fontSize = labelFontSize(chart);
  const height = fontSize + 2;
  const width = Math.ceil(estimateTextWidth(label, fontSize, false)) + 4;
  const angle = radians(tilt);
  return {
    frame: {
      x: anchor.x - (height / 2) * Math.sin(angle),
      y: anchor.y - (height / 2) * Math.cos(angle),
      width,
      height,
    },
    rotation: -tilt,
  };
}

// A label below an axis: it ends at the point and runs down and to the left, as labels do that are tilted.
export function labelBelowFrame(chart: Chart, label: string, tilt: number, anchor: { x: number; y: number }) {
  const fontSize = labelFontSize(chart);
  const height = fontSize + 2;
  const width = Math.ceil(estimateTextWidth(label, fontSize, false)) + 4;
  const angle = radians(tilt);
  return {
    frame: {
      x: anchor.x - (width * Math.cos(angle) + (height / 2) * Math.sin(angle)),
      y: anchor.y + width * Math.sin(angle) - (height / 2) * Math.cos(angle),
      width,
      height,
    },
    rotation: -tilt,
  };
}
