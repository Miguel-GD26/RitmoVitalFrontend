import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const status = auth.isAuthenticated();

  if (status === true) return true;
  if (status === false) return router.createUrlTree(['/login']);

  // null = sesión no verificada aún → consultar al backend
  return auth.verifySession().pipe(
    map(authenticated => authenticated || router.createUrlTree(['/login']))
  );
};
