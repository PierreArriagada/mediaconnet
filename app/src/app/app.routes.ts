import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Ruta por defecto → redirige al login
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  // Módulo de autenticación (login, registro, recuperar contraseña)
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  // Módulo principal de la app (protegido por authGuard)
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
    canActivate: [authGuard],
  },
  // Módulo del paciente (protegido por authGuard)
  {
    path: 'paciente',
    loadChildren: () =>
      import('./features/paciente/paciente.routes').then((m) => m.PACIENTE_ROUTES),
    canActivate: [authGuard],
  },
];
