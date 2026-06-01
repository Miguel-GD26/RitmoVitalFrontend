import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of, throwError, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '@core/models/api-response.model';

export type LoginStep =
  | { requires2fa: false }
  | { requires2fa: true; tempToken: string };

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  groups: string[];
  is_superuser: boolean;
  avatar_url?: string | null;
}

// Key stored in localStorage to know if a session was ever established.
// Avoids a 401 network call when the user has never logged in on this device.
const SESSION_FLAG = 'rv_has_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base    = `${environment.apiBaseUrl}/api`;
  private readonly authV1  = `${environment.apiBaseUrl}/api/v1/auth`;

  isAuthenticated = signal<boolean | null>(null);
  currentUser     = signal<CurrentUser | null>(null);

  readonly isAdmin = computed(() => {
    const u = this.currentUser();
    return (u?.is_superuser || u?.groups.includes('administrador')) ?? false;
  });

  verifySession(): Observable<boolean> {
    // No flag → user has never logged in here → skip the HTTP round-trip entirely
    if (!localStorage.getItem(SESSION_FLAG)) {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
      return of(false);
    }

    return this.http.get<ApiResponse<CurrentUser>>(`${this.authV1}/me/`).pipe(
      tap(res => {
        if (res.success) {
          this.isAuthenticated.set(true);
          this.currentUser.set(res.data);
        } else {
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
          localStorage.removeItem(SESSION_FLAG);
        }
      }),
      map(res => res.success),
      catchError(() => {
        this.isAuthenticated.set(false);
        this.currentUser.set(null);
        localStorage.removeItem(SESSION_FLAG);
        return of(false);
      })
    );
  }

  login(email: string, password: string): Observable<LoginStep> {
    return this.http.post<ApiResponse<{ requires_2fa?: boolean; temp_token?: string }>>(
      `${this.authV1}/login/`,
      { email, password }
    ).pipe(
      switchMap(res => {
        if (!res.success) throw new Error(res.message);
        if (res.data?.requires_2fa && res.data.temp_token) {
          const step: LoginStep = { requires2fa: true, tempToken: res.data.temp_token };
          return of(step);
        }
        localStorage.setItem(SESSION_FLAG, '1');
        return this.verifySession().pipe(
          map((): LoginStep => ({ requires2fa: false })),
        );
      }),
    );
  }

  verify2fa(tempToken: string, code: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(
      `${this.authV1}/2fa/verify/`,
      { temp_token: tempToken, code }
    ).pipe(
      map(res => { if (!res.success) throw new Error(res.message); }),
      tap(() => localStorage.setItem(SESSION_FLAG, '1')),
      switchMap(() => this.verifySession()),
      map(() => void 0),
    );
  }

  logout(): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.authV1}/logout/`, {}).pipe(
      map(() => void 0),
      tap(() => {
        localStorage.removeItem(SESSION_FLAG);
        this.isAuthenticated.set(false);
        this.currentUser.set(null);
      })
    );
  }

  refreshToken(): Observable<void> {
    return this.http.post<ApiResponse<null>>(`${this.authV1}/refresh/`, {}).pipe(
      map(() => void 0),
      tap(() => {
        localStorage.setItem(SESSION_FLAG, '1');
        this.isAuthenticated.set(true);
      }),
      catchError(err => {
        localStorage.removeItem(SESSION_FLAG);
        this.isAuthenticated.set(false);
        this.currentUser.set(null);
        return throwError(() => err);
      })
    );
  }

  googleLogin(code: string, redirectUri: string): Observable<void> {
    return this.http.post<ApiResponse<null>>(
      `${this.authV1}/google/`,
      { code, redirect_uri: redirectUri }
    ).pipe(
      map(res => {
        if (!res.success) throw new Error(res.message);
      }),
      tap(() => localStorage.setItem(SESSION_FLAG, '1')),
      switchMap(() => this.verifySession()),
      map(() => void 0)
    );
  }

  signOut(): void {
    localStorage.removeItem(SESSION_FLAG);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }
}
