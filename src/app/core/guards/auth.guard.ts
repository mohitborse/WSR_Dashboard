import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (auth.isLoggedIn()) return true;

  return router.createUrlTree(['/login']);
};

/** Blocks a logged-in user from re-visiting /login. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (!auth.isLoggedIn()) return true;

  return router.createUrlTree(['/dashboard']);
};
