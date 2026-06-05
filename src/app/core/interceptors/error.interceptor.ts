import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AlertService } from '@core/services/alert';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alert = inject(AlertService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const message = err.error?.message ?? err.error?.error ?? `Error ${err.status}`;

      if (err.status >= 500) {
        alert.error('Ocurrió un error en el servidor. Por favor intenta de nuevo.', 'Error del servidor');
      } else if (err.status === 403) {
        alert.error('No tienes permisos para realizar esta acción.', 'Acceso denegado');
      }
      // 401 lo maneja auth-refresh.interceptor.ts
      // 400/422 los manejan los componentes individualmente (errores de validación)

      return throwError(() => ({ ...err, userMessage: message }));
    })
  );
};
