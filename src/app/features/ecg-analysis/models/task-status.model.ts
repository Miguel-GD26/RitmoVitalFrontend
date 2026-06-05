import { Pagination } from '@core/models/api-response.model';

export interface TaskSubmitResult {
  task_id: string;
  status: 'pending';
}

export interface AnalysisResult {
  record_name?: string;
  total_latidos?: number;
  latidos_procesados?: number;
  latidos_excluidos?: number;
  simbolos_excluidos?: Record<string, number>;
  sampling_rate?: number;
  accuracy?: number | null;
  signal_plot?: string;
  estadisticas?: { conteo: Record<string, number>; porcentaje: Record<string, number> };
  latidos?: unknown[];
  [key: string]: unknown;
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  result?: AnalysisResult;
}

export interface AnalysisTaskStatus {
  data: TaskStatusResponse;
  pagination?: Pagination;
}
