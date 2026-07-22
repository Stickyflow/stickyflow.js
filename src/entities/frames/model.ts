// frontend/src/entities/frames/model.ts
/**
 * Frame entity - Container for user flows, workflows, and process boundaries
 * Frames are visual containers like Confluence Pages or Miro Frames
 */

export interface Frame {
  id: string
  board_id: string
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  x: number
  y: number
  width: number
  height: number
  title?: string | null
  
  // Styling - Frames have dashed borders and transparent fills
  stroke_color: string
  stroke_width: number
  dash: number[]  // Dashed line pattern [dashLength, gapLength]
  corner_radius: number
  fill_color: string  // Usually 'transparent'
  
  // Title styling
  text_color: string
  font_size: number
  font_weight: 'normal' | 'bold'
  font_family?: string
  show_label: boolean  // Toggles the title tab, independent of `title` itself

  // Layer Management
  layer_group: string
  order_key: string
  is_visible: boolean
  is_locked: boolean
  
  // Entity Group Assignment
  entity_group_id?: string | null
  
  // Timestamps
  created_at: string
  updated_at?: string | null
}

export interface FrameCreate {
  id?: string
  x: number
  y: number
  width?: number
  height?: number
  title?: string | null
  stroke_color?: string
  stroke_width?: number
  dash?: number[]
  corner_radius?: number
  fill_color?: string
  text_color?: string
  font_size?: number
  font_weight?: 'normal' | 'bold'
  font_family?: string
  show_label?: boolean
  layer_group?: string
  order_key?: string
  entity_group_id?: string | null
}

export interface FrameUpdate {
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  x?: number
  y?: number
  width?: number
  height?: number
  title?: string | null
  stroke_color?: string
  stroke_width?: number
  dash?: number[]
  corner_radius?: number
  fill_color?: string
  text_color?: string
  font_size?: number
  font_weight?: 'normal' | 'bold'
  font_family?: string
  show_label?: boolean
  layer_group?: string
  order_key?: string
  is_visible?: boolean
  is_locked?: boolean
  entity_group_id?: string | null
}

// Default values for new frames
export const FRAME_DEFAULTS = {
  width: 400,
  height: 300,
  title: 'User Flow',
  stroke_color: '#9b42df',  // Purple CI color
  stroke_width: 2,
  dash: [],  // Solid line (no dashes)
  corner_radius: 12,  // Larger rounded corners for modern look
  fill_color: 'rgba(155, 66, 223, 0.05)',  // Subtle purple tint
  text_color: '#9b42df',
  font_size: 14,
  font_weight: 'bold' as const,
  font_family: "'Inter', sans-serif",
  show_label: true,
  layer_group: 'background',
  order_key: 'e'  // Behind shapes (f) but above canvas background
};
