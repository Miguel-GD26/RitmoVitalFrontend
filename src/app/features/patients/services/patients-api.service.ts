import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';
import { Patient, PatientForm } from '@core/models/patient.model';

@Injectable({ providedIn: 'root' })
export class PatientsApiService {
  private readonly http = inject(HttpClient);
  private readonly v1 = `${environment.apiBaseUrl}${environment.apiVersion}`;

  getPatient(uuid: string): Observable<Patient> {
    return this.http
      .get<ApiResponse<Patient>>(`${this.v1}/patients/${uuid}/`)
      .pipe(map(res => res.data));
  }

  getPatients(page = 1, pageSize = 20, search = '', sexo = ''): Observable<ApiResponse<Patient[]>> {
    const params: Record<string, string> = {
      page: String(page),
      page_size: String(pageSize),
    };
    if (search) params['search'] = search;
    if (sexo)   params['sexo']   = sexo;
    return this.http.get<ApiResponse<Patient[]>>(`${this.v1}/patients/`, { params });
  }

  createPatient(data: PatientForm): Observable<Patient> {
    return this.http
      .post<ApiResponse<Patient>>(`${this.v1}/patients/`, data)
      .pipe(map(res => res.data));
  }

  updatePatient(uuid: string, data: Partial<PatientForm>): Observable<Patient> {
    return this.http
      .patch<ApiResponse<Patient>>(`${this.v1}/patients/${uuid}/`, data)
      .pipe(map(res => res.data));
  }

  deletePatient(uuid: string): Observable<void> {
    return this.http
      .delete<ApiResponse<null>>(`${this.v1}/patients/${uuid}/`)
      .pipe(map(() => void 0));
  }

  vincularCuenta(uuid: string, body: { email: string; password?: string }): Observable<Patient> {
    return this.http
      .post<ApiResponse<Patient>>(`${this.v1}/patients/${uuid}/vincular/`, body)
      .pipe(map(res => res.data));
  }

  desvincularCuenta(uuid: string): Observable<Patient> {
    return this.http
      .delete<ApiResponse<Patient>>(`${this.v1}/patients/${uuid}/vincular/`)
      .pipe(map(res => res.data));
  }
}
