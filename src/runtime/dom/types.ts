import type { SceneRole } from '../../renderScene/scene';

export interface OwnerRef {
  role: SceneRole;
  id: string;
  kind?: string;
  label?: string;
}

export interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
}
