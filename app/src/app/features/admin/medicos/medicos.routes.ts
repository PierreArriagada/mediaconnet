import { Routes } from '@angular/router';

export const MEDICOS_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./medicos-list.page').then((m) => m.MedicosListPage),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./medico-nuevo.page').then((m) => m.MedicoNuevoPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./medico-detalle.page').then((m) => m.MedicoDetallePage),
  },
];
