export interface RenderDiagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  entityId?: string;
}
