import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';
import { EcgSample } from '../models/ecg-sample.model';
import { ClassificationResult } from '../models/classification-result.model';
import { EvaluationFiles, ProductionFiles } from '../models/ecg-files.model';
import { TaskSubmitResult, TaskStatusResponse } from '../models/task-status.model';
import { ModelInfo } from '../models/model-info.model';

@Injectable({ providedIn: 'root' })
export class EcgApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly v1 = `${environment.apiBaseUrl}${environment.apiVersion}`;

  getNewSample(): Observable<EcgSample> {
    return this.http
      .get<ApiResponse<EcgSample>>(`${this.v1}/classify-random/`)
      .pipe(map(res => res.data));
  }

  classifySample(beatIndex: number): Observable<ClassificationResult> {
    return this.http
      .post<ApiResponse<ClassificationResult>>(
        `${this.v1}/classify-random/`,
        { beat_index: beatIndex }
      )
      .pipe(map(res => res.data));
  }

  analyzePatient(files: EvaluationFiles, page = 1, pageSize = 5000): Observable<TaskSubmitResult> {
    const formData = new FormData();
    formData.append('dat_file', files.datFile);
    formData.append('hea_file', files.heaFile);
    formData.append('atr_file', files.atrFile);
    formData.append('page', String(page));
    formData.append('page_size', String(pageSize));
    if (files.pacienteId) formData.append('paciente_id', String(files.pacienteId));
    return this.http
      .post<ApiResponse<TaskSubmitResult>>(`${this.v1}/analyze-patient/`, formData)
      .pipe(map(res => res.data));
  }

  analyzeProduction(files: ProductionFiles, page = 1, pageSize = 5000): Observable<TaskSubmitResult> {
    const formData = new FormData();
    formData.append('dat_file', files.datFile);
    formData.append('hea_file', files.heaFile);
    formData.append('page', String(page));
    formData.append('page_size', String(pageSize));
    if (files.pacienteId) formData.append('paciente_id', String(files.pacienteId));
    return this.http
      .post<ApiResponse<TaskSubmitResult>>(`${this.v1}/analyze-patient-production/`, formData)
      .pipe(map(res => res.data));
  }

  getAnalysisStatus(taskId: string): Observable<ApiResponse<TaskStatusResponse>> {
    return this.http.get<ApiResponse<TaskStatusResponse>>(
      `${this.v1}/analysis/status/${taskId}/`
    );
  }

  getModelInfo(): Observable<ModelInfo> {
    return this.http
      .get<ApiResponse<ModelInfo>>(`${this.base}/api/model-info/`)
      .pipe(map(res => res.data));
  }
}
