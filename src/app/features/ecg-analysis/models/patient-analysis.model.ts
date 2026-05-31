import { Pagination } from '../../../core/models/api-response.model';

export interface PatientBeat {
  indice: number;
  r_peak: number;
  simbolo_original: string;
  clase_real: string;
  clase_predicha: string;
  confianza: number;
  es_prematuro: boolean;
}

export interface PatientAnalysisResult {
  task_id?: string;
  record_name: string;
  total_latidos: number;
  latidos_excluidos: number;
  latidos_procesados: number;
  simbolos_excluidos: Record<string, number>;
  sampling_rate: number;
  accuracy: number;
  signal_plot: string;
  estadisticas: {
    conteo: Record<string, number>;
    porcentaje: Record<string, number>;
  };
  latidos: PatientBeat[];
  pagination?: Pagination;
}
