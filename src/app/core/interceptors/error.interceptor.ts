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
      }
      return throwError(() => ({ ...err, userMessage: message }));
    })
  );
};
