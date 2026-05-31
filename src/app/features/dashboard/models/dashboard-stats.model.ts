import { AnalysisHistory } from '@core/models/analysis-history.model';

export interface DashboardStats {
  total_analisis: number;
  total_latidos_procesados: number;
  accuracy_promedio: number | null;
  por_modo: Record<string, number>;
  recientes: AnalysisHistory[];
}
