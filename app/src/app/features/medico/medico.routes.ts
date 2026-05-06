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
    path: 'perfil/mis-datos',
    loadComponent: () =>
      import('./perfil/mis-datos/mis-datos.page').then(m => m.MisDatosMedicoPage),
  },
  {
    path: 'perfil/seguridad',
    loadComponent: () =>
      import('./perfil/seguridad/seguridad.page').then(m => m.SeguridadMedicoPage),
  },
  {
    path: 'perfil/preferencias',
    loadComponent: () =>
      import('./perfil/preferencias/preferencias.page').then(m => m.PreferenciasMedicoPage),
  },
  {
    path: 'perfil/soporte',
    loadComponent: () =>
      import('./perfil/soporte/soporte.page').then(m => m.SoporteMedicoPage),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./notificaciones/notificaciones.page').then(m => m.NotificacionesPage),
  },

];
