import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { UserRole } from '../models';

/** Usage: { path: 'admin', canActivate: [roleGuard(['ADMIN'])] } */
export function roleGuard(allowed: UserRole[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.whenReady();

    if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);

    const role = auth.role();
    if (role && allowed.includes(role)) return true;

    return router.createUrlTree(['/dashboard']);
  };
}
