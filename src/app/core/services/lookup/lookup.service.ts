import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';

export type LookupFuente = 'sistema_usuario' | 'sistema_paciente' | 'reniec' | null;

export interface DocumentoLookupResult {
  nombre:          string;
  apellido:        string;
  nombre_completo: string;
  fuente:          LookupFuente;
}

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1`;

  lookup(numero: string): Observable<DocumentoLookupResult | null> {
    if (!numero || numero.length < 6) return of(null);
    return this.http
      .get<ApiResponse<DocumentoLookupResult>>(`${this.base}/lookup/documento/`, { params: { numero } })
      .pipe(
        map(res => res.data.fuente ? res.data : null),
        catchError(() => of(null)),
      );
  }
}
