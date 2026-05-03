import { Routes } from '@angular/router';

export const OPERACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./operacion-hub.page').then((m) => m.OperacionHubPage),
  },
  {
    path: 'horarios',
    loadComponent: () =>
      import('./horarios/horarios.page').then((m) => m.HorariosPage),
  },
  {
    path: 'especialidades',
    loadComponent: () =>
      import('./especialidades/especialidades.page').then((m) => m.EspecialidadesPage),
  },
  // path: 'solicitudes'   → Fase 3
  // path: 'citas'         → Fase 7
];
