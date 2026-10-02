import type { MarkerType } from '../../model/link';
import type { RenderNode, ScenePaint, SceneStyle } from '../../renderScene/scene';
import { SvgClipDefinitions } from './clipDefinitions';
import { SvgFilterDefinitions } from './filterDefinitions';
import { safeId } from './format';
import { SvgMarkerDefinitions } from './markerDefinitions';
import { SvgPaintDefinitions } from './paintDefinitions';

export class SvgDefinitionRegistry {
  entries: string[] = [];
  private readonly paints: SvgPaintDefinitions;
  private readonly filters: SvgFilterDefinitions;
  private readonly markers: SvgMarkerDefinitions;
  private readonly clips: SvgClipDefinitions;

  constructor(private readonly prefix: string) {
    const addDefinition = (definition: string): void => {
      this.entries.push(definition);
    };
    this.paints = new SvgPaintDefinitions(addDefinition, prefix);
    this.filters = new SvgFilterDefinitions(addDefinition, prefix);
    this.markers = new SvgMarkerDefinitions(addDefinition, prefix);
    this.clips = new SvgClipDefinitions(addDefinition, prefix);
  }

  elementId(id: string): string {
    return safeId(`${this.prefix}${id}`);
  }

  paint(value: ScenePaint | undefined, nodeId: string, bounds: RenderNode['bounds']): string {
    return this.paints.paint(value, nodeId, bounds);
  }

  filter(style: SceneStyle, nodeId: string): string | undefined {
    return this.filters.filter(style, nodeId);
  }

  marker(type: MarkerType | undefined, color: string, strokeWidth: number): string | undefined {
    return this.markers.marker(type, color, strokeWidth);
  }

  clip(style: SceneStyle): string | undefined {
    return this.clips.clip(style);
  }
}
