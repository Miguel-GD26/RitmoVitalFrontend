import { Pagination } from '../../../core/models/api-response.model';

export interface ProductionBeat {
  indice: number;
  r_peak: number;
  clase_predicha: string;
  confianza: number;
  es_prematuro: boolean;
}

export interface ProductionAnalysisResult {
  task_id?: string;
  record_name: string;
  total_latidos: number;
  sampling_rate: number;
  signal_plot: string;
  estadisticas: {
    conteo: Record<string, number>;
    porcentaje: Record<string, number>;
  };
  latidos: ProductionBeat[];
  pagination?: Pagination;
}
