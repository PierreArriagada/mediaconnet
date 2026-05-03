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
  // path: 'medicos'        → pendiente
  // path: 'pacientes'      → pendiente
  // path: 'auditoria'      → pendiente
  // path: 'notificaciones' → pendiente
  // path: 'ajustes'        → pendiente
];
