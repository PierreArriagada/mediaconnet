import { Routes } from '@angular/router';

export const PACIENTES_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pacientes-list.page').then((m) => m.PacientesListPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./paciente-detalle.page').then((m) => m.PacienteDetallePage),
  },
  {
    path: ':id/citas/:idCita',
    loadComponent: () =>
      import('./cita-detalle.page').then((m) => m.CitaDetallePage),
  },
];
