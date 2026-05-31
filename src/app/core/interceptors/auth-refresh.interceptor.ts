import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, throwError, filter, take, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@core/services/auth/auth.service';

// Estado compartido entre todas las invocaciones del interceptor
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean | null>(null);

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Skip refresh for login/logout/refresh endpoints to avoid loops.
      // Allow refresh for /auth/me/ — it can return 401 on expired access token.
      const skipRefresh = ['/auth/login/', '/auth/logout/', '/auth/refresh/'];
      if (err.status !== 401 || skipRefresh.some(u => req.url.includes(u))) {
        return throwError(() => err);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshSubject.next(null);

        return authService.refreshToken().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshSubject.next(true);
            return next(req);
          }),
          catchError(refreshErr => {
            isRefreshing = false;
            refreshSubject.next(false);
            authService.signOut();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      }

      // Si ya hay un refresh en curso, esperar a que termine y reintentar
      return refreshSubject.pipe(
        filter(v => v !== null),
        take(1),
        switchMap(success => {
          if (success) return next(req);
          return throwError(() => err);
        })
      );
    })
  );
};
