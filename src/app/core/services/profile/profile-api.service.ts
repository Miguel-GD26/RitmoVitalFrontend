import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  groups: string[];
  is_superuser: boolean;
  avatar_url: string | null;
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: string | null;
  sexo: string;
  numero_colegiatura: string;
  orcid: string;
  institucion: string;
  email_verified: boolean;
  must_change_password: boolean;
  totp_enabled: boolean;
}

export interface UpdateProfileRequest {
  username?: string;
  first_name?: string;
  last_name?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  numero_colegiatura?: string;
  orcid?: string;
  institucion?: string;
}

export interface ChangePasswordRequest {
  current_password?: string;
  new_password: string;
}

export interface TwoFASetupResponse {
  secret: string;
  provisioning_uri: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/v1/auth`;
  private readonly authBase = `${environment.apiBaseUrl}/api/auth`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.base}/profile/`)
      .pipe(map(res => res.data));
  }

  updateProfile(data: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<ApiResponse<UserProfile>>(`${this.base}/profile/`, data)
      .pipe(map(res => res.data));
  }

  uploadAvatar(file: File): Observable<{ avatar_url: string }> {
    const form = new FormData();
    form.append('avatar', file);
    return this.http.post<ApiResponse<{ avatar_url: string }>>(`${this.base}/profile/avatar/`, form)
      .pipe(map(res => res.data));
  }

  changePassword(data: ChangePasswordRequest): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.base}/change-password/`, data)
      .pipe(map(() => void 0));
  }

  sendVerificationEmail(): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.base}/send-verification-email/`, {})
      .pipe(map(() => void 0));
  }

  verifyEmail(token: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.base}/verify-email/`, { token })
      .pipe(map(() => void 0));
  }

  // 2FA Setup
  get2faSetup(): Observable<TwoFASetupResponse> {
    return this.http.get<ApiResponse<TwoFASetupResponse>>(`${this.authBase}/2fa/setup/`)
      .pipe(map(res => res.data));
  }

  confirm2fa(code: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.authBase}/2fa/setup/`, { code })
      .pipe(map(() => void 0));
  }

  disable2fa(code: string): Observable<void> {
    return this.http.delete<ApiResponse<null>>(`${this.authBase}/2fa/setup/`, { body: { code } })
      .pipe(map(() => void 0));
  }
}
