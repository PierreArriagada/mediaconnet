import { Routes } from '@angular/router';

export const MEDICO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/medico-home.page').then((m) => m.MedicoHomePage),
  },
];
