export interface Diagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  ownerId?: string;
}
