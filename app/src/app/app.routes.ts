import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

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
  // Módulo del paciente (protegido por authGuard)
  {
    path: 'paciente',
    loadChildren: () =>
      import('./features/paciente/paciente.routes').then((m) => m.PACIENTE_ROUTES),
    canActivate: [authGuard],
  },
  // Módulo del médico (protegido por authGuard)
  {
    path: 'medico',
    loadChildren: () =>
      import('./features/medico/medico.routes').then((m) => m.MEDICO_ROUTES),
    canActivate: [authGuard],
  },
  // Módulo del administrador (protegido por authGuard + roleGuard)
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canActivate: [authGuard, roleGuard('Administrador')],
  },
];
