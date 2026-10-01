const KAPPA = 0.5523;
const CYLINDER_CAP_OF_HEIGHT = 0.22;
const CYLINDER_CAP_OF_WIDTH = 0.2;
const PERSON_BODY_IN_HEADS = 2;
const PERSON_NECK_IN_HEADS = 0.35;
const PERSON_WIDTH_IN_HEADS = 2 * PERSON_BODY_IN_HEADS;
const PERSON_HEIGHT_IN_HEADS = 2 + PERSON_NECK_IN_HEADS + PERSON_BODY_IN_HEADS;

export function cylinderPath(x: number, y: number, width: number, height: number): string {
  const cap = Math.min(height * CYLINDER_CAP_OF_HEIGHT, width * CYLINDER_CAP_OF_WIDTH);
  const rx = width / 2;
  const cx = x + rx;
  const left = x;
  const right = x + width;
  const lidY = y + cap;
  const floorY = y + height - cap;
  const lid =
    `M ${left} ${lidY} C ${left} ${lidY + KAPPA * cap} ${cx - KAPPA * rx} ${lidY + cap} ${cx} ${lidY + cap} ` +
    `C ${cx + KAPPA * rx} ${lidY + cap} ${right} ${lidY + KAPPA * cap} ${right} ${lidY} ` +
    `C ${right} ${lidY - KAPPA * cap} ${cx + KAPPA * rx} ${y} ${cx} ${y} ` +
    `C ${cx - KAPPA * rx} ${y} ${left} ${lidY - KAPPA * cap} ${left} ${lidY} Z`;
  const wall =
    `M ${left} ${lidY} L ${left} ${floorY} ` +
    `C ${left} ${floorY + KAPPA * cap} ${cx - KAPPA * rx} ${y + height} ${cx} ${y + height} ` +
    `C ${cx + KAPPA * rx} ${y + height} ${right} ${floorY + KAPPA * cap} ${right} ${floorY} ` +
    `L ${right} ${lidY}`;
  return `${lid} ${wall}`;
}

interface PersonFigure {
  head: number;
  body: number;
  centerX: number;
  headCenterY: number;
  bottom: number;
}

function personFigure(x: number, y: number, width: number, height: number): PersonFigure {
  const scale = Math.min(width / PERSON_WIDTH_IN_HEADS, height / PERSON_HEIGHT_IN_HEADS);
  const head = scale;
  const body = scale * PERSON_BODY_IN_HEADS;
  const figureHeight = scale * PERSON_HEIGHT_IN_HEADS;
  const top = y + (height - figureHeight) / 2;
  return { head, body, centerX: x + width / 2, headCenterY: top + head, bottom: top + figureHeight };
}

export function personLabelArea(x: number, y: number, width: number, height: number) {
  const { body, centerX, bottom } = personFigure(x, y, width, height);
  return { x: centerX - body, y: bottom - body, width: body * 2, height: body };
}

export function personPath(x: number, y: number, width: number, height: number): string {
  const { head, body, centerX, headCenterY, bottom } = personFigure(x, y, width, height);
  const skull =
    `M ${centerX} ${headCenterY - head} ` +
    `C ${centerX + KAPPA * head} ${headCenterY - head} ${centerX + head} ${headCenterY - KAPPA * head} ${centerX + head} ${headCenterY} ` +
    `C ${centerX + head} ${headCenterY + KAPPA * head} ${centerX + KAPPA * head} ${headCenterY + head} ${centerX} ${headCenterY + head} ` +
    `C ${centerX - KAPPA * head} ${headCenterY + head} ${centerX - head} ${headCenterY + KAPPA * head} ${centerX - head} ${headCenterY} ` +
    `C ${centerX - head} ${headCenterY - KAPPA * head} ${centerX - KAPPA * head} ${headCenterY - head} ${centerX} ${headCenterY - head} Z`;
  const dome =
    `M ${centerX - body} ${bottom} ` +
    `C ${centerX - body} ${bottom - KAPPA * body} ${centerX - KAPPA * body} ${bottom - body} ${centerX} ${bottom - body} ` +
    `C ${centerX + KAPPA * body} ${bottom - body} ${centerX + body} ${bottom - KAPPA * body} ${centerX + body} ${bottom} Z`;
  return `${skull} ${dome}`;
}
