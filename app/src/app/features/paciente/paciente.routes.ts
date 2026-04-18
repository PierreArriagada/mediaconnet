import { Routes } from '@angular/router';

export const PACIENTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/paciente-home.page').then((m) => m.PacienteHomePage),
  },
  {
    path: 'reservar',
    loadComponent: () =>
      import('./reservar/reservar.page').then((m) => m.ReservarPage),
  },
];
