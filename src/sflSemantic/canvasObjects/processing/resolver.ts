import type { Shader } from '../../../model/shader';
import type { SflBlock, SflValue } from '../../../sflLanguage/ast';
import { asNumber, asString } from '../../ast/valueAccess';
import { resolveChartObject } from '../artifacts/chart/resolver';
import { resolveIsometricObject } from '../artifacts/isometric/resolver';
import { resolvePathObject } from '../artifacts/path/resolver';
import { resolveSwimlaneObject } from '../artifacts/swimlane/resolver';
import type {
  SflCanvasObject,
  SflCanvasObjectBase,
  SflFrameObject,
  SflShapeObject,
  SflSymbolDefinition,
  SflWidgetObject,
} from '../types';
import { classifyCanvasObject } from './classification';
import { readCanvasObjectGeometry } from './layout/geometry';
import { readCanvasObjectPresentation } from './presentation';

export interface CanvasObjectResolutionContext {
  mergedProps: (block: SflBlock) => Map<string, SflValue>;
  layoutProp: (block: SflBlock, key: string) => SflValue | undefined;
  symbolDefs: Map<string, SflSymbolDefinition>;
  shaderDefs: Map<string, Shader>;
}

export function resolveCanvasObject(
  block: SflBlock,
  origin: { x: number; y: number },
  context: CanvasObjectResolutionContext,
  frameId?: string,
  positionOverride?: number[],
): SflCanvasObject {
  const { mergedProps, layoutProp, symbolDefs } = context;
  const properties = mergedProps(block);
  const classification = classifyCanvasObject(block, properties, symbolDefs);
  const geometry = readCanvasObjectGeometry(block, origin, layoutProp, positionOverride);
  const base: SflCanvasObjectBase = {
    id: asString(properties.get('id')) ?? block.name,
    kind: classification.kind,
    text: asString(properties.get('text')),
    ...geometry,
    parentFrameId: frameId ?? asString(properties.get('parent')),
    props: readCanvasObjectPresentation(properties),
  };

  switch (classification.objectType) {
    case 'chart':
      return resolveChartObject(base, block, properties, symbolDefs, mergedProps);
    case 'isometric':
      return resolveIsometricObject(base, block, properties, layoutProp);
    case 'path':
      return resolvePathObject(base, properties, origin);
    case 'swimlane':
      return resolveSwimlaneObject(base, properties);
    case 'frame':
      return { ...base, objectType: 'frame' } satisfies SflFrameObject;
    case 'widget':
      return {
        ...base,
        objectType: 'widget',
        widget: {
          type: asString(properties.get('type')) ?? 'rollingNumber',
          value: asString(properties.get('value')) ?? '0',
          digits: asNumber(properties.get('digits')),
          duration: asNumber(properties.get('duration')),
          max: asNumber(properties.get('max')),
          label: asString(properties.get('label')),
        },
      } satisfies SflWidgetObject;
    case 'shape':
      return {
        ...base,
        objectType: 'shape',
        shapeType: classification.shapeType,
        symbol: classification.symbol,
      } satisfies SflShapeObject;
  }
}
