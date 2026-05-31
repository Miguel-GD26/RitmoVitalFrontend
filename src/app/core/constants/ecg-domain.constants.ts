import { environment } from '../../../environments/environment';

// Valores de referencia del paper/entrenamiento — NO son dinámicos.
// Para mostrar métricas en vivo usar el endpoint /api/model-info/.
export const MODEL_ACCURACY_DISPLAY = '96.7%';
export const TOTAL_ANALYSES_DISPLAY = '47,940';

export const ECG_API_ENDPOINTS = {
  classifyRandom: `${environment.apiVersion}/classify-random/`,
  analyzePatient: `${environment.apiVersion}/analyze-patient/`,
  analyzeProduction: `${environment.apiVersion}/analyze-patient-production/`,
  modelInfo: '/api/model-info/',
} as const;
