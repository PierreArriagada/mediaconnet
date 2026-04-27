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
   {
    path: 'agenda',
    loadComponent: () =>
      import('./agenda/agenda.page').then(m => m.AgendaPage),
  },
  {
    path: 'citas',
    loadComponent: () =>
      import('./citas/citas.page').then(m => m.CitasPage),
  },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./pacientes/pacientes.page').then(m => m.PacientesPage),
  },
  {
    path: 'pacientes/:id/ficha',
    loadComponent: () =>
      import('./fichapacientes/fichapacientes.page').then(m => m.FichapacientesPage),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./perfil/perfil.page').then(m => m.PerfilPage),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./notificaciones/notificaciones.page').then(m => m.NotificacionesPage),
  },

];
