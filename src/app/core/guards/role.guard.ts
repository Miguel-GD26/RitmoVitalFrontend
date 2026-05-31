import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/services/auth/auth.service';

/**
 * Fábrica de guard por rol. Uso en rutas:
 *   canActivate: [roleGuard(['medicos'])]
 *
 * Superusuarios siempre pasan. Usuarios sin el grupo son redirigidos a '/'.
 */
export const roleGuard = (allowedGroups: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const check = () => {
    const user = auth.currentUser();
    if (!user) return router.createUrlTree(['/login']);
    if (user.is_superuser) return true;
    const hasRole = allowedGroups.some(g => user.groups.includes(g));
    return hasRole || router.createUrlTree(['/dashboard']);
  };

  const status = auth.isAuthenticated();
  if (status === false) return router.createUrlTree(['/login']);
  if (status === true) return check();

  return auth.verifySession().pipe(
    map(authenticated => (authenticated ? check() : router.createUrlTree(['/login'])))
  );
};
