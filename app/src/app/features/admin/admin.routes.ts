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
  // path: 'medicos'        → Fase 4
  // path: 'pacientes'      → Fase 6
  // path: 'auditoria'      → Fase 10
  // path: 'notificaciones' → Fase 11
  // path: 'ajustes'        → Fase 12
];
