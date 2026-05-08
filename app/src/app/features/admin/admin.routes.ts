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
    path: 'auditoria',
    loadComponent: () =>
      import('./auditoria/auditoria.page').then((m) => m.AuditoriaPage),
  },
  {
    path: 'operacion',
    loadChildren: () =>
      import('./operacion/operacion.routes').then((m) => m.OPERACION_ROUTES),
  },
  {
    path: 'medicos',
    loadChildren: () =>
      import('./medicos/medicos.routes').then((m) => m.MEDICOS_ADMIN_ROUTES),
  },
  {
    path: 'pacientes',
    loadChildren: () =>
      import('./pacientes/pacientes.routes').then((m) => m.PACIENTES_ADMIN_ROUTES),
  },
  {
    path: 'notificaciones',
    loadComponent: () =>
      import('./notificaciones/admin-notificaciones.page').then((m) => m.AdminNotificacionesPage),
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./perfil/perfil.page').then((m) => m.PerfilPage),
  },
  {
    path: 'perfil/mis-datos',
    loadComponent: () =>
      import('./perfil/mis-datos/mis-datos.page').then((m) => m.MisDatosAdminPage),
  },
  {
    path: 'perfil/seguridad',
    loadComponent: () =>
      import('./perfil/seguridad/seguridad.page').then((m) => m.SeguridadAdminPage),
  },
  {
    path: 'perfil/preferencias',
    loadComponent: () =>
      import('./perfil/preferencias/preferencias.page').then((m) => m.PreferenciasAdminPage),
  },
  {
    path: 'perfil/soporte',
    loadComponent: () =>
      import('./perfil/soporte/soporte.page').then((m) => m.SoporteAdminPage),
  },
  // path: 'ajustes'        → pendiente
];
