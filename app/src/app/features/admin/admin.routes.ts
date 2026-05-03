import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/admin-home.page').then((m) => m.AdminHomePage),
  },
  {
    path: 'operacion',
    loadChildren: () =>
      import('./operacion/operacion.routes').then((m) => m.OPERACION_ROUTES),
  },
  {
    path: 'medicos',
    loadChildren: () =>
      import('./medicos/medicos.routes').then((m) => m.MEDICOS_ADMIN_ROUTES),
  },
  {
    path: 'pacientes',
    loadChildren: () =>
      import('./pacientes/pacientes.routes').then((m) => m.PACIENTES_ADMIN_ROUTES),
  },
  // path: 'auditoria'      → pendiente
  // path: 'notificaciones' → pendiente
  // path: 'ajustes'        → pendiente
];

