import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guardia funcional que verifica el rol del usuario autenticado.
 * Uso en rutas: canActivate: [authGuard, roleGuard('Administrador')]
 */
export function roleGuard(rolRequerido: string): CanActivateFn {
  return (_route, _state) => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    const user = auth.getCurrentUser();

    if (user?.role === rolRequerido) {
      return true;
    }

    // Si está autenticado pero no tiene el rol correcto → redirige al login
    router.navigate(['/auth/login']);
    return false;
  };
}
