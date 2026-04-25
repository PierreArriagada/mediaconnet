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
  // Las siguientes rutas se habilitarán en fases posteriores del roadmap
  // path: 'medicos'     → Fase 4
  // path: 'pacientes'   → Fase 6
  // path: 'operacion'   → Fases 3, 7, 8, 9
  // path: 'auditoria'   → Fase 10
  // path: 'notificaciones' → Fase 11
  // path: 'ajustes'     → Fase 12
];
