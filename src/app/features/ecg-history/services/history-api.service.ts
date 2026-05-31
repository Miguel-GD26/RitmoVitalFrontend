import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';
import { AnalysisHistory } from '@core/models/analysis-history.model';

@Injectable({ providedIn: 'root' })
export class HistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly v1 = `${environment.apiBaseUrl}${environment.apiVersion}`;

  getHistory(page = 1, pageSize = 20, search = '', modo = '', pacienteUuid: string | null = null): Observable<ApiResponse<AnalysisHistory[]>> {
    const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
    if (search)       params['search']      = search;
    if (modo)         params['modo']        = modo;
    if (pacienteUuid) params['paciente_id'] = pacienteUuid;
    return this.http.get<ApiResponse<AnalysisHistory[]>>(`${this.v1}/history/`, { params });
  }

  downloadPdf(uuid: string): Observable<Blob> {
    return this.http.get(
      `${this.v1}/history/${uuid}/pdf/`,
      { responseType: 'blob' }
    );
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(
      `${this.v1}/history/export/csv/`,
      { responseType: 'blob' }
    );
  }
}
