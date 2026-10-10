export type ViewerImageFormat = 'png' | 'jpeg';

export interface ViewerImageExportOptions {
  format?: ViewerImageFormat;
  scale?: number;
  quality?: number;
  backgroundColor?: string;
}
