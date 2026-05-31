export interface AnalysisHistory {
  id: number;
  uuid: string;
  usuario_nombre: string;
  paciente: number | null;
  paciente_nombre: string | null;
  record_name: string;
  modo: 'demo' | 'anotado' | 'produccion';
  modo_display: string;
  fecha: string;
  total_latidos: number;
  latidos_procesados: number;
  accuracy: number | null;
  modelo_version: string;
}
