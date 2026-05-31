import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface ModelInfoData {
  pacemaker_records?: string[];
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class ModelConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api`;

  // Initialized with hardcoded defaults; updated from backend on init.
  readonly pacemakerRecords = signal<readonly string[]>(['102', '104', '107', '217']);

  constructor() {
    this.http
      .get<ApiResponse<ModelInfoData>>(`${this.base}/model-info/`)
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        if (res?.success && res.data.pacemaker_records?.length) {
          this.pacemakerRecords.set(res.data.pacemaker_records);
        }
      });
  }

  isPacemakerRecord(recordName: string): boolean {
    return (this.pacemakerRecords() as string[]).includes(recordName);
  }
}
